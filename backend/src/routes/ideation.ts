import { Router } from 'express';
import { z } from 'zod';
import {
  generateAlternativeIdeasWithGemini,
  generateIdeasWithGemini,
  generateSingleIdea,
  persistIdeas,
  saveQuickDraft,
} from '../services/ideationEngine';
import { prisma } from '../utils/prisma';
import { serializeDraft } from '../utils/serializeDraft';

export const ideationRouter = Router();

const generateSchema = z.object({
  research_item_ids: z.array(z.string()).min(1).max(5),
});

ideationRouter.post('/generate', async (req, res) => {
  const parsed = generateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
    return;
  }
  const { research_item_ids } = parsed.data;

  const researchItems = await prisma.researchItem.findMany({
    where: { id: { in: research_item_ids } },
  });
  if (researchItems.length === 0) {
    res.status(404).json({ error: 'No matching research items found' });
    return;
  }

  const summaries = researchItems.map((r) => ({ title: r.title, snippet: r.snippet }));
  const [standardIdeas, altIdeas] = await Promise.all([
    generateIdeasWithGemini(summaries),
    generateAlternativeIdeasWithGemini(summaries),
  ]);

  const [standardSaved, altSaved] = await Promise.all([
    persistIdeas(standardIdeas, research_item_ids, 'gemini'),
    persistIdeas(altIdeas, research_item_ids, 'gemini'),
  ]);

  res.json({ ideas: [...standardSaved, ...altSaved] });
});

const quickGenerateSchema = z.object({
  research_item_id: z.string(),
  format: z.enum(['carousel', 'reel']),
});

ideationRouter.post('/quick-generate', async (req, res) => {
  const parsed = quickGenerateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
    return;
  }
  const { research_item_id, format } = parsed.data;

  const item = await prisma.researchItem.findUnique({ where: { id: research_item_id } });
  if (!item) {
    res.status(404).json({ error: 'Research item not found' });
    return;
  }

  const idea = await generateSingleIdea(
    { title: item.title, snippet: item.snippet },
    format === 'carousel' ? 'carousel' : 'reel_hook'
  );
  if (!idea) {
    res.status(502).json({
      error: 'Generation failed',
      detail: 'Check Gemini API key in Settings, or try again (free tier can be busy)',
    });
    return;
  }

  const draft = await saveQuickDraft(idea, format);
  res.status(201).json({ draft: serializeDraft(draft) });
});
