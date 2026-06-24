import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app';
import { scheduleDailyResearchSweep } from './jobs/dailyResearchSweep';
import { runUpdateTrendingHashtagsJob, scheduleUpdateTrendingHashtags } from './jobs/updateTrendingHashtags';
import { logger } from './utils/logger';

const PORT = Number(process.env.PORT) || 5000;

const app = createApp();

app.listen(PORT, () => {
  logger.info(`ContentIQ backend listening on http://localhost:${PORT} [${new Date().toISOString()}]`);

  scheduleDailyResearchSweep();
  scheduleUpdateTrendingHashtags();

  // Run once at boot so the trending list isn't empty until the first 6h tick.
  runUpdateTrendingHashtagsJob().catch((err) => logger.error({ err }, 'initial hashtag refresh failed'));
});
