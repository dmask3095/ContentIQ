import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';

export const hashtagsRouter = Router();

const trendingQuerySchema = z.object({ category: z.string().optional() });

hashtagsRouter.get('/trending', async (req, res) => {
  const parsed = trendingQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid query params', details: parsed.error.flatten() });
    return;
  }
  const { category } = parsed.data;

  const trending = await prisma.hashtagTrending.findMany({
    where: category ? { category } : undefined,
    orderBy: { searchVolume: 'desc' },
    take: 20,
  });

  res.json({
    trending: trending.map((t) => ({
      id: t.id,
      hashtag: t.hashtag,
      usage_count: t.searchVolume,
      growth: t.growthRate,
      category: t.category,
      is_favorite: t.isFavorite,
    })),
  });
});

const favoriteSchema = z.object({ is_favorite: z.boolean() });

hashtagsRouter.patch('/:id/favorite', async (req, res) => {
  const parsed = favoriteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
    return;
  }
  const existing = await prisma.hashtagTrending.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: 'Hashtag not found' });
    return;
  }

  const updated = await prisma.hashtagTrending.update({
    where: { id: req.params.id },
    data: { isFavorite: parsed.data.is_favorite },
  });
  res.json({ hashtag: updated });
});
