import * as cheerio from 'cheerio';
import Parser from 'rss-parser';
import { GOOGLE_API_KEY, GOOGLE_SEARCH_ENGINE_ID, httpClient } from '../utils/apiClients';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prisma';

export type ResearchSource = 'hn' | 'reddit' | 'google' | 'techcrunch' | 'blog' | 'rss';
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

const RSS_FEEDS: { url: string; source: ResearchSource }[] = [
  { url: 'https://news.ycombinator.com/rss', source: 'hn' },
  { url: 'https://www.reddit.com/r/MachineLearning/.rss', source: 'reddit' },
  { url: 'https://www.reddit.com/r/artificial/.rss', source: 'reddit' },
  { url: 'https://techcrunch.com/feed/', source: 'techcrunch' },
  { url: 'https://venturebeat.com/category/ai/feed/', source: 'rss' },
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
  // Not a news feed — queries target practical AI leverage (automation,
  // productivity, income), matching the app's actual content angle.
  const queries = ['AI productivity tools for business', 'how to automate tasks with AI', 'AI tools to make money online'];
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
  const [google, rss, blogs] = await Promise.all([googleSearch(), fetchRss(), scrapeBlogs()]);
  logger.info({ google: google.length, rss: rss.length, blogs: blogs.length }, 'crawl complete');
  return [...google, ...rss, ...blogs];
}

const RELEVANCE_KEYWORDS = [
  'ai',
  'artificial intelligence',
  'ml',
  'machine learning',
  'llm',
  'gpt',
  'claude',
  'prompt',
  'openai',
  'anthropic',
  'neural',
  'model',
  'chatbot',
  'generative',
  // Leverage/productivity/profit angle — this app isn't a breaking-news
  // feed, it's about using AI to do more, faster, or for more money.
  'automate',
  'automation',
  'productivity',
  'workflow',
  'efficiency',
  'save time',
  'monetize',
  'income',
  'side hustle',
  'freelance',
  'business',
  'startup',
  'no-code',
  'agent',
];

const SOURCE_AUTHORITY: Record<ResearchSource, number> = {
  hn: 1.0,
  techcrunch: 1.0,
  google: 0.9,
  blog: 0.9,
  rss: 0.85,
  reddit: 0.8,
};

function keywordScore(text: string): number {
  const lower = text.toLowerCase();
  return Math.min(RELEVANCE_KEYWORDS.filter((k) => lower.includes(k)).length, 5);
}

function recencyFactor(publishedAt: Date): number {
  const hoursAgo = (Date.now() - publishedAt.getTime()) / 3_600_000;
  if (hoursAgo <= 24) return 1;
  if (hoursAgo <= 72) return 0.8;
  if (hoursAgo <= 168) return 0.6;
  return 0.4;
}

function scoreItem(item: RawResearchItem): number {
  const kw = keywordScore(`${item.title} ${item.snippet}`);
  const authority = SOURCE_AUTHORITY[item.source] ?? 0.7;
  const recency = recencyFactor(item.publishedAt);
  const raw = kw * 2 * authority * recency;
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
    select: { fullUrl: true },
  });
  const existingUrls = new Set(existing.map((e) => e.fullUrl));
  const newItems = items.filter((i) => !existingUrls.has(i.fullUrl));

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

  return { found: items.length, added: newItems.length };
}

export async function runResearchSweep(relevanceThreshold = 0) {
  const raw = await crawlMultipleSources();
  const ranked = deduplicateAndRank(raw).filter((i) => i.relevanceScore >= relevanceThreshold);
  const categorized = categorizeItems(ranked);
  const { found, added } = await saveToDatabase(categorized);
  return { found, added, items: categorized };
}
