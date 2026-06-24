import type { ResearchItem } from '@prisma/client';
import { httpClient } from '../utils/apiClients';
import { logger } from '../utils/logger';

// A real incoming webhook always matches this shape. Without checking it, a
// leftover placeholder like ".../services/..." doesn't 404 — Slack's domain
// redirects unknown paths to a 2xx docs page, so axios sees no error and a
// digest "succeeds" without ever reaching a channel.
export const REAL_WEBHOOK_PATTERN = /^https:\/\/hooks\.slack\.com\/services\/T[\w-]+\/B[\w-]+\/[\w-]+$/;

// UserSettings only persists a webhook URL + channel (no bot token), so this
// posts via a Slack Incoming Webhook rather than the @slack/bolt app client —
// that's enough for a one-way digest push and needs no OAuth scopes.
export async function postDailyDigest(
  items: ResearchItem[],
  webhookUrl?: string | null
): Promise<{ success: boolean; error?: string }> {
  const url = webhookUrl || process.env.SLACK_WEBHOOK_URL;
  if (!url || !REAL_WEBHOOK_PATTERN.test(url)) {
    logger.warn('Slack webhook URL not configured (or still a placeholder), skipping Slack digest');
    return { success: false, error: 'Slack webhook not configured' };
  }
  try {
    const top = items.slice(0, 5);
    const blocks = [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `📊 *Daily research sweep complete!* Found ${items.length} items.` },
      },
      { type: 'divider' },
      ...top.map((item) => ({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `• *<${item.fullUrl}|${item.title}>*\n  ${item.source.toUpperCase()} · Score ${item.relevanceScore.toFixed(1)}/10`,
        },
      })),
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View in ContentIQ' },
            url: process.env.FRONTEND_URL || 'http://localhost:3000',
          },
        ],
      },
    ];
    await httpClient.post(url, { text: `Daily sweep found ${items.length} items`, blocks });
    logger.info({ count: items.length }, 'slack digest posted');
    return { success: true };
  } catch (err) {
    logger.error({ err }, 'failed to post slack digest');
    return { success: false, error: (err as Error).message };
  }
}
