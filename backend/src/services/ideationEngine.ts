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
  script: string;
  caption: string;
  tone: IdeaTone;
}

interface ResearchSummary {
  title: string;
  snippet: string;
}

// "script" and "caption" are deliberately separate fields with different
// jobs: script is the literal word-for-word thing the user speaks/shows on
// screen while filming; caption is the text that goes in the Instagram post
// description box once it's published. Conflating them (the old version put
// the script in the "caption" field) meant there was no real Instagram
// caption at all -- just the script with nowhere for reach-driving copy to
// live.
function buildPrompt(items: ResearchSummary[], opts: { altAngles?: boolean } = {}): string {
  const topic = items.map((i) => `- ${i.title}: ${i.snippet}`).join('\n');
  const angleNote = opts.altAngles
    ? '\nFocus on alternative angles and viral, scroll-stopping hooks rather than a standard educational take.'
    : '';
  return `Topic:\n${topic}\n\nTarget Audience: People who want to use AI to save time, automate busywork, and grow their income or business — professionals, freelancers, side-hustlers, small business owners, students, and office workers looking to make their tasks and work more efficient, effective, and productive.\nPlatform: Instagram\nAngle: This is NOT a news channel. Every idea must answer "how does this help someone leverage AI to do more, faster, or for more profit?" Skip pure announcements with no practical takeaway.${angleNote}\n\nGenerate 3 content ideas for this topic. For each idea, return these fields:\n\n- "format": one of "reel_hook", "carousel", "story", "caption"\n\n- "hook": the opening line/first thing seen or heard (1-2 lines) — curiosity-driven, leads with the payoff\n\n- "script": the literal thing the user reads aloud or shows on screen while filming. Rules by format:\n  - "reel_hook" or "story": a COMPLETE, word-for-word spoken voiceover script sized for a 30-second video, 75-90 words total, written as natural spoken sentences (contractions, short clauses, no bullet points or markdown — it has to sound like a person talking, not an essay). Structure it as exactly three labeled lines:\n    HOOK (0-3s): <scroll-stopping opening line, restates the hook>\n    BODY (4-25s): <2-4 short, punchy, concrete sentences delivering the actual steps/value — the substance of the video>\n    CTA (26-30s): <one line telling the viewer to follow, save, or comment>\n  - "carousel": exactly 5 lines separated by "\\n", one per slide, 15-25 words each: slide 1 is the cover/hook, slides 2-4 are each one concrete actionable point, slide 5 is a save/share/follow CTA\n  - "caption": leave this as an empty string "" — there's no separate on-screen script for a caption-only post, the caption itself is the content\n\n- "caption": the actual text that goes in the Instagram post's caption box — NOT the script, even for reel_hook/story/carousel. This is what drives discovery and reach, so:\n  - Open with a 1-line hook restating the value in plain language\n  - 2-3 sentences naturally weaving in specific, searchable keywords related to AI, automation, and productivity/profit (real sentences, not a hashtag dump) so Instagram's algorithm and search can match it to people who'd want it\n  - End with exactly ONE explicit call-to-action that drives the engagement signals Instagram's algorithm weights most — saves, shares, or comments (e.g. "Save this for later", "Share with someone who needs this", "Comment 'GUIDE' and I'll send it over") — pick whichever fits the content best\n  - 80-120 words total, no hashtags (those are generated separately)\n\n- "tone": one of "Educational", "Breaking", "Opinion", "Hype"\n\nReturn ONLY valid JSON (no markdown fences), an array shaped exactly like:\n[{ "format": "reel_hook", "hook": "...", "script": "HOOK (0-3s): ...\\nBODY (4-25s): ...\\nCTA (26-30s): ...", "caption": "...", "tone": "Educational" }]`;
}

