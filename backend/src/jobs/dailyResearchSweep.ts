import cron from 'node-cron';
import { sendDailyDigest } from '../services/emailService';
import { runResearchSweep } from '../services/researchEngine';
import { postDailyDigest } from '../services/slackService';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prisma';
import type { ResearchItem } from '@prisma/client';

const EMAIL_RETRY_DELAY_MS = 60 * 60 * 1000;

function retryEmailLater(items: ResearchItem[]): void {
  setTimeout(async () => {
    logger.info('retrying daily digest email');
    const result = await sendDailyDigest(items);
    if (!result.success) {
      logger.error({ error: result.error }, 'digest email retry failed, giving up');
    }
  }, EMAIL_RETRY_DELAY_MS);
}

export async function runDailyResearchSweepJob(): Promise<void> {
  const start = Date.now();
  logger.info('daily research sweep starting');
  try {
    const settings = await prisma.userSettings.findFirst();
    if (settings && !settings.researchSweepEnabled) {
      logger.info('research sweep disabled in settings, skipping');
      return;
    }

    const threshold = settings?.relevanceThreshold ?? 0;
    const { found, added, items } = await runResearchSweep(threshold);

    const topUrls = [...items]
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 15)
      .map((i) => i.fullUrl);
    const topItems = topUrls.length
      ? await prisma.researchItem.findMany({ where: { fullUrl: { in: topUrls } }, orderBy: { relevanceScore: 'desc' } })
      : [];

    if (!settings || settings.emailDigestEnabled) {
      const emailResult = await sendDailyDigest(topItems);
      if (!emailResult.success) {
        logger.warn({ error: emailResult.error }, 'digest email failed, retrying in 1 hour');
        retryEmailLater(topItems);
      }
    }

    if (settings?.slackEnabled) {
      const slackResult = await postDailyDigest(topItems, settings.slackWebhookUrl);
      if (!slackResult.success) {
        logger.warn({ error: slackResult.error }, 'digest slack post failed');
      }
    }

    logger.info({ found, added, durationMs: Date.now() - start }, 'daily research sweep complete');
  } catch (err) {
    logger.error({ err, durationMs: Date.now() - start }, 'daily research sweep failed');
  }
}

export function scheduleDailyResearchSweep(): void {
  const time = process.env.RESEARCH_SWEEP_TIME || '08:00';
  const [hour, minute] = time.split(':').map(Number);
  const cronExpr = `${minute} ${hour} * * *`;
  const timezone = process.env.RESEARCH_SWEEP_TIMEZONE || 'America/Los_Angeles';

  cron.schedule(
    cronExpr,
    () => {
      runDailyResearchSweepJob().catch((err) => logger.error({ err }, 'unhandled error in daily research sweep job'));
    },
    { timezone }
  );

  logger.info({ cronExpr, timezone }, 'daily research sweep job scheduled');
}
