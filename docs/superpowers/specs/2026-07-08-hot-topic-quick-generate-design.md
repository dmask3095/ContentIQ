# Hot Topic Quick Generate — Design

## Problem

Today, clicking a Hot Topics card immediately opens the source URL in a new tab. There's no way to go straight from a trending topic to a piece of content. The user wants clicking a card to offer a choice: generate a carousel, generate a reel script, or open the link as before.

## Goals

- Clicking a Hot Topics card shows a menu with three options: Generate Carousel, Generate Reel, Open Link.
- "Generate Carousel" produces one effectively-framed 5-slide carousel for that specific topic — strong hook slide, concrete payoff slides, strong CTA slide — using the carousel visual template that already exists.
- "Generate Reel" produces one 30-second script optimized to be catchy and attention-grabbing (pattern-interrupt hook, punchy body, strong CTA), not just an informational summary.
- "Open Link" behaves exactly as today.
- Each generation is a single, immediately-usable result (no picking between variations) and is auto-saved as a `ContentDraft` so it shows up in the Drafts tab for scheduling/editing/publishing.

## Non-goals

- No changes to the carousel PNG rendering/visual templates (`carouselRenderer.ts`) — those are already polished and reused as-is.
- No changes to the general Ideation tab flow (multi-idea generation from selected research items) — this is a separate, parallel one-shot flow.
- No video generation — "reel" output remains a text script, matching how reels work everywhere else in the app today.

## Backend

### New prompts (`backend/src/services/ideationEngine.ts`)

Two new dedicated single-topic prompt builders, distinct from the existing multi-idea `buildPrompt`:

- `buildCarouselPrompt(topic: ResearchSummary)` — requests exactly one carousel JSON object (`hook`, `script`, `caption`, `tone`) where `script` is the existing 5-line-slides format. Instructs: slide 1 is a scroll-stopping hook framing the topic's stakes/payoff, slides 2-4 are concrete and specific (not a vague news recap), slide 5 is a save/share CTA.
- `buildReelPrompt(topic: ResearchSummary)` — requests one reel JSON object where `script` follows the existing `HOOK (0-3s)/BODY (4-25s)/CTA (26-30s)` structure (75-90 words). Instructs explicit virality framing: pattern-interrupt opening, curiosity gap, punchy short sentences, must "stop the scroll" and hold attention for the full 30 seconds — not a plain summary of the news.

Both share the same target audience/angle framing already used elsewhere (AI/productivity leverage, not pure news).

### New function

```ts
async function generateSingleIdea(
  topic: ResearchSummary,
  format: 'carousel' | 'reel_hook'
): Promise<GeneratedIdea | null>
```

Calls Gemini via the existing `callGemini` (same retry/backoff behavior), parses a single JSON object (not an array) via a new `parseSingleIdeaJson`, and constructs the `GeneratedIdea` with `format` set from the caller (not trusted from model output). Returns `null` on any parse/API failure.

### New draft-creation helper

```ts
async function saveQuickDraft(
  idea: GeneratedIdea,
  draftFormat: 'carousel' | 'reel'
): Promise<ContentDraft>
```

Generates hashtags via the existing `generateHashtags(idea.hook)`, then creates a `ContentDraft` directly (no `ContentIdea` row — this is a one-shot flow, unlike the multi-idea Ideation tab) with:
- `title`: `idea.hook` truncated to 80 chars
- `caption`: `idea.caption`
- `script`: `idea.script`
- `format`: `draftFormat`
- `scheduledDate`: today
- `scheduledTime`: `'09:00'` (same default used elsewhere in the app)

### New route (`backend/src/routes/ideation.ts`)

`POST /api/ideation/quick-generate`

Request: `{ research_item_id: string, format: 'carousel' | 'reel' }`

1. Validate body (zod). 400 on invalid shape.
2. Look up the `ResearchItem` by id. 404 if not found.
3. Call `generateSingleIdea({ title, snippet }, format === 'carousel' ? 'carousel' : 'reel_hook')`.
4. If generation returns `null`: 502 with `{ error: 'Generation failed', detail: 'Check Gemini API key in Settings, or try again (free tier can be busy)' }` — matches the existing Ideation tab's failure messaging.
5. Otherwise call `saveQuickDraft` and respond `201` with `{ draft: serializeDraft(draft) }`.

