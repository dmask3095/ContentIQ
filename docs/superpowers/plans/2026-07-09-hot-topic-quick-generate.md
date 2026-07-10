# Hot Topic Quick Generate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clicking a Hot Topics card opens a menu (Generate Carousel / Generate Reel / Open Link) instead of navigating immediately; the generate options produce one topic-specific, effectively-framed carousel or catchy 30-second reel script, auto-saved as a draft and shown in a preview modal.

**Architecture:** Two new dedicated Gemini prompts (single-topic carousel / single-topic reel) power a new `generateSingleIdea` function and a new `POST /api/ideation/quick-generate` route that creates a `ContentDraft` directly. The frontend replaces the Hot Topics card's plain link with a popover menu; generation results are shown via a `DraftPreviewModal` extracted from the existing Drafts tab preview so both features share one implementation.

**Tech Stack:** Express + Prisma + Zod (backend), React + Zustand + Tailwind (frontend), Vitest + Supertest (backend tests).

## Global Constraints

- Carousel scripts remain exactly 5 newline-separated slide lines (existing `parseCarouselSlides` / `carouselRenderer.ts` contract — unchanged).
- Reel scripts remain the existing 3-line `HOOK (0-3s): ...` / `BODY (4-25s): ...` / `CTA (26-30s): ...` structure, 75-90 words total.
- Every generated draft is scheduled for today's date at `'09:00'`, matching the existing default used elsewhere in the app.
- No changes to `carouselRenderer.ts` visual templates or to the general Ideation tab (`/api/ideation/generate`) flow.
- Draft format values follow the existing `DraftFormat` union: `'carousel' | 'reel'` (not `'reel_hook'`, which is the internal `ContentFormat`/`GeneratedIdea` value).

---

### Task 1: Extract `serializeDraft` into a shared backend util

**Files:**
- Create: `backend/src/utils/serializeDraft.ts`
- Modify: `backend/src/routes/drafts.ts:1-18`
- Test: none (pure refactor, covered by running the existing backend suite)

**Interfaces:**
- Produces: `serializeDraft(draft: ContentDraft & { publishedPost?: PublishedPost | null }): SerializedDraft` importable from `backend/src/utils/serializeDraft.ts`, used by `drafts.ts` (Task 1) and the new quick-generate route (Task 3).

- [ ] **Step 1: Create the shared util**

Create `backend/src/utils/serializeDraft.ts`:

```ts
import type { ContentDraft, PublishedPost } from '@prisma/client';

export function serializeDraft(draft: ContentDraft & { publishedPost?: PublishedPost | null }) {
  return {
    ...draft,
    hashtags: JSON.parse(draft.hashtags || '[]'),
    carouselSlides: draft.carouselSlides ? JSON.parse(draft.carouselSlides) : null,
  };
}
```

- [ ] **Step 2: Update `drafts.ts` to import it instead of defining it locally**

In `backend/src/routes/drafts.ts`, replace lines 1-18:

```ts
import type { ContentDraft, PublishedPost } from '@prisma/client';
import axios from 'axios';
import { Router } from 'express';
import { z } from 'zod';
import { parseCarouselSlides, renderCarouselZip, renderSlidePng } from '../services/carouselRenderer';
import { generateHashtags, saveDraft } from '../services/ideationEngine';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prisma';

export const draftsRouter = Router();

function serializeDraft(draft: ContentDraft & { publishedPost?: PublishedPost | null }) {
  return {
    ...draft,
    hashtags: JSON.parse(draft.hashtags || '[]'),
    carouselSlides: draft.carouselSlides ? JSON.parse(draft.carouselSlides) : null,
  };
}
```

with:

```ts
import type { ContentDraft } from '@prisma/client';
import axios from 'axios';
import { Router } from 'express';
import { z } from 'zod';
import { parseCarouselSlides, renderCarouselZip, renderSlidePng } from '../services/carouselRenderer';
import { generateHashtags, saveDraft } from '../services/ideationEngine';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prisma';
import { serializeDraft } from '../utils/serializeDraft';

export const draftsRouter = Router();
```

- [ ] **Step 3: Run the backend test suite and typecheck to confirm no regression**

Run: `npm test -w backend`
Expected: all existing tests still pass (no test exercised `serializeDraft` directly, so this confirms nothing else broke).

Run: `npm run typecheck -w backend`
Expected: no errors (confirms `PublishedPost` isn't reported as an unused import and the new util's types line up).

- [ ] **Step 4: Commit**

```bash
git add backend/src/utils/serializeDraft.ts backend/src/routes/drafts.ts
git commit -m "refactor: extract serializeDraft into a shared backend util"
```

