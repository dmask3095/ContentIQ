import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';

export const postsRouter = Router();

const querySchema = z.object({
  format: z.string().optional(),
  skip: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

postsRouter.get('/published', async (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid query params', details: parsed.error.flatten() });
    return;
  }
  const { format, skip, limit } = parsed.data;
  const where = format ? { format } : {};

  const [posts, total] = await Promise.all([
    prisma.publishedPost.findMany({ where, orderBy: { publishedAt: 'desc' }, skip, take: limit, include: { draft: true } }),
    prisma.publishedPost.count({ where }),
  ]);

  res.json({ posts, total });
});
