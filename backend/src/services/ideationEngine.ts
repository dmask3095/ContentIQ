import type { ContentDraft, ContentIdea } from '@prisma/client';
import { GEMINI_MODEL, gemini } from '../utils/apiClients';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prisma';

export type IdeaFormat = 'reel_hook' | 'carousel' | 'story' | 'caption';
export type IdeaTone = 'Educational' | 'Breaking' | 'Opinion' | 'Hype';
export type IdeaGeneratedBy = 'gemini';

export interface GeneratedIdea {
  format: IdeaFormat;
  hook: string;
  caption: string;
  tone: IdeaTone;
}

interface ResearchSummary {
  title: string;
  snippet: string;
}

function buildPrompt(items: ResearchSummary[], opts: { altAngles?: boolean } = {}): string {
  const topic = items.map((i) => `- ${i.title}: ${i.snippet}`).join('\n');
  const angleNote = opts.altAngles
    ? '\nFocus on alternative angles and viral, scroll-stopping hooks rather than a standard educational take.'
    : '';
  return `Topic:\n${topic}\n\nTarget Audience: People who want to use AI to save time, automate busywork, and grow their income or business — professionals, freelancers, side-hustlers, small business owners.\nPlatform: Instagram\nAngle: This is NOT a news channel. Every idea must answer "how does this help someone leverage AI to do more, faster, or for more profit?" Skip pure announcements with no practical takeaway.${angleNote}\n\nGenerate 3 content ideas for this topic. For each idea:\n- Content format: one of "reel_hook", "carousel", "story", "caption"\n- Hook (first 1-2 lines): Compelling, curiosity-driven, leads with the benefit/payoff\n- Full caption/script — length and style depend on format:\n  - "reel_hook" or "story": a SPOKEN VOICEOVER SCRIPT sized for a 30-SECOND video — 75-90 words total. Short spoken sentences, not essay prose. Structure: hook line (5-10 words) -> 2-3 punchy actionable points -> one-line CTA.\n  - "carousel": 5 short slide lines (15-25 words each), each one concrete and actionable, separated by "\\n".\n  - "caption": a concise 80-120 word Instagram caption with exactly one clear actionable takeaway.\n- Tone: one of "Educational", "Breaking", "Opinion", "Hype"\n\nReturn ONLY valid JSON (no markdown fences), an array shaped exactly like:\n[{ "format": "reel_hook", "hook": "...", "caption": "...", "tone": "Educational" }]`;
}

function isValidIdea(x: unknown): x is GeneratedIdea {
  if (!x || typeof x !== 'object') return false;
  const i = x as Record<string, unknown>;
  return (
    typeof i.format === 'string' &&
    typeof i.hook === 'string' &&
    typeof i.caption === 'string' &&
    typeof i.tone === 'string'
  );
}

function parseIdeasJson(text: string): GeneratedIdea[] {
  try {
    const match = text.match(/\[[\s\S]*\]/);
    const parsed = JSON.parse(match ? match[0] : text);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidIdea);
  } catch (err) {
    logger.warn({ err, text: text.slice(0, 200) }, 'failed to parse ideation JSON');
    return [];
  }
}

const RETRYABLE_STATUS = new Set([429, 503]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Free-tier 503 "high demand" responses correlate with request weight —
// asking for 3 long captions in one call gets capacity-limited far more
// than a trivial prompt, but it does clear up within tens of seconds in
// practice, so this retries with real backoff room rather than giving up
// after a couple of seconds.
async function callGemini(prompt: string, maxOutputTokens: number, temperature = 0.8): Promise<string> {
  const attempts = 5;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await gemini.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        // 2.5-flash's "thinking" tokens eat into maxOutputTokens before the
        // visible answer is written, which was silently truncating JSON
        // output before the closing bracket. Disabling it frees the full
        // budget for the actual response.
        config: { temperature, maxOutputTokens, thinkingConfig: { thinkingBudget: 0 } },
      });
      return response.text ?? '';
    } catch (err) {
      const status = (err as { status?: number }).status;
      const isLastAttempt = attempt === attempts;
      if (!status || !RETRYABLE_STATUS.has(status) || isLastAttempt) throw err;
      logger.warn({ status, attempt }, 'Gemini call hit a transient error, retrying');
      await sleep(3000 * attempt);
    }
  }
  return '';
}

