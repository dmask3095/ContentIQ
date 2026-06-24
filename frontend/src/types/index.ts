// Mirrors backend/prisma/schema.prisma — kept manually in sync since the
// frontend can't import backend-generated Prisma types directly.
//
// Two differences from the Prisma models, both reflecting what actually
// crosses the wire as JSON:
//   - DateTime columns are ISO date strings here, not Date objects.
//   - Columns stored as JSON-encoded String in SQLite (hashtags,
//     carouselSlides, dataSourcesEnabled, ...) are typed here in their
//     parsed shape — the API layer (STEP 3) is expected to parse/stringify
//     at the boundary so the frontend never sees raw JSON text.

export type ResearchSource = 'hn' | 'reddit' | 'google' | 'techcrunch' | 'blog' | 'rss';
export type ResearchCategory = 'AI News' | 'AI Tools' | 'Trends' | 'Tips' | 'Other';
export type ContentFormat = 'reel_hook' | 'carousel' | 'story' | 'caption';
export type DraftFormat = 'reel' | 'carousel' | 'story' | 'caption';
export type ContentTone = 'Educational' | 'Breaking' | 'Opinion' | 'Hype';
// 'claude' | 'gpt4' | 'both' are dormant (no billing) — Gemini is active for now.
export type GeneratedBy = 'gemini' | 'claude' | 'gpt4' | 'both';
export type DraftStatus = 'draft' | 'scheduled' | 'published';
export type HashtagCategory = 'AI' | 'Tech' | 'Creator' | 'General';
export type DigestFrequency = 'daily' | 'weekly';

export interface ResearchItem {
  id: string;
  title: string;
  snippet: string;
  fullUrl: string;
  sourceUrl: string | null;
  source: ResearchSource;
  category: ResearchCategory;
  relevanceScore: number;
  isRead: boolean;
  isArchived: boolean;
  isStarred: boolean;
  publishedAt: string;
  discoveredAt: string;
  createdAt: string;
}

export interface ContentIdea {
  id: string;
  researchItemIds: string[];
  format: ContentFormat;
  conceptVariation: number;
  aiGeneratedCaption: string;
  aiHook: string;
  tone: ContentTone;
  generatedBy: GeneratedBy;
  userEdited: boolean;
  createdAt: string;
}

export interface CarouselSlide {
  title: string;
  copy: string;
  image_url?: string;
}

export interface ContentDraft {
  id: string;
  ideaId: string | null;
  title: string;
  caption: string;
  format: DraftFormat;
  carouselSlides: CarouselSlide[] | null;
  hashtags: string[];
  scheduledDate: string;
  scheduledTime: string;
  status: DraftStatus;
  publishedAt: string | null;
  userNotes: string | null;
  createdAt: string;
  updatedAt: string;
  publishedPost?: PublishedPost | null;
}

export interface PublishedPost {
  id: string;
  draftId: string;
  instagramPostId: string | null;
  format: DraftFormat;
  publishedAt: string;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  impressions: number;
  lastSynced: string;
}

export interface HashtagTrending {
  id: string;
  hashtag: string;
  category: HashtagCategory;
  searchVolume: number;
  growthRate: number;
  isFavorite: boolean;
  lastUpdated: string;
}

// Shape returned by GET /api/hashtags/trending — distinct from the
// HashtagTrending model's own field names (kept as the API documented it).
export interface TrendingHashtag {
  id: string;
  hashtag: string;
  usage_count: number;
  growth: number;
  category: HashtagCategory;
  is_favorite: boolean;
}

export interface UserSettings {
  id: string;
  researchSweepTime: string;
  researchSweepEnabled: boolean;
  dataSourcesEnabled: { google: boolean; rss: boolean; scrape: boolean };
  contentCategories: ResearchCategory[];
  relevanceThreshold: number;
  emailDigestEnabled: boolean;
  emailDigestFrequency: DigestFrequency;
  slackEnabled: boolean;
  slackWebhookUrl: string | null;
  slackChannel: string | null;
  timezone: string;
  bestPostingTimes: Record<string, string[]>;
  contentMixGoal: { reels: number; carousels: number; stories: number };
  createdAt: string;
  updatedAt: string;
}
