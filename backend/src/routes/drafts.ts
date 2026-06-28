import type { ContentDraft, PublishedPost } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { parseCarouselSlides, renderCarouselZip, renderSlidePng } from '../services/carouselRenderer';
import { generateHashtags, saveDraft } from '../services/ideationEngine';
import { prisma } from '../utils/prisma';

export const draftsRouter = Router();

function serializeDraft(draft: ContentDraft & { publishedPost?: PublishedPost | null }) {
  return {
    ...draft,
    hashtags: JSON.parse(draft.hashtags || '[]'),
    carouselSlides: draft.carouselSlides ? JSON.parse(draft.carouselSlides) : null,
  };
}

const listQuerySchema = z.object({
  status: z.string().optional(),
  format: z.string().optional(),
  scheduled_date_from: z.coerce.date().optional(),
  scheduled_date_to: z.coerce.date().optional(),
  skip: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

draftsRouter.get('/', async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid query params', details: parsed.error.flatten() });
    return;
  }
  const { status, format, scheduled_date_from, scheduled_date_to, skip, limit } = parsed.data;

  const where = {
    ...(status ? { status } : {}),
    ...(format ? { format } : {}),
    ...(scheduled_date_from || scheduled_date_to
      ? {
          scheduledDate: {
            ...(scheduled_date_from ? { gte: scheduled_date_from } : {}),
            ...(scheduled_date_to ? { lte: scheduled_date_to } : {}),
          },
        }
      : {}),
  };

  const [drafts, total] = await Promise.all([
    prisma.contentDraft.findMany({
      where,
      orderBy: { scheduledDate: 'asc' },
      skip,
      take: limit,
      include: { publishedPost: true },
    }),
    prisma.contentDraft.count({ where }),
  ]);

  res.json({ drafts: drafts.map(serializeDraft), total });
});

// Two creation modes: from an AI-generated idea (idea_id), or from scratch
// (format + caption) — ContentDraft.ideaId is nullable for exactly this case.
const createSchema = z.union([
  z.object({
    idea_id: z.string(),
    scheduled_date: z.coerce.date(),
    scheduled_time: z.string().regex(/^\d{2}:\d{2}$/),
    caption: z.string().optional(),
    script: z.string().optional(),
    hashtags: z.array(z.string()).optional(),
    title: z.string().optional(),
  }),
  z.object({
    format: z.enum(['reel', 'carousel', 'story', 'caption']),
    caption: z.string(),
    script: z.string().optional(),
    scheduled_date: z.coerce.date(),
    scheduled_time: z.string().regex(/^\d{2}:\d{2}$/),
    title: z.string().optional(),
    hashtags: z.array(z.string()).optional(),
  }),
]);

draftsRouter.post('/', async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
    return;
  }
  const body = parsed.data;

  let draft: ContentDraft;
  if ('idea_id' in body) {
    draft = await saveDraft(body.idea_id, body.scheduled_date, body.scheduled_time, {
      caption: body.caption,
      script: body.script,
      hashtags: body.hashtags,
      title: body.title,
    });
  } else {
    const hashtags = body.hashtags ?? (await generateHashtags(body.caption));
    draft = await prisma.contentDraft.create({
      data: {
        title: body.title ?? body.caption.slice(0, 80),
        caption: body.caption,
        script: body.script || null,
        format: body.format,
        hashtags: JSON.stringify(hashtags),
        scheduledDate: body.scheduled_date,
        scheduledTime: body.scheduled_time,
      },
    });
  }

  res.status(201).json({ draft: serializeDraft(draft) });
});

const updateSchema = z.object({
  caption: z.string().optional(),
  script: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
  scheduled_date: z.coerce.date().optional(),
  scheduled_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  status: z.enum(['draft', 'scheduled', 'published']).optional(),
});

draftsRouter.put('/:id', async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
    return;
  }
  const { caption, script, hashtags, scheduled_date, scheduled_time, status } = parsed.data;

  const existing = await prisma.contentDraft.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: 'Draft not found' });
    return;
  }

  const draft = await prisma.contentDraft.update({
    where: { id: req.params.id },
    data: {
      ...(caption !== undefined ? { caption } : {}),
      ...(script !== undefined ? { script } : {}),
      ...(hashtags !== undefined ? { hashtags: JSON.stringify(hashtags) } : {}),
      ...(scheduled_date !== undefined ? { scheduledDate: scheduled_date } : {}),
      ...(scheduled_time !== undefined ? { scheduledTime: scheduled_time } : {}),
      ...(status !== undefined ? { status } : {}),
    },
  });

  res.json({ draft: serializeDraft(draft) });
});

async function getCarouselSlides(draftId: string): Promise<string[] | { error: string; status: number }> {
  const draft = await prisma.contentDraft.findUnique({ where: { id: draftId } });
  if (!draft) return { error: 'Draft not found', status: 404 };
  if (draft.format !== 'carousel' || !draft.script) {
    return { error: 'Draft has no carousel script to render', status: 400 };
  }
  const slides = parseCarouselSlides(draft.script);
  if (slides.length === 0) return { error: 'Draft has no carousel script to render', status: 400 };
  return slides;
}

// No Content-Disposition here on purpose -- this needs to work as a plain
// <img src> for in-app preview, not just as a forced download. The frontend
// triggers actual "save to disk" downloads itself via a blob fetch instead.
draftsRouter.get('/:id/carousel/:index', async (req, res) => {
  const slides = await getCarouselSlides(req.params.id);
  if ('error' in slides) {
    res.status(slides.status).json({ error: slides.error });
    return;
  }
  const index = Number(req.params.index);
  if (!Number.isInteger(index) || index < 0 || index >= slides.length) {
    res.status(400).json({ error: `Invalid slide index, must be 0-${slides.length - 1}` });
    return;
  }
  const png = await renderSlidePng(slides[index], index, slides.length);
  res.setHeader('Content-Type', 'image/png');
  res.send(png);
});

draftsRouter.get('/:id/carousel.zip', async (req, res) => {
  const slides = await getCarouselSlides(req.params.id);
  if ('error' in slides) {
    res.status(slides.status).json({ error: slides.error });
    return;
  }
  const zip = await renderCarouselZip(slides);
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="carousel-slides.zip"');
  res.send(zip);
});

draftsRouter.delete('/:id', async (req, res) => {
  const existing = await prisma.contentDraft.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: 'Draft not found' });
    return;
  }

  await prisma.contentDraft.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});
