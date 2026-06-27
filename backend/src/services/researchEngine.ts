import * as cheerio from 'cheerio';
import Parser from 'rss-parser';
import { GOOGLE_API_KEY, GOOGLE_SEARCH_ENGINE_ID, httpClient } from '../utils/apiClients';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prisma';

export type ResearchSource = 'hn' | 'reddit' | 'google' | 'youtube' | 'techcrunch' | 'blog' | 'rss';
export type ResearchCategory = 'AI News' | 'AI Tools' | 'Trends' | 'Tips' | 'Other';

export interface RawResearchItem {
  title: string;
  snippet: string;
  fullUrl: string;
  sourceUrl?: string;
  source: ResearchSource;
  publishedAt: Date;
}
export interface ScoredResearchItem extends RawResearchItem {
  relevanceScore: number;
}
export interface CategorizedResearchItem extends ScoredResearchItem {
  category: ResearchCategory;
}

const rssParser = new Parser();

// Broad on purpose — this casts wide across general tech/AI sources rather
// than pre-filtering to the niche at the source level. The 7+ relevance
// score (see scoreItem) is what narrows this down, not the source list.
const RSS_FEEDS: { url: string; source: ResearchSource }[] = [
  { url: 'https://news.ycombinator.com/rss', source: 'hn' },
  { url: 'https://www.reddit.com/r/MachineLearning/.rss', source: 'reddit' },
  { url: 'https://www.reddit.com/r/artificial/.rss', source: 'reddit' },
  { url: 'https://www.reddit.com/r/ChatGPT/.rss', source: 'reddit' },
  { url: 'https://techcrunch.com/feed/', source: 'techcrunch' },
  { url: 'https://venturebeat.com/category/ai/feed/', source: 'rss' },
  { url: 'https://www.theverge.com/rss/index.xml', source: 'rss' },
  { url: 'https://feeds.arstechnica.com/arstechnica/index', source: 'rss' },
  { url: 'https://www.technologyreview.com/feed/', source: 'rss' },
  { url: 'https://www.wired.com/feed/rss', source: 'rss' },
  { url: 'https://www.producthunt.com/feed', source: 'rss' },
  { url: 'https://lobste.rs/rss', source: 'rss' },
  { url: 'https://dev.to/feed/tag/ai', source: 'rss' },
];

// Web scraping is the documented fallback tier — selectors here are
// best-effort and may need adjusting if a site's markup changes.
const SCRAPE_BLOGS: { url: string; selector: string }[] = [
  { url: 'https://huggingface.co/blog', selector: 'a[href^="/blog/"]' },
  { url: 'https://openai.com/news/', selector: 'a[href^="/index/"]' },
];

async function fetchFeed(feed: { url: string; source: ResearchSource }): Promise<RawResearchItem[]> {
  try {
    const parsed = await rssParser.parseURL(feed.url);
    return (parsed.items || []).slice(0, 15).map((entry) => ({
      title: (entry.title || '(untitled)').trim(),
      snippet: (entry.contentSnippet || entry.content || '').slice(0, 500),
      fullUrl: entry.link || feed.url,
      source: feed.source,
      publishedAt: entry.isoDate ? new Date(entry.isoDate) : new Date(),
    }));
  } catch (err) {
    logger.warn({ err, url: feed.url }, 'RSS feed fetch failed');
    return [];
  }
}

async function fetchRss(): Promise<RawResearchItem[]> {
  const results = await Promise.all(RSS_FEEDS.map(fetchFeed));
  return results.flat();
}

async function googleSearch(): Promise<RawResearchItem[]> {
  if (!GOOGLE_API_KEY || !GOOGLE_SEARCH_ENGINE_ID) {
    logger.warn('Google Custom Search not configured, skipping');
    return [];
  }
  // Broad on purpose, same reasoning as RSS_FEEDS above — search generally
  // for AI news/tools rather than pre-filtering to the niche at query time.
  // Relevance scoring (7+) is what narrows results down, not the query text.
  const queries = ['AI news', 'AI tools', 'AI tech trends'];
  try {
    const responses = await Promise.all(
      queries.map((q) =>
        httpClient.get('https://www.googleapis.com/customsearch/v1', {
          params: { key: GOOGLE_API_KEY, cx: GOOGLE_SEARCH_ENGINE_ID, q },
        })
      )
    );
    const items: RawResearchItem[] = [];
    for (const res of responses) {
      for (const entry of res.data.items ?? []) {
        items.push({
          title: entry.title,
          snippet: (entry.snippet || '').slice(0, 500),
          fullUrl: entry.link,
          source: 'google',
          publishedAt: new Date(),
        });
      }
    }
    return items;
  } catch (err) {
    logger.warn({ err }, 'Google Custom Search failed');
    return [];
  }
}