function isValidIdea(x: unknown): x is GeneratedIdea {
  if (!x || typeof x !== 'object') return false;
  const i = x as Record<string, unknown>;
  return (
    typeof i.format === 'string' &&
    typeof i.hook === 'string' &&
    typeof i.script === 'string' &&
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

function buildCarouselPrompt(topic: ResearchSummary): string {
  return `Topic: ${topic.title}: ${topic.snippet}\n\nTarget Audience: People who want to use AI to save time, automate busywork, and grow their income or business — professionals, freelancers, side-hustlers, small business owners, students, and office workers looking to make their tasks and work more efficient, effective, and productive.\nPlatform: Instagram carousel post\nAngle: This is NOT a news channel. The carousel must answer "how does this help someone leverage AI to do more, faster, or for more profit?"\n\nGenerate exactly ONE highly effective 5-slide carousel for this specific topic. Return these fields:\n\n- "hook": the cover slide's opening line (1-2 lines) — curiosity-driven, leads with the payoff\n\n- "script": exactly 5 lines separated by "\\n", one per slide, 15-25 words each:\n  - slide 1 (cover): a scroll-stopping hook that frames the topic's stakes or promise — why should someone care right now\n  - slides 2-4: each one concrete, specific, actionable point (not a vague recap of the news) — the real substance\n  - slide 5: a save/share/follow CTA\n\n- "caption": the Instagram post caption (NOT the slide script) — 80-120 words, opens with a 1-line hook, weaves in searchable AI/automation/productivity keywords in 2-3 natural sentences, ends with exactly ONE explicit save/share/comment CTA, no hashtags\n\n- "tone": one of "Educational", "Breaking", "Opinion", "Hype"\n\nReturn ONLY valid JSON (no markdown fences), a single object shaped exactly like:\n{ "hook": "...", "script": "slide 1 text\\nslide 2 text\\nslide 3 text\\nslide 4 text\\nslide 5 text", "caption": "...", "tone": "Educational" }`;
}

function buildReelPrompt(topic: ResearchSummary): string {
  return `Topic: ${topic.title}: ${topic.snippet}\n\nTarget Audience: People who want to use AI to save time, automate busywork, and grow their income or business — professionals, freelancers, side-hustlers, small business owners, students, and office workers looking to make their tasks and work more efficient, effective, and productive.\nPlatform: Instagram Reel, 30 seconds\nAngle: This is NOT a news channel. The reel must answer "how does this help someone leverage AI to do more, faster, or for more profit?"\n\nGenerate exactly ONE highly trendable, highly catchy, attention-grabbing 30-second reel script for this specific topic. This has to genuinely stop the scroll and hold attention for the full 30 seconds — not a plain summary of the news. Use a pattern-interrupt opening and a curiosity gap, punchy short sentences, natural spoken language (contractions, no bullet points or markdown). Return these fields:\n\n- "hook": the opening line/first thing seen or heard (1-2 lines)\n\n- "script": a COMPLETE, word-for-word spoken voiceover script, 75-90 words total, structured as exactly three labeled lines:\n  HOOK (0-3s): <scroll-stopping, pattern-interrupt opening line>\n  BODY (4-25s): <2-4 short, punchy, concrete sentences delivering the actual steps/value>\n  CTA (26-30s): <one line telling the viewer to follow, save, or comment>\n\n- "caption": the Instagram post caption (NOT the script) — 80-120 words, opens with a 1-line hook, weaves in searchable AI/automation/productivity keywords in 2-3 natural sentences, ends with exactly ONE explicit save/share/comment CTA, no hashtags\n\n- "tone": one of "Educational", "Breaking", "Opinion", "Hype"\n\nReturn ONLY valid JSON (no markdown fences), a single object shaped exactly like:\n{ "hook": "...", "script": "HOOK (0-3s): ...\\nBODY (4-25s): ...\\nCTA (26-30s): ...", "caption": "...", "tone": "Hype" }`;
}

function isValidSingleIdea(x: unknown): x is Omit<GeneratedIdea, 'format'> {
  if (!x || typeof x !== 'object') return false;
  const i = x as Record<string, unknown>;
  return (
    typeof i.hook === 'string' &&
    typeof i.script === 'string' &&
    typeof i.caption === 'string' &&
    typeof i.tone === 'string'
  );
}

export function parseSingleIdeaJson(text: string): Omit<GeneratedIdea, 'format'> | null {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : text);
    return isValidSingleIdea(parsed) ? parsed : null;
  } catch (err) {
    logger.warn({ err, text: text.slice(0, 200) }, 'failed to parse single-idea JSON');
    return null;
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
    // 3 ideas x (~90-word script + ~100-word caption + hook + JSON overhead)
    // runs close to 1000 tokens on its own now that script and caption are
    // separate fields, so the budget needs real headroom above that.
    const text = await callGemini(buildPrompt(researchItems), 2200);
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
    const text = await callGemini(buildPrompt(researchItems, { altAngles: true }), 2200, 0.95);
    return parseIdeasJson(text);
  } catch (err) {
    logger.error({ err }, 'Gemini alternative-angle ideation failed');
    return [];
  }
}

export async function generateSingleIdea(
  topic: ResearchSummary,
  format: 'carousel' | 'reel_hook'
): Promise<GeneratedIdea | null> {
  if (!process.env.GEMINI_API_KEY) {
    logger.warn('GEMINI_API_KEY not set, skipping quick generation');
    return null;
  }
  try {
    const prompt = format === 'carousel' ? buildCarouselPrompt(topic) : buildReelPrompt(topic);
    const text = await callGemini(prompt, 1000);
    const parsed = parseSingleIdeaJson(text);
    return parsed ? { ...parsed, format } : null;
  } catch (err) {
    logger.error({ err, format }, 'quick idea generation failed');
    return null;
  }
}

