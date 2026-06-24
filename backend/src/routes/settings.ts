import { Router } from 'express';
import { z } from 'zod';
import { REAL_WEBHOOK_PATTERN } from '../services/slackService';
import { prisma } from '../utils/prisma';

export const settingsRouter = Router();

async function getOrCreateSettings() {
  const existing = await prisma.userSettings.findFirst();
  if (existing) return existing;
  return prisma.userSettings.create({ data: {} });
}

function serializeSettings(settings: Awaited<ReturnType<typeof getOrCreateSettings>>) {
  return {
    ...settings,
    dataSourcesEnabled: JSON.parse(settings.dataSourcesEnabled),
    contentCategories: JSON.parse(settings.contentCategories),
    bestPostingTimes: JSON.parse(settings.bestPostingTimes),
    contentMixGoal: JSON.parse(settings.contentMixGoal),
  };
}

// Gemini/Google/SMTP/Slack credentials live in backend/.env, not the
// UserSettings table — there's no safe runtime way to persist secrets from
// here, so this only reports presence (never values) for the Settings UI.
// Anthropic/OpenAI are dormant (no billing) and intentionally omitted here.
settingsRouter.get('/api-keys-status', (_req, res) => {
  res.json({
    gemini: Boolean(process.env.GEMINI_API_KEY),
    google: Boolean(process.env.GOOGLE_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID),
    smtp: Boolean(
      process.env.SMTP_USER &&
        process.env.SMTP_PASS &&
        process.env.SMTP_USER !== 'your-email@gmail.com' &&
        process.env.SMTP_PASS !== 'app-password'
    ),
    slackWebhook: Boolean(process.env.SLACK_WEBHOOK_URL && REAL_WEBHOOK_PATTERN.test(process.env.SLACK_WEBHOOK_URL)),
  });
});

settingsRouter.get('/', async (_req, res) => {
  const settings = await getOrCreateSettings();
  res.json(serializeSettings(settings));
});

const updateSchema = z.object({
  research_sweep_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  research_sweep_enabled: z.boolean().optional(),
  data_sources_enabled: z.object({ google: z.boolean(), rss: z.boolean(), scrape: z.boolean() }).optional(),
  content_categories: z.array(z.string()).optional(),
  relevance_threshold: z.number().int().min(1).max(10).optional(),
  email_digest_enabled: z.boolean().optional(),
  email_digest_frequency: z.enum(['daily', 'weekly']).optional(),
  slack_enabled: z.boolean().optional(),
  slack_webhook_url: z.string().optional(),
  slack_channel: z.string().optional(),
  timezone: z.string().optional(),
  best_posting_times: z.record(z.array(z.string())).optional(),
  content_mix_goal: z.object({ reels: z.number(), carousels: z.number(), stories: z.number() }).optional(),
});

settingsRouter.put('/', async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
    return;
  }
  const body = parsed.data;
  const existing = await getOrCreateSettings();

  const updated = await prisma.userSettings.update({
    where: { id: existing.id },
    data: {
      ...(body.research_sweep_time !== undefined ? { researchSweepTime: body.research_sweep_time } : {}),
      ...(body.research_sweep_enabled !== undefined ? { researchSweepEnabled: body.research_sweep_enabled } : {}),
      ...(body.data_sources_enabled !== undefined
        ? { dataSourcesEnabled: JSON.stringify(body.data_sources_enabled) }
        : {}),
      ...(body.content_categories !== undefined
        ? { contentCategories: JSON.stringify(body.content_categories) }
        : {}),
      ...(body.relevance_threshold !== undefined ? { relevanceThreshold: body.relevance_threshold } : {}),
      ...(body.email_digest_enabled !== undefined ? { emailDigestEnabled: body.email_digest_enabled } : {}),
      ...(body.email_digest_frequency !== undefined ? { emailDigestFrequency: body.email_digest_frequency } : {}),
      ...(body.slack_enabled !== undefined ? { slackEnabled: body.slack_enabled } : {}),
      ...(body.slack_webhook_url !== undefined ? { slackWebhookUrl: body.slack_webhook_url } : {}),
      ...(body.slack_channel !== undefined ? { slackChannel: body.slack_channel } : {}),
      ...(body.timezone !== undefined ? { timezone: body.timezone } : {}),
      ...(body.best_posting_times !== undefined ? { bestPostingTimes: JSON.stringify(body.best_posting_times) } : {}),
      ...(body.content_mix_goal !== undefined ? { contentMixGoal: JSON.stringify(body.content_mix_goal) } : {}),
    },
  });

  res.json(serializeSettings(updated));
});