// YouTube Data API v3 — the one mainstream social platform with a real free
// tier for automated search (10k quota units/day, 100 per search call).
// Twitter/X, LinkedIn, TikTok, and Instagram have no equivalent free API for
// content discovery; scraping them is fragile and against ToS, so they're
// deliberately not included here. Requires the SAME Google API key to also
// have "YouTube Data API v3" enabled in Google Cloud Console (a separate
// toggle from Custom Search) — returns [] gracefully until that's done.
async function youtubeSearch(): Promise<RawResearchItem[]> {
  if (!GOOGLE_API_KEY) {
    logger.warn('GOOGLE_API_KEY not set, skipping YouTube search');
    return [];
  }
  const queries = ['AI tools', 'AI automation', 'how to use AI'];
  try {
    const responses = await Promise.all(
      queries.map((q) =>
        httpClient.get('https://www.googleapis.com/youtube/v3/search', {
          params: {
            key: GOOGLE_API_KEY,
            part: 'snippet',
            type: 'video',
            order: 'relevance',
            maxResults: 10,
            q,
          },
        })
      )
    );
    const items: RawResearchItem[] = [];
    for (const res of responses) {
      for (const entry of res.data.items ?? []) {
        const videoId = entry.id?.videoId;
        if (!videoId) continue;
        items.push({
          title: entry.snippet?.title ?? '(untitled)',
          snippet: (entry.snippet?.description || '').slice(0, 500),
          fullUrl: `https://www.youtube.com/watch?v=${videoId}`,
          source: 'youtube',
          publishedAt: entry.snippet?.publishedAt ? new Date(entry.snippet.publishedAt) : new Date(),
        });
      }
    }
    return items;
  } catch (err) {
    logger.warn({ err }, 'YouTube search failed');
    return [];
  }
}

async function scrapeBlog(blog: { url: string; selector: string }): Promise<RawResearchItem[]> {
  try {
    const { data: html } = await httpClient.get(blog.url);
    const $ = cheerio.load(html);
    const items: RawResearchItem[] = [];
    const seen = new Set<string>();
    $(blog.selector).each((_, el) => {
      const title = $(el).text().trim();
      const href = $(el).attr('href');
      if (!title || !href || title.length < 8 || seen.has(title)) return;
      seen.add(title);
      items.push({
        title,
        snippet: title.slice(0, 200),
        fullUrl: href.startsWith('http') ? href : new URL(href, blog.url).toString(),
        source: 'blog',
        publishedAt: new Date(),
      });
    });
    return items.slice(0, 10);
  } catch (err) {
    logger.warn({ err, url: blog.url }, 'blog scrape failed');
    return [];
  }
}

async function scrapeBlogs(): Promise<RawResearchItem[]> {
  const results = await Promise.all(SCRAPE_BLOGS.map(scrapeBlog));
  return results.flat();
}

export async function crawlMultipleSources(): Promise<RawResearchItem[]> {
  const [google, youtube, rss, blogs] = await Promise.all([
    googleSearch(),
    youtubeSearch(),
    fetchRss(),
    scrapeBlogs(),
  ]);
  logger.info(
    { google: google.length, youtube: youtube.length, rss: rss.length, blogs: blogs.length },
    'crawl complete'
  );
  return [...google, ...youtube, ...rss, ...blogs];
}

// Plain substring matching was tried first and had to be abandoned: 'ai'
// matched inside "container"/"maintain", 'app' matched inside "happen",
// 'ml' matched inside "html". Every keyword below is matched on a real word
// boundary instead (see toWordBoundaryRegexes), so plurals need an explicit
// entry the same way 'tool'/'tools' both need to appear separately.

