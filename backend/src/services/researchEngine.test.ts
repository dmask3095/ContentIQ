import { describe, expect, it } from 'vitest';
import { categorizeItems, deduplicateAndRank, type RawResearchItem, type ScoredResearchItem } from './researchEngine';

function rawItem(overrides: Partial<RawResearchItem> = {}): RawResearchItem {
  return {
    title: 'Some AI model news',
    snippet: 'A snippet about an AI model.',
    fullUrl: 'https://example.com/a',
    source: 'hn',
    publishedAt: new Date(),
    ...overrides,
  };
}

function scoredItem(overrides: Partial<ScoredResearchItem> = {}): ScoredResearchItem {
  return { ...rawItem(), relevanceScore: 0, ...overrides };
}

describe('deduplicateAndRank', () => {
  it('removes exact title+source duplicates, case-insensitive and trimmed', () => {
    const items = [
      rawItem({ title: 'Claude 3.5 launches', source: 'hn', fullUrl: 'https://example.com/1' }),
      rawItem({ title: '  claude 3.5 LAUNCHES  ', source: 'hn', fullUrl: 'https://example.com/2' }),
    ];
    const result = deduplicateAndRank(items);
    expect(result).toHaveLength(1);
    expect(result[0].fullUrl).toBe('https://example.com/1');
  });

  it('keeps the same title from a different source (cross-source dupes are allowed)', () => {
    const items = [
      rawItem({ title: 'Same story', source: 'hn' }),
      rawItem({ title: 'Same story', source: 'reddit' }),
    ];
    const result = deduplicateAndRank(items);
    expect(result).toHaveLength(2);
  });

  it('scores higher for more keyword matches, capped at a relevanceScore of 10', () => {
    const now = new Date();
    const fewKeywords = deduplicateAndRank([
      rawItem({ title: 'AI model update', snippet: '', source: 'hn', publishedAt: now }),
    ])[0];
    const manyKeywords = deduplicateAndRank([
      rawItem({
        title: 'AI machine learning LLM GPT Claude prompt openai anthropic neural model chatbot generative',
        snippet: '',
        source: 'hn',
        publishedAt: now,
      }),
    ])[0];
    expect(manyKeywords.relevanceScore).toBeGreaterThan(fewKeywords.relevanceScore);
    expect(manyKeywords.relevanceScore).toBeLessThanOrEqual(10);
  });

  it('weights source authority — hn (1.0) outranks reddit (0.8) for identical content', () => {
    const now = new Date();
    const [hnItem] = deduplicateAndRank([
      rawItem({ title: 'AI model news', source: 'hn', publishedAt: now, fullUrl: 'https://x/1' }),
    ]);
    const [redditItem] = deduplicateAndRank([
      rawItem({ title: 'AI model news', source: 'reddit', publishedAt: now, fullUrl: 'https://x/2' }),
    ]);
    expect(hnItem.relevanceScore).toBeGreaterThan(redditItem.relevanceScore);
  });

  it('decays score for older items via the recency factor', () => {
    const fresh = deduplicateAndRank([
      rawItem({ title: 'AI model news', source: 'hn', publishedAt: new Date(), fullUrl: 'https://x/1' }),
    ])[0];
    const stale = deduplicateAndRank([
      rawItem({
        title: 'AI model news',
        source: 'hn',
        publishedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days old
        fullUrl: 'https://x/2',
      }),
    ])[0];
    expect(stale.relevanceScore).toBeLessThan(fresh.relevanceScore);
  });

  it('returns a relevanceScore of 0 when no keywords match at all', () => {
    const [result] = deduplicateAndRank([
      rawItem({ title: 'Completely unrelated gardening tips', snippet: 'How to grow tomatoes.' }),
    ]);
    expect(result.relevanceScore).toBe(0);
  });
});

describe('categorizeItems', () => {
  it('categorizes "Tips" when tip/tutorial-style keywords are present', () => {
    const [result] = categorizeItems([
      scoredItem({ title: '10 Prompt Engineering Tricks', snippet: 'A quick tutorial.' }),
    ]);
    expect(result.category).toBe('Tips');
  });

  it('categorizes "AI Tools" when tool/platform keywords are present', () => {
    const [result] = categorizeItems([
      scoredItem({ title: 'New AI app released', snippet: 'A handy platform for builders.' }),
    ]);
    expect(result.category).toBe('AI Tools');
  });

  it('matches plural/conjugated forms, not just bare singular stems', () => {
    expect(categorizeItems([scoredItem({ title: '5 New AI Tools This Week', snippet: '' })])[0].category).toBe(
      'AI Tools'
    );
    expect(categorizeItems([scoredItem({ title: 'Prompt Engineering Tips', snippet: '' })])[0].category).toBe('Tips');
    expect(categorizeItems([scoredItem({ title: 'AI hiring trends for 2026', snippet: '' })])[0].category).toBe(
      'Trends'
    );
  });

  it('categorizes "AI News" when a launch/release keyword pairs with an AI keyword', () => {
    const [result] = categorizeItems([
      scoredItem({ title: 'Claude 3.5 Sonnet launches', snippet: 'Anthropic unveils new model.' }),
    ]);
    expect(result.category).toBe('AI News');
  });

  it('does not categorize as "AI News" when a launch keyword appears without an AI keyword', () => {
    const [result] = categorizeItems([
      scoredItem({ title: 'New restaurant launches downtown', snippet: 'Grand opening this weekend.' }),
    ]);
    expect(result.category).not.toBe('AI News');
  });

  it('categorizes "Trends" when trend-related keywords are present', () => {
    const [result] = categorizeItems([
      scoredItem({ title: 'The future of remote work', snippet: 'A rising trend among teams.' }),
    ]);
    expect(result.category).toBe('Trends');
  });

  it('falls back to "Other" when nothing matches', () => {
    const [result] = categorizeItems([scoredItem({ title: 'Quarterly earnings report', snippet: 'Numbers inside.' })]);
    expect(result.category).toBe('Other');
  });

  it('prioritizes "Tips" over "AI Tools" when both keyword sets are present', () => {
    const [result] = categorizeItems([
      scoredItem({ title: 'A tutorial for this new AI app', snippet: 'Step by step guide.' }),
    ]);
    expect(result.category).toBe('Tips');
  });
});
