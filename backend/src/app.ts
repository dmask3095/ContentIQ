import 'express-async-errors';
import cors from 'cors';
import express, { Express } from 'express';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { calendarRouter } from './routes/calendar';
import { captionsRouter } from './routes/captions';
import { draftsRouter } from './routes/drafts';
import { hashtagsRouter } from './routes/hashtags';
import { ideationRouter } from './routes/ideation';
import { notificationsRouter } from './routes/notifications';
import { postsRouter } from './routes/posts';
import { researchRouter } from './routes/research';
import { settingsRouter } from './routes/settings';

export function createApp(): Express {
  const app = express();

  app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
  app.use(express.json());
  app.use(requestLogger);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'contentiq-backend', timestamp: new Date().toISOString() });
  });

  app.use('/api/research', researchRouter);
  app.use('/api/ideation', ideationRouter);
  app.use('/api/drafts', draftsRouter);
  app.use('/api/calendar', calendarRouter);
  app.use('/api/captions', captionsRouter);
  app.use('/api/hashtags', hashtagsRouter);
  app.use('/api/posts', postsRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/notifications', notificationsRouter);

  app.use((req, res) => {
    res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}` });
  });

  app.use(errorHandler);

  return app;
}