// Confirms the item is about AI at all. On its own this is NOT enough to
// score well — pure ML research/announcements match plenty of these with
// zero practical takeaway, which is exactly what this app's niche excludes.
const CORE_AI_KEYWORDS = [
  'ai',
  'artificial intelligence',
  'ml',
  'machine learning',
  'llm',
  'llms',
  'gpt',
  'claude',
  'gemini',
  'prompt',
  'prompts',
  'openai',
  'anthropic',
  'anthropics',
  'neural',
  'model',
  'models',
  'chatbot',
  'chatbots',
  'generative',
  'agent',
  'agents',
];

// The actual "use AI to do X" signal — leverage, productivity, profit.
// Only counted when at least one CORE_AI_KEYWORDS hit is also present
// (see scoreItem), so a non-AI "5 productivity tips" post can't sneak in.
const NICHE_ACTION_KEYWORDS = [
  'automate',
  'automation',
  'productivity',
  'productive',
  'workflow',
  'workflows',
  'efficiency',
  'efficient',
  'save time',
  'saves time',
  'time-saving',
  'monetize',
  'passive income',
  'extra income',
  'profitable',
  'earn money',
  'earn extra',
  'side hustle',
  'freelance',
  'freelancer',
  'freelancers',
  'client',
  'clients',
  'business',
  'startup',
  'startups',
  'small business',
  'no-code',
  'tool',
  'tools',
  'app',
  'apps',
  'how to',
  'guide',
  'guides',
  'tip',
  'tips',
  'trick',
  'tricks',
  'hack',
  'hacks',
  'tutorial',
  'tutorials',
  'grow your',
  'scale your',
  'work smarter',
  // Deliberately excludes bare 'boost'/'grow'/'scale'/'faster'/'smarter' —
  // those collide constantly with legitimate ML-research phrasing
  // ("large-scale training", "faster inference", "boosts accuracy") that
  // has zero practical takeaway for this niche. Same reason 'earn'/'earning'
  // and bare 'income'/'profit' are excluded — they're substrings of or
  // identical to standard financial-reporting language ("earnings report",
  // "profit margin"), which scored a stock/earnings article a perfect 10
  // during testing despite having nothing to do with the niche.
];

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toWordBoundaryRegexes(keywords: string[]): RegExp[] {
  return keywords.map((k) => new RegExp(`\\b${escapeRegex(k)}\\b`, 'i'));
}

const CORE_AI_REGEXES = toWordBoundaryRegexes(CORE_AI_KEYWORDS);
const NICHE_ACTION_REGEXES = toWordBoundaryRegexes(NICHE_ACTION_KEYWORDS);

function countHits(text: string, regexes: RegExp[]): number {
  return regexes.filter((r) => r.test(text)).length;
}

// These are additive bonuses (0-1), not multipliers — keyword relevance is
// the dominant signal (0-8 of the 10 points) so a great niche-fit post from
// a lower-authority source still clears a high bar instead of being
// multiplicatively crushed by source/recency like the old formula did.
const SOURCE_AUTHORITY_BONUS: Record<ResearchSource, number> = {
  hn: 1.0,
  techcrunch: 1.0,
  google: 0.8,
  youtube: 0.7,
  blog: 0.8,
  rss: 0.6,
  reddit: 0.6,
};

// Not a news feed — a great practical tip from last week is just as usable
// as one from today, so recency is a minor bonus, not a hard gate.
function recencyBonus(publishedAt: Date): number {
  const hoursAgo = (Date.now() - publishedAt.getTime()) / 3_600_000;
  if (hoursAgo <= 24 * 3) return 1;
  if (hoursAgo <= 24 * 14) return 0.7;
  return 0.4;
}

function scoreItem(item: RawResearchItem): number {
  const text = `${item.title} ${item.snippet}`;
  const aiHits = countHits(text, CORE_AI_REGEXES);
  if (aiHits === 0) return 0; // not about AI at all — score it zero, full stop

  const actionHits = countHits(text, NICHE_ACTION_REGEXES);
  const kw = Math.min(actionHits * 2.5 + aiHits, 8);
  const authorityBonus = SOURCE_AUTHORITY_BONUS[item.source] ?? 0.5;
  const raw = kw + authorityBonus + recencyBonus(item.publishedAt);
  return Math.max(0, Math.min(10, Math.round(raw * 10) / 10));
}

