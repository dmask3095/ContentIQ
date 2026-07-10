import type { ContentDraft } from '@prisma/client';
import axios from 'axios';
import { Router } from 'express';
import { z } from 'zod';
import { parseCarouselSlides, renderCarouselZip, renderSlidePng } from '../services/carouselRenderer';
import { generateHashtags, saveDraft } from '../services/ideationEngine';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prisma';
import { serializeDraft } from '../utils/serializeDraft';

export const draftsRouter = Router();

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

// ─── INSTAGRAM PUBLISH ───────────────────────────────────────────────────────
// Publishes a carousel draft as an Instagram carousel post (or a single-image
// post for non-carousel formats) via the Meta Graph API.
//
// Required env vars:
//   INSTAGRAM_ACCESS_TOKEN       — long-lived User Access Token with
//                                   instagram_content_publish + pages_read_engagement
//   INSTAGRAM_BUSINESS_ACCOUNT_ID — numeric IG Business Account ID
//   BACKEND_URL                  — public HTTPS base URL of this server
//                                   (e.g. https://contentiq-zdhg.onrender.com)
//                                   Instagram must be able to fetch images from it.
const IG_API = 'https://graph.facebook.com/v19.0';

async function igPost(path: string, params: Record<string, string>): Promise<{ id: string }> {
  const res = await axios.post<{ id: string }>(`${IG_API}${path}`, null, { params });
  return res.data;
}

draftsRouter.post('/:id/publish/instagram', async (req, res) => {
  const { INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_BUSINESS_ACCOUNT_ID, BACKEND_URL } = process.env;

  if (!INSTAGRAM_ACCESS_TOKEN || !INSTAGRAM_BUSINESS_ACCOUNT_ID) {
    res.status(503).json({
      error: 'Instagram not configured',
      detail:
        'Add INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_BUSINESS_ACCOUNT_ID to the backend .env file. ' +
        'You need a Meta Developer app with instagram_content_publish permission and a Business/Creator account.',
    });
    return;
  }

  if (!BACKEND_URL || BACKEND_URL.startsWith('http://localhost')) {
    res.status(503).json({
      error: 'Instagram publishing requires a public HTTPS backend URL',
      detail: 'Set BACKEND_URL=https://contentiq-zdhg.onrender.com in your backend .env. Instagram cannot reach localhost.',
    });
    return;
  }

  const draft = await prisma.contentDraft.findUnique({ where: { id: req.params.id } });
  if (!draft) {
    res.status(404).json({ error: 'Draft not found' });
    return;
  }
  if (draft.status === 'published') {
    res.status(400).json({ error: 'Draft is already published' });
    return;
  }

  const igAccountId = INSTAGRAM_BUSINESS_ACCOUNT_ID;
  const token = INSTAGRAM_ACCESS_TOKEN;
  const hashtags = (JSON.parse(draft.hashtags || '[]') as string[]).join(' ');
  const captionText = `${draft.caption}\n\n${hashtags}`;

  try {
    let creationId: string;

    if (draft.format === 'carousel' && draft.script) {
      // ── Carousel post ──────────────────────────────────────────────────────
      const slides = parseCarouselSlides(draft.script);
      if (slides.length === 0) {
        res.status(400).json({ error: 'Carousel draft has no slides' });
        return;
      }

      // Step 1: create a child media container for each slide image
      const childIds = await Promise.all(
        slides.map(async (_, i) => {
          const imageUrl = `${BACKEND_URL}/api/drafts/${draft.id}/carousel/${i}`;
          const child = await igPost(`/${igAccountId}/media`, {
            image_url: imageUrl,
            is_carousel_item: 'true',
            access_token: token,
          });
          return child.id;
        })
      );

      // Step 2: create the carousel container
      const carousel = await igPost(`/${igAccountId}/media`, {
        media_type: 'CAROUSEL',
        children: childIds.join(','),
        caption: captionText,
        access_token: token,
      });
      creationId = carousel.id;
    } else {
      // ── Single-image post (reel/story/caption treated as static image post) ─
      // We use the first carousel slide as the image if the script has content,
      // otherwise show an error — Instagram cannot post without an image.
      if (!draft.script) {
        res.status(400).json({
          error: 'No image available',
          detail: 'Only carousel drafts with slides can be posted. Reel/story video publishing is not yet supported.',
        });
        return;
      }
      const slides = parseCarouselSlides(draft.script);
      const imageUrl = `${BACKEND_URL}/api/drafts/${draft.id}/carousel/0`;
      const container = await igPost(`/${igAccountId}/media`, {
        image_url: imageUrl,
        caption: captionText,
        access_token: token,
      });
      creationId = container.id;
      void slides; // only first slide used for single-image post
    }

    // Step 3: publish the container
    const published = await igPost(`/${igAccountId}/media_publish`, {
      creation_id: creationId,
      access_token: token,
    });

    // Mark draft as published and record the Instagram post ID
    const [updatedDraft] = await prisma.$transaction([
      prisma.contentDraft.update({
        where: { id: draft.id },
        data: { status: 'published', publishedAt: new Date() },
      }),
      prisma.publishedPost.upsert({
        where: { draftId: draft.id },
        update: { instagramPostId: published.id, publishedAt: new Date(), lastSynced: new Date() },
        create: {
          draftId: draft.id,
          instagramPostId: published.id,
          format: draft.format,
        },
      }),
    ]);

    logger.info({ draftId: draft.id, instagramPostId: published.id }, 'Published to Instagram');
    res.json({ success: true, instagramPostId: published.id, draft: serializeDraft(updatedDraft) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const igError = (err as { response?: { data?: unknown } }).response?.data;
    logger.error({ err, draftId: draft.id }, 'Instagram publish failed');
    res.status(502).json({ error: 'Instagram API error', detail: message, igError });
  }
});
