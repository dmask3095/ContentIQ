import { Router } from 'express';
import { z } from 'zod';
import { generateAlternativeIdeasWithGemini, generateIdeasWithGemini, persistIdeas } from '../services/ideationEngine';
import { prisma } from '../utils/prisma';

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