// Dedupe key is title+source (matches items re-fetched from the same source
// verbatim); cross-source dupes of the same story are allowed through since
// each source's framing/snippet is still useful context for ideation.
export function deduplicateAndRank(items: RawResearchItem[]): ScoredResearchItem[] {
  const seen = new Set<string>();
  const deduped: RawResearchItem[] = [];
  for (const item of items) {
    const key = `${item.title.trim().toLowerCase()}::${item.source}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }
  return deduped.map((item) => ({ ...item, relevanceScore: scoreItem(item) }));
}

// Stems need explicit plural/conjugation suffixes — a bare `\btool\b` never
// matches "tools", `\blaunch\b` never matches "launches", etc. Real titles
// are written in those forms far more often than the bare singular/infinitive.
function categorize(item: ScoredResearchItem): ResearchCategory {
  const text = `${item.title} ${item.snippet}`.toLowerCase();
  if (/\b(tips?|tricks?|guides?|tutorials?|how to|prompt engineering|hacks?)\b/.test(text)) return 'Tips';
  if (/\b(tools?|apps?|platforms?|extensions?|plugins?|sdks?|apis?|automations?|workflows?)\b/.test(text)) return 'AI Tools';
  if (
    /\b(launch(es|ed|ing)?|release[sd]?|announc(e|es|ed|ement|ements)|unveil(s|ed|ing)?|updat(e|es|ed|ing)|versions?)\b/.test(
      text
    ) && /\b(ai|llm|gpt|claude|models?)\b/.test(text)
  ) {
    return 'AI News';
  }
  if (/\b(trends?|rising|growing|predict(s|ed|ion|ions)?)\b|\bfuture of\b/.test(text)) return 'Trends';
  return 'Other';
}

export function categorizeItems(items: ScoredResearchItem[]): CategorizedResearchItem[] {
  return items.map((item) => ({ ...item, category: categorize(item) }));
}

export async function saveToDatabase(
  items: CategorizedResearchItem[]
): Promise<{ found: number; added: number }> {
  if (items.length === 0) return { found: 0, added: 0 };

  const existing = await prisma.researchItem.findMany({
    where: { fullUrl: { in: items.map((i) => i.fullUrl) } },
    select: { id: true, fullUrl: true },
  });
  const existingIdByUrl = new Map(existing.map((e) => [e.fullUrl, e.id]));
  const newItems = items.filter((i) => !existingIdByUrl.has(i.fullUrl));
  const refreshItems = items.filter((i) => existingIdByUrl.has(i.fullUrl));

  if (newItems.length > 0) {
    await prisma.researchItem.createMany({
      data: newItems.map((i) => ({
        title: i.title.slice(0, 300),
        snippet: i.snippet.slice(0, 500),
        fullUrl: i.fullUrl,
        sourceUrl: i.sourceUrl,
        source: i.source,
        category: i.category,
        relevanceScore: i.relevanceScore,
        publishedAt: i.publishedAt,
      })),
    });
  }

  // Re-score items that already exist instead of just skipping them — keeps
  // stored scores/categories current when the scoring logic changes, rather
  // than leaving a URL stuck forever with whatever it scored on first sweep.
  await Promise.all(
    refreshItems.map((i) =>
      prisma.researchItem.update({
        where: { id: existingIdByUrl.get(i.fullUrl)! },
        data: { relevanceScore: i.relevanceScore, category: i.category },
      })
    )
  );

  return { found: items.length, added: newItems.length };
}

export async function runResearchSweep(relevanceThreshold = 0) {
  const raw = await crawlMultipleSources();
  const ranked = deduplicateAndRank(raw).filter((i) => i.relevanceScore >= relevanceThreshold);
  const categorized = categorizeItems(ranked);
  const { found, added } = await saveToDatabase(categorized);
  return { found, added, items: categorized };
}