### Supporting refactor

`serializeDraft` currently lives as a private function inside `drafts.ts`. Extract it to `backend/src/utils/serializeDraft.ts` and import it from both `drafts.ts` and the new route in `ideation.ts`, so the quick-generate response matches the exact JSON shape the frontend already expects (`ContentDraft` type: hashtags parsed to array, `carouselSlides` parsed or null).

## Frontend

### `HotTopicsTab.tsx`

Each card stops being a plain `<a href=... target=_blank>`. It becomes a clickable card (`relative` positioned) that toggles a popover for that item's id (`openMenuId` state — only one open at a time). The card's visual content/styling is unchanged.

### New `HotTopicActions.tsx` (in `components/HotTopicsTab/`)

Popover anchored to the card, closes on outside click or after a selection. Three options:
- **🖼️ Generate Carousel** — calls `useQuickGenerate().generate(item.id, 'carousel')`
- **🎬 Generate Reel** — calls `useQuickGenerate().generate(item.id, 'reel')`
- **🔗 Open Link** — `window.open(item.fullUrl, '_blank', 'noopener,noreferrer')`, then closes

While a generation is in flight, that specific button shows "Generating…" and is disabled; the other two remain usable. On success, the popover closes and a preview modal opens showing the new draft. On failure, a toast shows the error detail from the API and the popover stays open so the user can retry.

### New `useQuickGenerate` hook (in `hooks/useIdeation.ts`)

```ts
function useQuickGenerate(): {
  generate: (researchItemId: string, format: 'carousel' | 'reel') => Promise<ContentDraft>;
  loading: 'carousel' | 'reel' | null;
}
```

POSTs to `/api/ideation/quick-generate`, adds the resulting draft to the store via the existing `addContentDraft` action (same one `useCreateDraft` uses) so it immediately appears in the Drafts tab, and returns the draft so the caller can open the preview modal.

### Supporting refactor: extract `Common/DraftPreviewModal.tsx`

The preview modal currently embedded in `DraftCard.tsx` (carousel slide viewer with prev/next, download-ZIP button, publish-to-Instagram button, caption/hashtags display) is extracted into a standalone `DraftPreviewModal` component taking `{ draft: ContentDraft; onClose: () => void }`. It owns its own `downloading`/`publishing`/`slideIndex` state (moved out of `DraftCard`).

While extracting, fix a real gap: today, non-carousel formats with a script (e.g. a reel) render only a generic icon placeholder in the preview — there's no way to see or copy the generated script from the preview modal. `DraftPreviewModal` will show the script text (whitespace-preserved) with a "Copy script" button when `draft.script` is present and the format isn't `carousel`, mirroring the copy-script UX already used in `ConceptCard.tsx`.

`DraftCard.tsx` is updated to render `<DraftPreviewModal draft={draft} onClose={...} />` instead of its inline modal; its own "Download images" / "Post to Instagram" buttons in the card body are unchanged.

`HotTopicActions.tsx` uses the same `DraftPreviewModal` for the just-generated draft.

## Data flow

1. User clicks a Hot Topics card → popover opens.
2. User clicks "Generate Carousel" or "Generate Reel" → `useQuickGenerate.generate(item.id, format)` → `POST /api/ideation/quick-generate`.
3. Backend generates one topic-specific idea via Gemini, creates a `ContentDraft`, returns it.
4. Frontend adds the draft to the store (visible in Drafts tab) and opens `DraftPreviewModal` with it.
5. From the preview modal the user can download carousel images / copy the reel script / post to Instagram / close — all existing, already-working actions.

## Error handling

- Invalid request body → 400 (zod, existing pattern).
- Research item not found → 404.
- Gemini call fails or returns unparseable output → 502 with a user-facing detail message → toast on the frontend; popover stays open for retry. No partial/empty draft is ever created in this case.

## Testing

- Backend: add a route test for `POST /api/ideation/quick-generate` in `backend/src/routes/ideation.test.ts` (mirroring the existing `/generate` test's mocking of the Gemini client) covering: success creates a draft with the right format/schedule, missing research item 404s, Gemini failure 502s.
- Frontend: manually verify in-browser (per project convention — no frontend test suite currently exercises component interactions beyond what exists).