---

### Task 2: Add single-topic generation to `ideationEngine.ts`

**Files:**
- Modify: `backend/src/services/ideationEngine.ts`
- Test: Create `backend/src/services/ideationEngine.test.ts`

**Interfaces:**
- Consumes: `ResearchSummary { title: string; snippet: string }` (already defined in this file), `callGemini(prompt, maxOutputTokens, temperature?)` (already defined in this file), `generateHashtags(topic: string): Promise<string[]>` (already defined in this file), `prisma.contentDraft.create` (Prisma client).
- Produces:
  - `export function parseSingleIdeaJson(text: string): Omit<GeneratedIdea, 'format'> | null`
  - `export async function generateSingleIdea(topic: ResearchSummary, format: 'carousel' | 'reel_hook'): Promise<GeneratedIdea | null>`
  - `export async function saveQuickDraft(idea: GeneratedIdea, draftFormat: 'carousel' | 'reel'): Promise<ContentDraft>`
  - These three are consumed by Task 3's new route.

- [ ] **Step 1: Write the failing tests for the pure parsing function**

Create `backend/src/services/ideationEngine.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { parseSingleIdeaJson } from './ideationEngine';

describe('parseSingleIdeaJson', () => {
  it('parses a clean single-object JSON response', () => {
    const text = JSON.stringify({
      hook: 'This AI tool just changed everything',
      script: 'Slide 1\nSlide 2\nSlide 3\nSlide 4\nSlide 5',
      caption: 'Save this for later.',
      tone: 'Hype',
    });
    const result = parseSingleIdeaJson(text);
    expect(result).toEqual({
      hook: 'This AI tool just changed everything',
      script: 'Slide 1\nSlide 2\nSlide 3\nSlide 4\nSlide 5',
      caption: 'Save this for later.',
      tone: 'Hype',
    });
  });

  it('extracts the JSON object even when wrapped in markdown fences or extra text', () => {
    const text = 'Here you go:\n```json\n' + JSON.stringify({
      hook: 'Hook',
      script: 'HOOK (0-3s): Hi.\nBODY (4-25s): Body.\nCTA (26-30s): Follow.',
      caption: 'Caption text.',
      tone: 'Educational',
    }) + '\n```';
    const result = parseSingleIdeaJson(text);
    expect(result).not.toBeNull();
    expect(result?.hook).toBe('Hook');
  });

  it('returns null for malformed JSON', () => {
    expect(parseSingleIdeaJson('not json at all')).toBeNull();
  });

  it('returns null when a required field is missing', () => {
    const text = JSON.stringify({ hook: 'Hook', script: 'Script', tone: 'Hype' });
    expect(parseSingleIdeaJson(text)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -w backend -- ideationEngine.test.ts`
Expected: FAIL with `parseSingleIdeaJson is not exported` / module has no exported member `parseSingleIdeaJson`.

- [ ] **Step 3: Implement the prompts, parser, and generation/save functions**

In `backend/src/services/ideationEngine.ts`, add after the existing `parseIdeasJson` function (after line 60, before `const RETRYABLE_STATUS = ...`):

```ts
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
```

Then add, after the existing `generateAlternativeIdeasWithGemini` function (after line 130, before `const EVERGREEN_HASHTAGS = ...`):

```ts
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
```

Then add, after the existing `saveDraft` function (at the end of the file):

```ts

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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -w backend -- ideationEngine.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck -w backend`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/ideationEngine.ts backend/src/services/ideationEngine.test.ts
git commit -m "feat: add single-topic carousel/reel generation to ideationEngine"
```

---

### Task 3: Add `POST /api/ideation/quick-generate` route

**Files:**
- Modify: `backend/src/routes/ideation.ts`
- Test: Modify `backend/src/routes/ideation.test.ts`

**Interfaces:**
- Consumes: `generateSingleIdea`, `saveQuickDraft` (Task 2), `serializeDraft` (Task 1), `prisma.researchItem.findUnique`.
- Produces: `POST /api/ideation/quick-generate` — request `{ research_item_id: string, format: 'carousel' | 'reel' }`, response `201 { draft: SerializedDraft }` on success, `400` invalid body, `404` research item not found, `502 { error, detail }` on generation failure. Consumed by the frontend's `useQuickGenerate` hook (Task 4).

- [ ] **Step 1: Write the failing tests**

In `backend/src/routes/ideation.test.ts`, replace the `vi.mock('../services/ideationEngine', ...)` block (lines 6-29) with:

```ts
vi.mock('../services/ideationEngine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/ideationEngine')>();
  return {
    ...actual,
    generateIdeasWithGemini: vi.fn(async () => [
      {
        format: 'reel_hook',
        hook: 'Test hook A',
        script: 'HOOK (0-3s): Test.\nBODY (4-25s): Test.\nCTA (26-30s): Test.',
        caption: 'Test caption A',
        tone: 'Educational',
      },
    ]),
    generateAlternativeIdeasWithGemini: vi.fn(async () => [
      {
        format: 'story',
        hook: 'Test hook B',
        script: 'HOOK (0-3s): Test.\nBODY (4-25s): Test.\nCTA (26-30s): Test.',
        caption: 'Test caption B',
        tone: 'Hype',
      },
    ]),
    generateSingleIdea: vi.fn(async (_topic: { title: string; snippet: string }, format: 'carousel' | 'reel_hook') => ({
      format,
      hook: 'Quick hook',
      script:
        format === 'carousel'
          ? 'Slide 1\nSlide 2\nSlide 3\nSlide 4\nSlide 5'
          : 'HOOK (0-3s): Test.\nBODY (4-25s): Test.\nCTA (26-30s): Test.',
      caption: 'Quick caption',
      tone: 'Hype',
    })),
  };
});
```

Then add, at the top of the file, alongside the existing imports (after line 4 `import { prisma } from '../utils/prisma';`):

```ts
import { generateSingleIdea } from '../services/ideationEngine';
```

Then add this new `describe` block at the end of the file, after the existing `describe('POST /api/ideation/generate', ...)` block:

```ts

describe('POST /api/ideation/quick-generate', () => {
  afterAll(async () => {
    await prisma.contentDraft.deleteMany({ where: { title: 'Quick hook' } });
  });

  it('returns 400 for an invalid format', async () => {
    const res = await request(app)
      .post('/api/ideation/quick-generate')
      .send({ research_item_id: researchItemId, format: 'video' });
    expect(res.status).toBe(400);
  });

  it('returns 404 when the research item does not exist', async () => {
    const res = await request(app)
      .post('/api/ideation/quick-generate')
      .send({ research_item_id: 'nonexistent-id', format: 'carousel' });
    expect(res.status).toBe(404);
  });

  it('returns 502 when generation fails', async () => {
    vi.mocked(generateSingleIdea).mockResolvedValueOnce(null);
    const res = await request(app)
      .post('/api/ideation/quick-generate')
      .send({ research_item_id: researchItemId, format: 'carousel' });
    expect(res.status).toBe(502);
  });

  it('creates a carousel draft scheduled for today at 09:00', async () => {
    const res = await request(app)
      .post('/api/ideation/quick-generate')
      .send({ research_item_id: researchItemId, format: 'carousel' });

    expect(res.status).toBe(201);
    expect(res.body.draft.format).toBe('carousel');
    expect(res.body.draft.title).toBe('Quick hook');
    expect(res.body.draft.scheduledTime).toBe('09:00');
    expect(new Date(res.body.draft.scheduledDate).toDateString()).toBe(new Date().toDateString());

    const persisted = await prisma.contentDraft.findUnique({ where: { id: res.body.draft.id } });
    expect(persisted).not.toBeNull();
  });

  it('creates a reel draft', async () => {
    const res = await request(app)
      .post('/api/ideation/quick-generate')
      .send({ research_item_id: researchItemId, format: 'reel' });

    expect(res.status).toBe(201);
    expect(res.body.draft.format).toBe('reel');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -w backend -- ideation.test.ts`
Expected: FAIL — `POST /api/ideation/quick-generate` returns 404 (route doesn't exist yet) instead of the expected statuses.

- [ ] **Step 3: Implement the route**

In `backend/src/routes/ideation.ts`, replace the full file content:

```ts
import { Router } from 'express';
import { z } from 'zod';
import {
  generateAlternativeIdeasWithGemini,
  generateIdeasWithGemini,
  generateSingleIdea,
  persistIdeas,
  saveQuickDraft,
} from '../services/ideationEngine';
import { prisma } from '../utils/prisma';
import { serializeDraft } from '../utils/serializeDraft';

export const ideationRouter = Router();

const generateSchema = z.object({
  research_item_ids: z.array(z.string()).min(1).max(5),
});

ideationRouter.post('/generate', async (req, res) => {
  const parsed = generateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
    return;
  }
  const { research_item_ids } = parsed.data;

  const researchItems = await prisma.researchItem.findMany({
    where: { id: { in: research_item_ids } },
  });
  if (researchItems.length === 0) {
    res.status(404).json({ error: 'No matching research items found' });
    return;
  }

  const summaries = researchItems.map((r) => ({ title: r.title, snippet: r.snippet }));
  const [standardIdeas, altIdeas] = await Promise.all([
    generateIdeasWithGemini(summaries),
    generateAlternativeIdeasWithGemini(summaries),
  ]);

  const [standardSaved, altSaved] = await Promise.all([
    persistIdeas(standardIdeas, research_item_ids, 'gemini'),
    persistIdeas(altIdeas, research_item_ids, 'gemini'),
  ]);

  res.json({ ideas: [...standardSaved, ...altSaved] });
});

const quickGenerateSchema = z.object({
  research_item_id: z.string(),
  format: z.enum(['carousel', 'reel']),
});

ideationRouter.post('/quick-generate', async (req, res) => {
  const parsed = quickGenerateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
    return;
  }
  const { research_item_id, format } = parsed.data;

  const item = await prisma.researchItem.findUnique({ where: { id: research_item_id } });
  if (!item) {
    res.status(404).json({ error: 'Research item not found' });
    return;
  }

  const idea = await generateSingleIdea(
    { title: item.title, snippet: item.snippet },
    format === 'carousel' ? 'carousel' : 'reel_hook'
  );
  if (!idea) {
    res.status(502).json({
      error: 'Generation failed',
      detail: 'Check Gemini API key in Settings, or try again (free tier can be busy)',
    });
    return;
  }

  const draft = await saveQuickDraft(idea, format);
  res.status(201).json({ draft: serializeDraft(draft) });
});
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -w backend -- ideation.test.ts`
Expected: PASS (7 tests: 2 existing + 5 new).

- [ ] **Step 5: Run the full backend suite and typecheck**

Run: `npm test -w backend`
Expected: all tests pass.

Run: `npm run typecheck -w backend`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/ideation.ts backend/src/routes/ideation.test.ts
git commit -m "feat: add POST /api/ideation/quick-generate route"
```

---

### Task 4: Add `useQuickGenerate` frontend hook

**Files:**
- Modify: `frontend/src/hooks/useIdeation.ts`

**Interfaces:**
- Consumes: `useAppStore((s) => s.addContentDraft)` (already exists in `frontend/src/store/useAppStore.ts`), `api.post` (`frontend/src/utils/api.ts`), `ContentDraft` type (`frontend/src/types/index.ts`).
- Produces: `useQuickGenerate(): { generate: (researchItemId: string, format: 'carousel' | 'reel') => Promise<ContentDraft>; loading: 'carousel' | 'reel' | null }`, consumed by `HotTopicsTab.tsx` (Task 7).

- [ ] **Step 1: Replace the file content**

Replace all of `frontend/src/hooks/useIdeation.ts`:

```ts
import { useCallback, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { ContentDraft, ContentIdea } from '../types';
import { api } from '../utils/api';

export function useGenerateIdeas() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (researchItemIds: string[]) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<{ ideas: ContentIdea[] }>('/api/ideation/generate', {
        research_item_ids: researchItemIds,
      });
      return res.data.ideas;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate ideas';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { generate, loading, error };
}

export function useQuickGenerate() {
  const addContentDraft = useAppStore((s) => s.addContentDraft);
  const [loading, setLoading] = useState<'carousel' | 'reel' | null>(null);

  const generate = useCallback(
    async (researchItemId: string, format: 'carousel' | 'reel') => {
      setLoading(format);
      try {
        const res = await api.post<{ draft: ContentDraft }>('/api/ideation/quick-generate', {
          research_item_id: researchItemId,
          format,
        });
        addContentDraft(res.data.draft);
        return res.data.draft;
      } finally {
        setLoading(null);
      }
    },
    [addContentDraft]
  );

  return { generate, loading };
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck -w frontend`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useIdeation.ts
git commit -m "feat: add useQuickGenerate hook"
```

---

### Task 5: Extract `DraftPreviewModal` and add reel script display

**Files:**
- Create: `frontend/src/components/Common/DraftPreviewModal.tsx`
- Modify: `frontend/src/components/DraftsTab/DraftCard.tsx`

**Interfaces:**
- Consumes: `Modal` (`frontend/src/components/Common/Modal.tsx`), `useToast` (`frontend/src/components/Common/Toast.tsx`), `ContentDraft` type, `api` (`frontend/src/utils/api.ts`).
- Produces: `export function FORMAT_ICONS` from `DraftCard.tsx` (imported by `DraftPreviewModal.tsx`); `export function DraftPreviewModal({ draft: ContentDraft; onClose: () => void })` from `Common/DraftPreviewModal.tsx`, consumed by `DraftCard.tsx` (this task) and `HotTopicsTab.tsx` (Task 7).

- [ ] **Step 1: Export `FORMAT_ICONS` from `DraftCard.tsx`**

In `frontend/src/components/DraftsTab/DraftCard.tsx`, replace line 8:

```ts
const FORMAT_ICONS: Record<string, string> = { reel: '🎬', carousel: '🖼️', story: '⚡', caption: '📝' };
```

with:

```ts
export const FORMAT_ICONS: Record<string, string> = { reel: '🎬', carousel: '🖼️', story: '⚡', caption: '📝' };
```

- [ ] **Step 2: Create `DraftPreviewModal.tsx`**

Create `frontend/src/components/Common/DraftPreviewModal.tsx`:

```tsx
import { useState } from 'react';
import { FORMAT_ICONS } from '../DraftsTab/DraftCard';
import { Modal } from './Modal';
import { useToast } from './Toast';
import type { ContentDraft } from '../../types';
import { api } from '../../utils/api';

interface DraftPreviewModalProps {
  draft: ContentDraft;
  onClose: () => void;
}

// Mirrors the backend's parseCarouselSlides line-splitting just to get a
// slide count for the prev/next indicator -- the actual rendered text and
// prefix-stripping happen server-side when the image is fetched.
function countSlides(script: string | null): number {
  if (!script) return 0;
  return script.split('\n').filter((line) => line.trim().length > 0).length;
}

async function downloadBlob(url: string, filename: string) {
  const res = await api.get(url, { responseType: 'blob' });
  const blobUrl = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(blobUrl);
}

export function DraftPreviewModal({ draft, onClose }: DraftPreviewModalProps) {
  const { showToast } = useToast();
  const [slideIndex, setSlideIndex] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const isCarousel = draft.format === 'carousel' && !!draft.script;
  const slideCount = isCarousel ? countSlides(draft.script) : 0;
  const hasScript = !isCarousel && !!draft.script;

  const handleDownloadZip = async () => {
    setDownloading(true);
    try {
      await downloadBlob(`/api/drafts/${draft.id}/carousel.zip`, `${draft.title.slice(0, 40)}-carousel.zip`);
    } catch {
      showToast('Failed to download carousel images', 'error');
    } finally {
      setDownloading(false);
    }
  };

  const handlePublishInstagram = async () => {
    setPublishing(true);
    try {
      await api.post(`/api/drafts/${draft.id}/publish/instagram`);
      showToast('Posted to Instagram!', 'success');
    } catch (err) {
      const detail =
        (err as { response?: { data?: { detail?: string; error?: string } } }).response?.data?.detail ??
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ??
        'Instagram publish failed';
      showToast(detail, 'error');
    } finally {
      setPublishing(false);
    }
  };

  const handleCopyScript = async () => {
    if (!draft.script) return;
    await navigator.clipboard.writeText(draft.script);
    showToast('Script copied', 'success');
  };

  return (
    <Modal title="Instagram Preview" onClose={onClose} widthClassName="max-w-sm">
      <div className="rounded-lg border border-slate-200 p-3">
        <div className="mb-2 flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
          <span className="text-sm font-semibold">contentiq.app</span>
        </div>

        {isCarousel ? (
          <div className="mb-2">
            <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded bg-slate-100">
              <img
                src={`${api.defaults.baseURL}/api/drafts/${draft.id}/carousel/${slideIndex}`}
                alt={`Slide ${slideIndex + 1}`}
                className="h-full w-full object-cover"
              />
              {slideIndex > 0 && (
                <button
                  onClick={() => setSlideIndex((i) => i - 1)}
                  className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full bg-black/40 px-2 py-1 text-sm text-white"
                >
                  ‹
                </button>
              )}
              {slideIndex < slideCount - 1 && (
                <button
                  onClick={() => setSlideIndex((i) => i + 1)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-black/40 px-2 py-1 text-sm text-white"
                >
                  ›
                </button>
              )}
            </div>
            <p className="mt-1 text-center text-xs text-slate-400">
              Slide {slideIndex + 1} / {slideCount}
            </p>
          </div>
        ) : hasScript ? (
          <div className="mb-2 rounded border border-slate-200 bg-slate-50 p-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              🎤 Script — read this out loud while filming
            </p>
            <p className="whitespace-pre-wrap text-sm text-slate-800">{draft.script}</p>
            <button onClick={handleCopyScript} className="mt-2 text-xs font-medium text-blue-600">
              Copy script
            </button>
          </div>
        ) : (
          <div className="mb-2 flex h-48 items-center justify-center rounded bg-slate-100 text-4xl">
            {FORMAT_ICONS[draft.format] ?? '📝'}
          </div>
        )}

        <p className="whitespace-pre-wrap text-sm">{draft.caption}</p>
        <p className="mt-2 text-sm text-blue-600">{draft.hashtags.join(' ')}</p>

        {isCarousel && (
          <div className="mt-3 flex flex-col gap-2">
            <button
              onClick={handleDownloadZip}
              disabled={downloading}
              className="w-full rounded bg-slate-900 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              {downloading ? 'Zipping…' : 'Download all slides (ZIP)'}
            </button>
            {draft.status !== 'published' && (
              <button
                onClick={handlePublishInstagram}
                disabled={publishing}
                className="w-full rounded bg-gradient-to-r from-violet-500 to-pink-500 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {publishing ? 'Posting to Instagram…' : 'Post to Instagram'}
              </button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
```

- [ ] **Step 3: Update `DraftCard.tsx` to use the extracted modal**

In `frontend/src/components/DraftsTab/DraftCard.tsx`, replace the full file content:

```tsx
import { useState } from 'react';
import { DraftPreviewModal } from '../Common/DraftPreviewModal';
import { useToast } from '../Common/Toast';
import type { ContentDraft } from '../../types';
import { api } from '../../utils/api';
import { timeAgo, truncate } from '../../utils/formatters';

export const FORMAT_ICONS: Record<string, string> = { reel: '🎬', carousel: '🖼️', story: '⚡', caption: '📝' };
const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  scheduled: 'bg-blue-100 text-blue-700',
  published: 'bg-emerald-100 text-emerald-700',
};

interface DraftCardProps {
  draft: ContentDraft;
  onEdit: (draft: ContentDraft) => void;
  onDelete: (id: string) => void;
}

async function downloadBlob(url: string, filename: string) {
  const res = await api.get(url, { responseType: 'blob' });
  const blobUrl = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(blobUrl);
}

export function DraftCard({ draft, onEdit, onDelete }: DraftCardProps) {
  const { showToast } = useToast();
  const [showPreview, setShowPreview] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const isCarousel = draft.format === 'carousel' && !!draft.script;

  const handleDownloadZip = async () => {
    setDownloading(true);
    try {
      await downloadBlob(`/api/drafts/${draft.id}/carousel.zip`, `${truncate(draft.title, 40)}-carousel.zip`);
    } catch {
      showToast('Failed to download carousel images', 'error');
    } finally {
      setDownloading(false);
    }
  };

  const handlePublishInstagram = async () => {
    setPublishing(true);
    try {
      await api.post(`/api/drafts/${draft.id}/publish/instagram`);
      showToast('Posted to Instagram!', 'success');
    } catch (err) {
      const detail =
        (err as { response?: { data?: { detail?: string; error?: string } } }).response?.data?.detail ??
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ??
        'Instagram publish failed';
      showToast(detail, 'error');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-lg">{FORMAT_ICONS[draft.format] ?? '📝'}</span>
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[draft.status]}`}>{draft.status}</span>
      </div>
      <p className="font-semibold text-slate-900">{truncate(draft.title, 80)}</p>
      <p className="text-sm text-slate-500">{truncate(draft.caption, 100)}</p>
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>
          {new Date(draft.scheduledDate).toLocaleDateString()} at {draft.scheduledTime}
        </span>
        <span>Updated {timeAgo(draft.updatedAt)}</span>
      </div>
      <div className="mt-1 flex flex-wrap gap-2">
        <button
          onClick={() => onEdit(draft)}
          className="rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700"
        >
          Edit
        </button>
        <button
          onClick={() => setShowPreview(true)}
          className="rounded bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
        >
          Preview
        </button>
        {isCarousel && (
          <button
            onClick={handleDownloadZip}
            disabled={downloading}
            className="rounded bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
          >
            {downloading ? 'Zipping…' : 'Download images'}
          </button>
        )}
        {draft.status !== 'published' && (
          <button
            onClick={handlePublishInstagram}
            disabled={publishing}
            className="rounded bg-gradient-to-r from-violet-500 to-pink-500 px-2.5 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {publishing ? 'Posting…' : 'Post to Instagram'}
          </button>
        )}
        {draft.status === 'published' && (
          <span className="rounded bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
            Published
          </span>
        )}
        <button
          onClick={() => onDelete(draft.id)}
          className="rounded bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
        >
          Delete
        </button>
      </div>

      {showPreview && <DraftPreviewModal draft={draft} onClose={() => setShowPreview(false)} />}
    </div>
  );
}
```

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck -w frontend`
Expected: no errors.

- [ ] **Step 5: Manually verify no regression in the Drafts tab**

Run: `npm run dev` (from repo root)
In the browser, open the Drafts tab, click "Preview" on an existing carousel draft — confirm the slide viewer, download-ZIP, and publish buttons still work exactly as before. If any draft has a non-carousel format with a script, confirm its preview now shows the script text with a "Copy script" button instead of the old icon placeholder.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/Common/DraftPreviewModal.tsx frontend/src/components/DraftsTab/DraftCard.tsx
git commit -m "refactor: extract DraftPreviewModal and show reel scripts in preview"
```

---

### Task 6: Create the `HotTopicActions` popover component

**Files:**
- Create: `frontend/src/components/HotTopicsTab/HotTopicActions.tsx`

**Interfaces:**
- Consumes: `ResearchItem` type (`frontend/src/types/index.ts`).
- Produces: `export function HotTopicActions({ item: ResearchItem; loading: 'carousel' | 'reel' | null; onGenerate: (format: 'carousel' | 'reel') => void; onClose: () => void })`, consumed by `HotTopicsTab.tsx` (Task 7).

- [ ] **Step 1: Create the component**

Create `frontend/src/components/HotTopicsTab/HotTopicActions.tsx`:

```tsx
import { useEffect, useRef } from 'react';
import type { ResearchItem } from '../../types';

interface HotTopicActionsProps {
  item: ResearchItem;
  loading: 'carousel' | 'reel' | null;
  onGenerate: (format: 'carousel' | 'reel') => void;
  onClose: () => void;
}

export function HotTopicActions({ item, loading, onGenerate, onClose }: HotTopicActionsProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleOpenLink = () => {
    window.open(item.fullUrl, '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <div
      ref={ref}
      className="absolute right-2 top-10 z-20 flex w-48 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
    >
      <button
        onClick={() => onGenerate('carousel')}
        disabled={loading !== null}
        className="px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        {loading === 'carousel' ? 'Generating…' : '🖼️ Generate Carousel'}
      </button>
      <button
        onClick={() => onGenerate('reel')}
        disabled={loading !== null}
        className="border-t border-slate-100 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        {loading === 'reel' ? 'Generating…' : '🎬 Generate Reel'}
      </button>
      <button
        onClick={handleOpenLink}
        disabled={loading !== null}
        className="border-t border-slate-100 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        🔗 Open Link
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck -w frontend`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/HotTopicsTab/HotTopicActions.tsx
git commit -m "feat: add HotTopicActions popover component"
```

---

### Task 7: Wire the popover and preview modal into `HotTopicsTab.tsx`

**Files:**
- Modify: `frontend/src/components/HotTopicsTab/HotTopicsTab.tsx`

**Interfaces:**
- Consumes: `useQuickGenerate` (Task 4), `DraftPreviewModal` (Task 5), `HotTopicActions` (Task 6).

- [ ] **Step 1: Replace the file content**

Replace all of `frontend/src/components/HotTopicsTab/HotTopicsTab.tsx`:

```tsx
import { useCallback, useEffect, useState } from 'react';
import { DraftPreviewModal } from '../Common/DraftPreviewModal';
import { LoadingSpinner } from '../Common/LoadingSpinner';
import { useToast } from '../Common/Toast';
import { useQuickGenerate } from '../../hooks/useIdeation';
import type { ContentDraft, ResearchItem } from '../../types';
import { api } from '../../utils/api';
import { timeAgo } from '../../utils/formatters';
import { HotTopicActions } from './HotTopicActions';

const SOURCE_LABELS: Record<string, string> = {
  hn: 'Hacker News',
  reddit: 'Reddit',
  google: 'Google',
  youtube: 'YouTube',
  techcrunch: 'TechCrunch',
  blog: 'Blog',
  rss: 'RSS',
};

const CATEGORY_COLORS: Record<string, string> = {
  'AI News': 'bg-violet-100 text-violet-700',
  'AI Tools': 'bg-blue-100 text-blue-700',
  Trends: 'bg-orange-100 text-orange-700',
  Tips: 'bg-emerald-100 text-emerald-700',
  Other: 'bg-slate-100 text-slate-600',
};

function hoursAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60));
}

function HeatBadge({ hours }: { hours: number }) {
  if (hours <= 3) return <span className="rounded bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white">BREAKING</span>;
  if (hours <= 12) return <span className="rounded bg-orange-500 px-2 py-0.5 text-[11px] font-bold text-white">HOT</span>;
  return <span className="rounded bg-yellow-400 px-2 py-0.5 text-[11px] font-bold text-slate-800">RECENT</span>;
}

export function HotTopicsTab() {
  const [items, setItems] = useState<ResearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [previewDraft, setPreviewDraft] = useState<ContentDraft | null>(null);
  const { showToast } = useToast();
  const { generate, loading: generating } = useQuickGenerate();

  const fetchHot = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ items: ResearchItem[]; total: number }>('/api/research', {
        params: { hot: 'true', limit: 50 },
      });
      setItems(res.data.items);
    } catch {
      setError('Failed to load hot topics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHot();
  }, [fetchHot]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await api.post('/api/research/refresh');
      await fetchHot();
      showToast('Research updated', 'success');
    } catch {
      showToast('Refresh failed — check API keys in Settings', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const handleGenerate = async (item: ResearchItem, format: 'carousel' | 'reel') => {
    try {
      const draft = await generate(item.id, format);
      setOpenMenuId(null);
      setPreviewDraft(draft);
      showToast(`${format === 'carousel' ? 'Carousel' : 'Reel script'} generated and saved as a draft`, 'success');
    } catch (err) {
      const detail =
        (err as { response?: { data?: { detail?: string; error?: string } } }).response?.data?.detail ??
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ??
        'Generation failed';
      showToast(detail, 'error');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Hot Topics</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Content published in the last 48 hours — trending news, releases, and updates in your niche.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {refreshing ? 'Fetching…' : 'Refresh Now'}
        </button>
      </div>

      {/* Flame legend */}
      <div className="flex gap-4 px-1 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">BREAKING</span>
          under 3h
        </span>
        <span className="flex items-center gap-1.5">
          <span className="rounded bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold text-white">HOT</span>
          3–12h
        </span>
        <span className="flex items-center gap-1.5">
          <span className="rounded bg-yellow-400 px-1.5 py-0.5 text-[10px] font-bold text-slate-800">RECENT</span>
          12–48h
        </span>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <LoadingSpinner label="Loading hot topics…" />
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center">
          <p className="text-sm font-medium text-slate-700">No hot topics in the last 48 hours</p>
          <p className="mt-1 text-xs text-slate-400">
            Hit "Refresh Now" to fetch the latest content from all sources.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const age = hoursAgo(item.publishedAt);
            return (
              <div key={item.id} className="relative">
                <button
                  type="button"
                  onClick={() => setOpenMenuId((id) => (id === item.id ? null : item.id))}
                  className="flex w-full flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md"
                >
                  {/* Top row */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.Other}`}
                    >
                      {item.category}
                    </span>
                    <HeatBadge hours={age} />
                  </div>

                  {/* Title */}
                  <p className="font-semibold leading-snug text-slate-900 line-clamp-3">{item.title}</p>

                  {/* Snippet */}
                  {item.snippet && (
                    <p className="text-xs leading-relaxed text-slate-500 line-clamp-2">{item.snippet}</p>
                  )}

                  {/* Footer */}
                  <div className="mt-auto flex items-center justify-between pt-1 text-xs text-slate-400">
                    <span>{SOURCE_LABELS[item.source] ?? item.source}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-indigo-600">{item.relevanceScore.toFixed(1)}</span>
                      <span>{timeAgo(item.publishedAt)}</span>
                    </div>
                  </div>
                </button>
                {openMenuId === item.id && (
                  <HotTopicActions
                    item={item}
                    loading={generating}
                    onGenerate={(format) => handleGenerate(item, format)}
                    onClose={() => setOpenMenuId(null)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {previewDraft && <DraftPreviewModal draft={previewDraft} onClose={() => setPreviewDraft(null)} />}
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck -w frontend`
Expected: no errors.

- [ ] **Step 3: Manually verify the full flow in the browser**

Run: `npm run dev` (from repo root — starts both backend and frontend)

In the browser:
1. Open the Hot Topics tab. Click a card — confirm a popover appears with "Generate Carousel", "Generate Reel", "Open Link" instead of navigating away.
2. Click "Open Link" — confirm it opens the source URL in a new tab, same as before.
3. Click "Generate Carousel" on a card — confirm the button shows "Generating…", then a preview modal opens showing 5 carousel slide images with prev/next navigation, download-ZIP, and (if Instagram env vars are configured) publish button.
4. Click "Generate Reel" on a card — confirm the preview modal shows the HOOK/BODY/CTA script text with a "Copy script" button, and the caption below it.
5. Open the Drafts tab — confirm both generated items appear there as drafts scheduled for today at 09:00.
6. If `GEMINI_API_KEY` is not set, confirm clicking either generate option shows an error toast ("Check Gemini API key...") instead of a blank/broken state.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/HotTopicsTab/HotTopicsTab.tsx
git commit -m "feat: wire Hot Topics popover menu to quick-generate and preview modal"
```