// Two calls with different prompt framings (standard vs. alternative/viral
// angle) preserve the "two perspectives" product value that used to come
// from calling two different model providers in parallel.
export async function generateIdeasWithGemini(researchItems: ResearchSummary[]): Promise<GeneratedIdea[]> {
  if (!process.env.GEMINI_API_KEY) {
    logger.warn('GEMINI_API_KEY not set, skipping ideation');
    return [];
  }
  try {
    // 3 ideas x (~90-word script + hook + JSON overhead) fits well under
    // 1200 tokens — output is far shorter now than the old 200-300 word
    // captions, so the budget should shrink with it rather than waste quota.
    const text = await callGemini(buildPrompt(researchItems), 1200);
    return parseIdeasJson(text);
  } catch (err) {
    logger.error({ err }, 'Gemini ideation failed');
    return [];
  }
}

export async function generateAlternativeIdeasWithGemini(researchItems: ResearchSummary[]): Promise<GeneratedIdea[]> {
  if (!process.env.GEMINI_API_KEY) {
    logger.warn('GEMINI_API_KEY not set, skipping alternative-angle ideation');
    return [];
  }
  try {
    const text = await callGemini(buildPrompt(researchItems, { altAngles: true }), 1200, 0.95);
    return parseIdeasJson(text);
  } catch (err) {
    logger.error({ err }, 'Gemini alternative-angle ideation failed');
    return [];
  }
}

const EVERGREEN_HASHTAGS = ['#AI', '#MachineLearning', '#TechTrends', '#AINews', '#FutureOfWork'];
const FALLBACK_TRENDING = ['#AIAgents', '#LLMs', '#GenerativeAI', '#OpenAI', '#Anthropic'];

function deriveNicheHashtags(topic: string): string[] {
  const words = topic
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 5)
    .map((w) => `#${w[0].toUpperCase()}${w.slice(1)}`);
  while (words.length < 5) words.push('#PromptEngineering');
  return Array.from(new Set(words)).slice(0, 5);
}

export async function generateCaptionVariations(topic: string, tone: IdeaTone): Promise<string[]> {
  if (!process.env.GEMINI_API_KEY) {
    logger.warn('GEMINI_API_KEY not set, skipping caption generation');
    return [];
  }
  try {
    const prompt = `Topic: ${topic}\nTone: ${tone}\nPlatform: Instagram\nAudience: people who want to use AI to save time, automate work, and grow their income — not a news audience.\nAngle: every caption must land on a concrete, actionable way to leverage AI for productivity or profit — not just reporting what happened.\n\nWrite 3 distinct caption variations (80-120 words each) for this topic in the given tone. Return ONLY valid JSON (no markdown fences): an array of exactly 3 strings.`;
    const text = await callGemini(prompt, 800);
    const match = text.match(/\[[\s\S]*\]/);
    const parsed = JSON.parse(match ? match[0] : text);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch (err) {
    logger.error({ err }, 'caption generation failed');
    return [];
  }
}

export async function generateHashtags(topic: string): Promise<string[]> {
  const trending = await prisma.hashtagTrending.findMany({
    orderBy: { searchVolume: 'desc' },
    take: 5,
  });
  const trendingTags = Array.from(new Set([...trending.map((t) => t.hashtag), ...FALLBACK_TRENDING])).slice(0, 5);
  const niche = deriveNicheHashtags(topic);
  return Array.from(new Set([...trendingTags, ...EVERGREEN_HASHTAGS, ...niche])).slice(0, 15);
}

export async function persistIdeas(
  ideas: GeneratedIdea[],
  researchItemIds: string[],
  generatedBy: IdeaGeneratedBy
): Promise<ContentIdea[]> {
  return Promise.all(
    ideas.map((idea, index) =>
      prisma.contentIdea.create({
        data: {
          researchItemIds: JSON.stringify(researchItemIds),
          format: idea.format,
          conceptVariation: index + 1,
          aiGeneratedCaption: idea.caption,
          aiHook: idea.hook,
          tone: idea.tone,
          generatedBy,
        },
      })
    )
  );
}

const IDEA_FORMAT_TO_DRAFT_FORMAT: Record<string, string> = {
  reel_hook: 'reel',
  carousel: 'carousel',
  story: 'story',
  caption: 'caption',
};

export async function saveDraft(
  ideaId: string,
  scheduledDate: Date,
  scheduledTime: string,
  overrides: { caption?: string; hashtags?: string[]; title?: string } = {}
): Promise<ContentDraft> {
  const idea = await prisma.contentIdea.findUniqueOrThrow({ where: { id: ideaId } });
  const caption = overrides.caption ?? idea.aiGeneratedCaption;
  const hashtags = overrides.hashtags ?? (await generateHashtags(idea.aiHook));
  return prisma.contentDraft.create({
    data: {
      ideaId: idea.id,
      title: overrides.title ?? idea.aiHook.slice(0, 80),
      caption,
      format: IDEA_FORMAT_TO_DRAFT_FORMAT[idea.format] ?? 'caption',
      hashtags: JSON.stringify(hashtags),
      scheduledDate,
      scheduledTime,
    },
  });
}
