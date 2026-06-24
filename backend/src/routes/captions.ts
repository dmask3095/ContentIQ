import { Router } from 'express';
import { z } from 'zod';
import { generateCaptionVariations } from '../services/ideationEngine';

export const captionsRouter = Router();

const generateSchema = z.object({
  topic: z.string().min(1),
  tone: z.enum(['Educational', 'Breaking', 'Opinion', 'Hype']),
});

captionsRouter.post('/generate', async (req, res) => {
  const parsed = generateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
    return;
  }
  const captions = await generateCaptionVariations(parsed.data.topic, parsed.data.tone);
  res.json({ captions });
});
