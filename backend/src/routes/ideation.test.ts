import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app';
import { prisma } from '../utils/prisma';

vi.mock('../services/ideationEngine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/ideationEngine')>();
  return {
    ...actual,
    generateIdeasWithGemini: vi.fn(async () => [
      { format: 'reel_hook', hook: 'Test hook A', caption: 'Test caption A', tone: 'Educational' },
    ]),
    generateAlternativeIdeasWithGemini: vi.fn(async () => [
      { format: 'story', hook: 'Test hook B', caption: 'Test caption B', tone: 'Hype' },
    ]),
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
