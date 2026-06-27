import { Router } from 'express';
import { z } from 'zod';
import { sendDailyDigest } from '../services/emailService';
import { runResearchSweep } from '../services/researchEngine';
import { postDailyDigest } from '../services/slackService';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prisma';

export const researchRouter = Router();

const listQuerySchema = z.object({
  category: z.string().optional(),
  source: z.string().optional(),
  is_read: z.enum(['true', 'false']).optional(),
  is_archived: z.enum(['true', 'false']).optional(),
  skip: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

researchRouter.get('/', async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid query params', details: parsed.error.flatten() });
    return;
  }
  const { category, source, is_read, is_archived, skip, limit } = parsed.data;

  // relevanceThreshold defaults to 0 (no hard floor) — a strict 7+ floor
  // was tried and starved the feed down to 2-5 items for days at a time, so
  // everything is shown sorted best-score-first instead and the score badge
  // is left for the user to triage. Configurable per-user via Settings if
  // they want a stricter cutoff back.
  const settings = await prisma.userSettings.findFirst();
  const relevanceThreshold = settings?.relevanceThreshold ?? 0;

  const where = {
    relevanceScore: { gte: relevanceThreshold },
    ...(category ? { category } : {}),
    ...(source ? { source } : {}),
    ...(is_read !== undefined ? { isRead: is_read === 'true' } : {}),
    ...(is_archived !== undefined ? { isArchived: is_archived === 'true' } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.researchItem.findMany({
      where,
      orderBy: [{ relevanceScore: 'desc' }, { discoveredAt: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.researchItem.count({ where }),
  ]);

  res.json({ items, total, timestamp: new Date().toISOString() });
});

const patchSchema = z.object({
  is_read: z.boolean().optional(),
  is_archived: z.boolean().optional(),
  is_starred: z.boolean().optional(),
});

researchRouter.patch('/:id', async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
    return;
  }
  const existing = await prisma.researchItem.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: 'Research item not found' });
    return;
  }

  const { is_read, is_archived, is_starred } = parsed.data;
  const updated = await prisma.researchItem.update({
    where: { id: req.params.id },
    data: {
      ...(is_read !== undefined ? { isRead: is_read } : {}),
      ...(is_archived !== undefined ? { isArchived: is_archived } : {}),
      ...(is_starred !== undefined ? { isStarred: is_starred } : {}),
    },
  });

  res.json({ item: updated });
});

researchRouter.post('/refresh', async (_req, res) => {
  const settings = await prisma.userSettings.findFirst();
  const threshold = settings?.relevanceThreshold ?? 0;

  const { found, added, items } = await runResearchSweep(threshold);

  if (items.length > 0 && (settings?.emailDigestEnabled || settings?.slackEnabled)) {
    const topUrls = [...items]
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 15)
      .map((i) => i.fullUrl);
    const topItems = await prisma.researchItem.findMany({
      where: { fullUrl: { in: topUrls } },
      orderBy: { relevanceScore: 'desc' },
    });

    if (settings?.emailDigestEnabled && topItems.length > 0) {
      sendDailyDigest(topItems).catch((err) => logger.error({ err }, 'digest email failed'));
    }
    if (settings?.slackEnabled && topItems.length > 0) {
      postDailyDigest(topItems, settings.slackWebhookUrl).catch((err) =>
        logger.error({ err }, 'digest slack failed')
      );
    }
  }

  res.json({ items_found: found, items_added: added });
});
