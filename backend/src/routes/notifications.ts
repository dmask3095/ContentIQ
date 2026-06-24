import { Router } from 'express';
import { sendDailyDigest } from '../services/emailService';
import { postDailyDigest } from '../services/slackService';
import { prisma } from '../utils/prisma';

export const notificationsRouter = Router();

notificationsRouter.post('/test', async (_req, res) => {
  const settings = await prisma.userSettings.findFirst();
  const sample = await prisma.researchItem.findMany({ orderBy: { discoveredAt: 'desc' }, take: 3 });

  const [email, slack] = await Promise.all([
    sendDailyDigest(sample),
    postDailyDigest(sample, settings?.slackWebhookUrl),
  ]);

  res.json({ email, slack });
});