const EVERGREEN_HASHTAGS = ['#AI', '#MachineLearning', '#TechTrends', '#AINews', '#FutureOfWork'];
const FALLBACK_TRENDING = ['#AIAgents', '#LLMs', '#GenerativeAI', '#OpenAI', '#Anthropic'];

// A curated pool of always-relevant niche hashtags for the AI tools /
// automation / creator-economy space. Used to supplement trending tags so
// every post gets 15 solid, real hashtags without Gemini involvement.
const NICHE_HASHTAG_POOL = [
  '#AITools', '#AIProductivity', '#ArtificialIntelligence',
  '#AutomateYourBusiness', '#WorkSmarter', '#AIForCreators',
  '#ContentCreation', '#CreatorEconomy', '#InstagramReels',
  '#SideHustle', '#PassiveIncome', '#AIAutomation',
  '#PromptEngineering', '#ChatGPT', '#TechForCreators',
];

export async function generateCaptionVariations(topic: string, tone: IdeaTone): Promise<string[]> {
  if (!process.env.GEMINI_API_KEY) {
    logger.warn('GEMINI_API_KEY not set, skipping caption generation');
    return [];
  }
  try {
    const prompt = `Topic: ${topic}\nTone: ${tone}\nPlatform: Instagram\nAudience: professionals, freelancers, side-hustlers, small business owners, students, and office workers who want to use AI to save time, automate busywork, and grow their income, business, or productivity — not a news audience.\nAngle: every caption must land on a concrete, actionable way to leverage AI for productivity or profit — not just reporting what happened.\n\nWrite 3 distinct Instagram caption variations (80-120 words each) for this topic in the given tone. Each one needs to actually drive reach, not just describe the topic:\n- Open with a 1-line hook in plain language\n- 2-3 sentences naturally weaving in specific, searchable keywords related to AI, automation, and productivity/profit (real sentences, not a hashtag dump) so Instagram's algorithm and search can match it to people who'd want it\n- End with exactly ONE explicit call-to-action that drives saves, shares, or comments (e.g. "Save this for later", "Share with someone who needs this", "Comment 'GUIDE' and I'll send it over") — whichever fits the content best\n- No hashtags (those are generated separately)\n\nReturn ONLY valid JSON (no markdown fences): an array of exactly 3 strings.`;
    const text = await callGemini(prompt, 800);
    const match = text.match(/\[[\s\S]*\]/);
    const parsed = JSON.parse(match ? match[0] : text);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch (err) {
    logger.error({ err }, 'caption generation failed');
    return [];
  }
}

export async function generateHashtags(_topic: string): Promise<string[]> {
  const trending = await prisma.hashtagTrending.findMany({
    orderBy: { searchVolume: 'desc' },
    take: 5,
  });
  const trendingTags = Array.from(new Set([...trending.map((t) => t.hashtag), ...FALLBACK_TRENDING])).slice(0, 5);
  // Combine trending + evergreen + niche pool; topic-word-splitting was removed
  // because it produced junk hashtags from verb-heavy hook sentences.
  return Array.from(new Set([...trendingTags, ...EVERGREEN_HASHTAGS, ...NICHE_HASHTAG_POOL])).slice(0, 15);
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
          aiScript: idea.script,
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
  overrides: { caption?: string; script?: string; hashtags?: string[]; title?: string } = {}
): Promise<ContentDraft> {
  const idea = await prisma.contentIdea.findUniqueOrThrow({ where: { id: ideaId } });
  const caption = overrides.caption ?? idea.aiGeneratedCaption;
  const script = overrides.script ?? idea.aiScript;
  const hashtags = overrides.hashtags ?? (await generateHashtags(idea.aiHook));
  return prisma.contentDraft.create({
    data: {
      ideaId: idea.id,
      title: overrides.title ?? idea.aiHook.slice(0, 80),
      caption,
      script: script || null,
      format: IDEA_FORMAT_TO_DRAFT_FORMAT[idea.format] ?? 'caption',
      hashtags: JSON.stringify(hashtags),
      scheduledDate,
      scheduledTime,
    },
  });
}

export async function saveQuickDraft(idea: GeneratedIdea, draftFormat: 'carousel' | 'reel'): Promise<ContentDraft> {
  const hashtags = await generateHashtags(idea.hook);
  return prisma.contentDraft.create({
    data: {
      title: idea.hook.slice(0, 80),
      caption: idea.caption,
      script: idea.script || null,
      format: draftFormat,
      hashtags: JSON.stringify(hashtags),
      scheduledDate: new Date(),
      scheduledTime: '09:00',
    },
  });
}
