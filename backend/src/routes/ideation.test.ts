import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app';
import { prisma } from '../utils/prisma';
import { generateSingleIdea } from '../services/ideationEngine';

vi.mock('../services/ideationEngine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/ideationEngine')>();
  return {
    ...actual,
    generateIdeasWithGemini: vi.fn(async () => [
      {
        format: 'reel_hook',
        hook: 'Test hook A',
        script: 'HOOK (0-3s): Test.\nBODY (4-25s): Test.\nCTA (26-30s): Test.',
        caption: 'Test caption A',
        tone: 'Educational',
      },
    ]),
    generateAlternativeIdeasWithGemini: vi.fn(async () => [
      {
        format: 'story',
        hook: 'Test hook B',
        script: 'HOOK (0-3s): Test.\nBODY (4-25s): Test.\nCTA (26-30s): Test.',
        caption: 'Test caption B',
        tone: 'Hype',
      },
    ]),
    generateSingleIdea: vi.fn(async (_topic: { title: string; snippet: string }, format: 'carousel' | 'reel_hook') => ({
      format,
      hook: 'Quick hook',
      script:
        format === 'carousel'
          ? 'Slide 1\nSlide 2\nSlide 3\nSlide 4\nSlide 5'
          : 'HOOK (0-3s): Test.\nBODY (4-25s): Test.\nCTA (26-30s): Test.',
      caption: 'Quick caption',
      tone: 'Hype',
    })),
  };
});

const app = createApp();
let researchItemId: string;

beforeAll(async () => {
  const item = await prisma.researchItem.create({
    data: {
      title: 'Integration test research item',
      snippet: 'snippet',
      fullUrl: 'https://example.com/integration-test',
      source: 'hn',
      category: 'Other',
      relevanceScore: 5,
      publishedAt: new Date(),
    },
  });
  researchItemId = item.id;
});

afterAll(async () => {
  await prisma.contentIdea.deleteMany({ where: { researchItemIds: { contains: researchItemId } } });
  await prisma.researchItem.delete({ where: { id: researchItemId } });
  await prisma.$disconnect();
});

describe('POST /api/ideation/generate', () => {
  it('returns 400 for an empty research_item_ids array', async () => {
    const res = await request(app).post('/api/ideation/generate').send({ research_item_ids: [] });
    expect(res.status).toBe(400);
  });

  it('returns 404 when no research items match the given ids', async () => {
    const res = await request(app).post('/api/ideation/generate').send({ research_item_ids: ['nonexistent-id'] });
    expect(res.status).toBe(404);
  });

  it('generates and persists ideas from both Gemini calls', async () => {
    const res = await request(app).post('/api/ideation/generate').send({ research_item_ids: [researchItemId] });

    expect(res.status).toBe(200);
    expect(res.body.ideas).toHaveLength(2);
    expect(res.body.ideas.map((i: { aiHook: string }) => i.aiHook)).toEqual(
      expect.arrayContaining(['Test hook A', 'Test hook B'])
    );
    expect(res.body.ideas.every((i: { generatedBy: string }) => i.generatedBy === 'gemini')).toBe(true);

    const persisted = await prisma.contentIdea.findMany({
      where: { id: { in: res.body.ideas.map((i: { id: string }) => i.id) } },
    });
    expect(persisted).toHaveLength(2);
  });
});

describe('POST /api/ideation/quick-generate', () => {
  afterAll(async () => {
    await prisma.contentDraft.deleteMany({ where: { title: 'Quick hook' } });
  });

  it('returns 400 for an invalid format', async () => {
    const res = await request(app)
      .post('/api/ideation/quick-generate')
      .send({ research_item_id: researchItemId, format: 'video' });
    expect(res.status).toBe(400);
  });

  it('returns 404 when the research item does not exist', async () => {
    const res = await request(app)
      .post('/api/ideation/quick-generate')
      .send({ research_item_id: 'nonexistent-id', format: 'carousel' });
    expect(res.status).toBe(404);
  });

  it('returns 502 when generation fails', async () => {
    vi.mocked(generateSingleIdea).mockResolvedValueOnce(null);
    const res = await request(app)
      .post('/api/ideation/quick-generate')
      .send({ research_item_id: researchItemId, format: 'carousel' });
    expect(res.status).toBe(502);
  });

  it('creates a carousel draft scheduled for today at 09:00', async () => {
    const res = await request(app)
      .post('/api/ideation/quick-generate')
      .send({ research_item_id: researchItemId, format: 'carousel' });

    expect(res.status).toBe(201);
    expect(res.body.draft.format).toBe('carousel');
    expect(res.body.draft.title).toBe('Quick hook');
    expect(res.body.draft.scheduledTime).toBe('09:00');
    expect(new Date(res.body.draft.scheduledDate).toDateString()).toBe(new Date().toDateString());

    const persisted = await prisma.contentDraft.findUnique({ where: { id: res.body.draft.id } });
    expect(persisted).not.toBeNull();
  });

  it('creates a reel draft', async () => {
    const res = await request(app)
      .post('/api/ideation/quick-generate')
      .send({ research_item_id: researchItemId, format: 'reel' });

    expect(res.status).toBe(201);
    expect(res.body.draft.format).toBe('reel');
  });
});
