import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';

export const calendarRouter = Router();

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const weekQuerySchema = z.object({
  week_start: z.coerce.date(),
});

calendarRouter.get('/week', async (req, res) => {
  const parsed = weekQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid query params', details: parsed.error.flatten() });
    return;
  }
  const { week_start } = parsed.data;
  const weekEnd = new Date(week_start);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const drafts = await prisma.contentDraft.findMany({
    where: { scheduledDate: { gte: week_start, lt: weekEnd } },
    orderBy: { scheduledDate: 'asc' },
  });

  const postsByDay: Record<string, unknown[]> = { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] };
  for (const draft of drafts) {
    const label = DAY_LABELS[draft.scheduledDate.getDay()];
    postsByDay[label].push({
      ...draft,
      hashtags: JSON.parse(draft.hashtags || '[]'),
      carouselSlides: draft.carouselSlides ? JSON.parse(draft.carouselSlides) : null,
    });
  }

  res.json({ posts_by_day: postsByDay });
});

const DEFAULT_SUGGESTIONS = [
  { format: 'reel', day: 'Tue', time: '09:00', reason: 'Default: reels tend to perform best mid-morning' },
  { format: 'reel', day: 'Thu', time: '09:00', reason: 'Default: reels tend to perform best mid-morning' },
  { format: 'carousel', day: 'Wed', time: '19:00', reason: 'Default: carousels tend to perform best in the evening' },
  { format: 'carousel', day: 'Sat', time: '11:00', reason: 'Default: weekend browsing window' },
  { format: 'story', day: 'Fri', time: '17:00', reason: 'Default: stories work well heading into the weekend' },
];

calendarRouter.post('/auto-suggest', async (_req, res) => {
  const published = await prisma.publishedPost.findMany();

  const statsByFormatDay = new Map<string, { engagement: number; count: number }>();
  for (const post of published) {
    const day = DAY_LABELS[post.publishedAt.getDay()];
    const key = `${post.format}::${day}`;
    const engagement = post.likes + post.comments * 2 + post.shares * 3 + post.saves * 2;
    const stats = statsByFormatDay.get(key) ?? { engagement: 0, count: 0 };
    stats.engagement += engagement;
    stats.count += 1;
    statsByFormatDay.set(key, stats);
  }

  let suggestions: { format: string; day: string; time: string; reason: string }[] = DEFAULT_SUGGESTIONS;

  if (statsByFormatDay.size > 0) {
    const ranked = Array.from(statsByFormatDay.entries())
      .map(([key, stats]) => {
        const [format, day] = key.split('::');
        return { format, day, avgEngagement: stats.engagement / stats.count };
      })
      .sort((a, b) => b.avgEngagement - a.avgEngagement)
      .slice(0, 5);

    suggestions = ranked.map((r) => ({
      format: r.format,
      day: r.day,
      time: r.format === 'story' ? '17:00' : r.format === 'carousel' ? '19:00' : '09:00',
      reason: `Based on history: ${r.format} posts on ${r.day} averaged ${r.avgEngagement.toFixed(0)} engagement points`,
    }));
  }

  const today = new Date();
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + ((1 + 7 - today.getDay()) % 7 || 7));
  const mondayIndex = DAY_LABELS.indexOf('Mon');

  const withDates = suggestions.map((s) => {
    const offset = (DAY_LABELS.indexOf(s.day) - mondayIndex + 7) % 7;
    const date = new Date(nextMonday);
    date.setDate(nextMonday.getDate() + offset);
    return { date: date.toISOString().slice(0, 10), time: s.time, format: s.format, reason: s.reason };
  });

  res.json({ suggestions: withDates });
});
