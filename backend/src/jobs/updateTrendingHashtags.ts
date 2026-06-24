import cron from 'node-cron';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prisma';

// Instagram/Twitter trending APIs require elevated platform access we don't
// have yet, so this refreshes from a curated AI/tech/creator hashtag pool
// with simulated volume movement — matches the spec's "mock for now" note.
// Swap the body of this function for real API calls once that access exists.
const CURATED_HASHTAGS: { hashtag: string; category: string; baseVolume: number }[] = [
  { hashtag: '#AI', category: 'AI', baseVolume: 500_000 },
  { hashtag: '#MachineLearning', category: 'AI', baseVolume: 300_000 },
  { hashtag: '#ArtificialIntelligence', category: 'AI', baseVolume: 280_000 },
  { hashtag: '#LLM', category: 'AI', baseVolume: 150_000 },
  { hashtag: '#GenerativeAI', category: 'AI', baseVolume: 140_000 },
  { hashtag: '#PromptEngineering', category: 'AI', baseVolume: 90_000 },
  { hashtag: '#AIAgents', category: 'AI', baseVolume: 85_000 },
  { hashtag: '#OpenAI', category: 'AI', baseVolume: 120_000 },
  { hashtag: '#Anthropic', category: 'AI', baseVolume: 60_000 },
  { hashtag: '#ClaudeAI', category: 'AI', baseVolume: 55_000 },
  { hashtag: '#TechTrends', category: 'Tech', baseVolume: 110_000 },
  { hashtag: '#TechNews', category: 'Tech', baseVolume: 200_000 },
  { hashtag: '#FutureOfWork', category: 'Tech', baseVolume: 70_000 },
  { hashtag: '#Startup', category: 'Tech', baseVolume: 180_000 },
  { hashtag: '#SaaS', category: 'Tech', baseVolume: 95_000 },
  { hashtag: '#ContentCreator', category: 'Creator', baseVolume: 220_000 },
  { hashtag: '#ContentCreation', category: 'Creator', baseVolume: 160_000 },
  { hashtag: '#CreatorEconomy', category: 'Creator', baseVolume: 60_000 },
  { hashtag: '#InstagramReels', category: 'Creator', baseVolume: 250_000 },
  { hashtag: '#SocialMediaTips', category: 'Creator', baseVolume: 130_000 },
  { hashtag: '#AINews', category: 'General', baseVolume: 100_000 },
  { hashtag: '#TechCommunity', category: 'General', baseVolume: 75_000 },
];

function jitter(base: number): { volume: number; growth: number } {
  const noise = 0.85 + Math.random() * 0.3; // +/-15%
  const volume = Math.round(base * noise);
  const growth = Math.round((noise - 1) * 1000) / 1000;
  return { volume, growth };
}

export async function runUpdateTrendingHashtagsJob(): Promise<void> {
  const start = Date.now();
  try {
    for (const entry of CURATED_HASHTAGS) {
      const { volume, growth } = jitter(entry.baseVolume);
      await prisma.hashtagTrending.upsert({
        where: { hashtag: entry.hashtag },
        update: { searchVolume: volume, growthRate: growth, category: entry.category, lastUpdated: new Date() },
        create: { hashtag: entry.hashtag, category: entry.category, searchVolume: volume, growthRate: growth },
      });
    }

    // Keep only the top 50 by volume; never prune a user's favorites.
    const all = await prisma.hashtagTrending.findMany({ orderBy: { searchVolume: 'desc' } });
    const toRemove = all.slice(50).filter((h) => !h.isFavorite);
    if (toRemove.length > 0) {
      await prisma.hashtagTrending.deleteMany({ where: { id: { in: toRemove.map((h) => h.id) } } });
    }

    logger.info(
      { updated: CURATED_HASHTAGS.length, removed: toRemove.length, durationMs: Date.now() - start },
      'trending hashtags updated'
    );
  } catch (err) {
    logger.error({ err, durationMs: Date.now() - start }, 'trending hashtags update failed');
  }
}

export function scheduleUpdateTrendingHashtags(): void {
  cron.schedule('0 */6 * * *', () => {
    runUpdateTrendingHashtagsJob().catch((err) => logger.error({ err }, 'unhandled error in hashtag update job'));
  });
  logger.info('trending hashtags update job scheduled (every 6 hours)');
}
