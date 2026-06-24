# ContentIQ: Claude Code Implementation Guide

**Use this guide to prompt Claude Code for scaffolding and initial development.**

---

## STEP 1: Project Initialization

### Prompt for Claude Code:
```
Initialize a full-stack TypeScript project called "ContentIQ" with the following structure:

**Backend** (Express + TypeScript):
- Create src/ folder with: routes/, services/, jobs/, middleware/, utils/, types/
- Setup Express server on port 5000
- Add Prisma ORM with SQLite for local development
- Create package.json with dependencies:
  - express, express-async-errors
  - prisma, @prisma/client
  - dotenv, zod
  - node-cron (for daily jobs)
  - axios (for API calls)
  - @slack/bolt (for Slack)
  - nodemailer
  - pino (logging)
  - typescript, ts-node

**Frontend** (React + Vite):
- Create src/ folder with: components/, pages/, hooks/, types/, utils/
- Setup Tailwind CSS + shadcn/ui
- Create package.json with dependencies:
  - react, react-dom
  - vite
  - typescript
  - tailwindcss, postcss, autoprefixer
  - axios, zustand
  - react-big-calendar
  - recharts

Create both in parallel, with a root package.json that has scripts to run both.
```

---

## STEP 2: Database Schema (Prisma)

### Prompt for Claude Code:
```
Generate the Prisma schema (prisma/schema.prisma) with these models:
1. ResearchItem (id, title, snippet, source, category, relevance_score, is_read, etc.)
2. ContentIdea (id, research_item_ids, format, caption, tone, created_at)
3. ContentDraft (id, caption, format, hashtags, scheduled_date, status)
4. PublishedPost (id, draft_id, format, likes, comments, etc.)
5. HashtagTrending (id, hashtag, category, search_volume, is_favorite)
6. UserSettings (id, research_sweep_time, email_digest_enabled, etc.)

Use SQLite for local (dev) and support PostgreSQL (production).
Include proper indexes on frequently queried fields (source, category, scheduled_date).
```

---

## STEP 3: Backend Services & API Routes

### Prompt for Claude Code (Part A - Research Engine):
```
Create the research engine service (src/services/researchEngine.ts):

Functions needed:
1. crawlMultipleSources() - parallel calls to:
   - Google Custom Search API (query: "AI news", "tech trends")
   - Mock RSS feed parser (hardcode a few feed URLs for now: HN, Reddit)
   - Web scraping (cheerio-based parser for 2-3 tech blogs)
   
2. deduplicateAndRank(items) - hash title, remove duplicates, score by relevance (1-10)

3. categorizeItems(items) - rules-based categorization into "AI News", "AI Tools", "Trends", "Tips"

4. saveToDatabase(items) - insert into research_items table

Return: array of ranked, deduplicated, categorized items

Error handling: Log failures per source, still return partial results.
```

### Prompt for Claude Code (Part B - Ideation Engine):
```
Create the ideation engine service (src/services/ideationEngine.ts):

Functions needed:
1. generateIdeasWithClaude(researchItems: ResearchItem[])
   - Call Anthropic Claude API with prompt:
     "Generate 3 content ideas for Instagram. Each should have: format (reel/carousel/story/caption), hook (1-2 lines), full caption (200-300 words), tone (educational/breaking/opinion/hype)"
   - Parse JSON response
   - Return array of ContentIdea objects

2. generateIdeasWithGPT(researchItems) - similar, call OpenAI GPT-4

3. generateHashtags(topic: string) - return 15 hashtags (5 trending, 5 evergreen, 5 niche)

4. saveDraft(idea: ContentIdea, scheduledDate: Date) - create ContentDraft entry

Error handling: If API call fails, return empty ideas but don't crash. Log error.
```

### Prompt for Claude Code (Part C - Email & Slack Services):
```
Create two services:

1. src/services/emailService.ts - sendDailyDigest(items: ResearchItem[])
   - Format HTML email with top 10-15 items
   - Subject: "ContentIQ Daily Brief: [date]"
   - Include source, snippet, relevance score
   - Footer: "Review in app" link
   - Use Nodemailer (SMTP) or SendGrid API
   - Return success/failure status

2. src/services/slackService.ts - postDailyDigest(items: ResearchItem[], channel: string)
   - Use @slack/bolt
   - Post message: "📊 Daily sweep found X items"
   - Include top 3 items as expandable blocks
   - Add "View in ContentIQ" button
   - Return success/failure status
```

### Prompt for Claude Code (Part D - API Routes):
```
Create the following Express routes:

1. GET /api/research - fetch all research items (paginated, with filters)
   - Query params: category, source, is_read, skip, limit
   - Return: { items: [], total: number, timestamp: date }

2. POST /api/research/refresh - manually trigger research sweep
   - Call researchEngine.crawlMultipleSources()
   - Send email + Slack notification
   - Return: { items_found: number, items_added: number }

3. POST /api/ideation/generate - generate ideas for selected research items
   - Body: { research_item_ids: string[] }
   - Call ideationEngine.generateIdeasWithClaude() + generateIdeasWithGPT()
   - Save as ContentIdea
   - Return: { ideas: ContentIdea[] }

4. GET /api/drafts - fetch all content drafts (with filters)
   - Query params: status, format, scheduled_date_from/to, skip, limit
   - Return: { drafts: [], total: number }

5. POST /api/drafts - create new draft
   - Body: { idea_id, scheduled_date, scheduled_time }
   - Create ContentDraft entry
   - Return: { draft: ContentDraft }

6. PUT /api/drafts/:id - update draft
   - Body: { caption, hashtags, scheduled_date, status }
   - Update ContentDraft
   - Return: { draft: ContentDraft }

7. DELETE /api/drafts/:id - delete draft
   - Delete ContentDraft
   - Return: { success: true }

8. GET /api/calendar/week - fetch week's scheduled posts
   - Query param: week_start (ISO date)
   - Return: { posts_by_day: { Mon: [], Tue: [], ... } }

9. POST /api/calendar/auto-suggest - get suggested schedule for week
   - Analyze historical post performance
   - Return: { suggestions: [{ date, time, format, reason }] }

10. GET /api/hashtags/trending - fetch trending hashtags
    - Return: { trending: [{ hashtag, usage_count, growth, category }] }

All routes: add error handling, validate input with Zod, return consistent JSON format.
```

---

## STEP 4: Cron Jobs

### Prompt for Claude Code:
```
Create two scheduled jobs using node-cron:

1. src/jobs/dailyResearchSweep.ts - runs at 08:00 every day
   - Call researchEngine.crawlMultipleSources()
   - Call emailService.sendDailyDigest()
   - Call slackService.postDailyDigest()
   - Log timing and success/failure
   - Retry logic: if email fails, queue for retry in 1 hour

2. src/jobs/updateTrendingHashtags.ts - runs every 6 hours
   - Fetch trending hashtags from Instagram/Twitter APIs (mock for now)
   - Update HashtagTrending table
   - Keep top 50 hashtags, remove old ones
   - Log updated count

Initialize both jobs in src/server.ts at startup.
Error handling: If job fails, log error and continue. Don't crash the app.
```

---

## STEP 5: Frontend - Dashboard & Tabs

### Prompt for Claude Code (Part A - Layout):
```
Create the main dashboard layout (src/pages/Dashboard.tsx):

Structure:
- Header: ContentIQ logo, user greeting, last refresh time
- Sidebar: 8 tabs (Research, Ideation, Drafts, Calendar, Captions, Hashtags, Reels/Posts/Stories, Settings)
- Tab content area: render selected tab component

State management: Zustand store with:
- activeTab: string
- research_items: ResearchItem[]
- content_ideas: ContentIdea[]
- content_drafts: ContentDraft[]
- selected_items: string[] (for multi-select in ideation)
- user_settings: UserSettings

On component mount: fetch all data from backend APIs
```

### Prompt for Claude Code (Part B - Research Tab):
```
Create src/components/ResearchTab/

Components needed:
1. ResearchTab.tsx - main component
   - Filter bar: Category (dropdown), Source (multi-select), Date range (date picker)
   - View toggle: Card grid vs. List view
   - Research grid: show cards in responsive grid

2. ResearchCard.tsx - single research item
   - Title (truncated to 80 chars)
   - Snippet (100 chars)
   - Source tag (colored badge)
   - Relevance score (1-10, progress bar)
   - Actions: "Ideate Now" (blue), "Save" (gray), "Mark Read" (gray)
   - Timestamp (relative: "2 hours ago")

3. FilterBar.tsx - category, source, date filters
   - Use React Select for dropdowns
   - Apply filters → re-fetch from backend

Add: loading skeleton while fetching, empty state message if no items
```

### Prompt for Claude Code (Part C - Ideation Tab):
```
Create src/components/IdeationTab/

Components needed:
1. IdeationTab.tsx - main component
   - Show selected research items (pills at top, clickable to edit)
   - "Generate Concepts" button → calls POST /api/ideation/generate
   - Display 3-5 concepts from Claude + GPT side-by-side

2. ConceptCard.tsx - single concept
   - Format badge (Reel, Carousel, Story, Caption)
   - Hook (large, bold)
   - Full caption (expandable)
   - Tone tag
   - Hashtags (editable pill list)
   - Actions: "Edit", "Customize Hashtags", "Save as Draft", "Regenerate"

3. ConceptGenerator.tsx - form for selecting research items
   - Checkbox list of recent research items (from Research tab)
   - "Generate" button
   - Show loading spinner while generating

Add: error handling if API call fails, retry button
```

### Prompt for Claude Code (Part D - Drafts & Calendar Tabs):
```
Create src/components/DraftsTab/ and CalendarTab/

Drafts Tab:
1. DraftsTab.tsx - list view or card grid
   - Filter: Status (Draft, Scheduled, Published), Format, Date range
   - Card shows: title, format icon, scheduled date, status badge
   - Actions: Edit, Preview, Move Date, Delete

2. DraftEditor.tsx - full editor modal
   - Caption textarea with character counter
   - Hashtag picker (search + multi-select from trending list)
   - Date & time picker (with timezone)
   - Format previewer (mock Instagram post)
   - Save & Schedule button

Calendar Tab:
1. WeeklyCalendar.tsx - 7-column grid for Mon-Sun
   - Each cell shows posts scheduled for that day
   - Drag & drop to reschedule
   - "Auto Suggest" button → call POST /api/calendar/auto-suggest
   - Visual balance indicator: "3 Reels, 2 Carousels, 1 Story this week"

Add: toast notifications for successful saves/deletes
```

### Prompt for Claude Code (Part E - Captions & Hashtags Tabs):
```
Create src/components/CaptionsTab/ and HashtagsTab/

Captions Tab:
1. CaptionsTab.tsx - search + library view
   - Search bar: filter saved captions by keyword
   - Caption list: show all saved captions
   - Each caption: show text snippet, format type, engagement metrics (likes)
   - Actions: Copy, Edit, Reuse (create draft from this caption)

2. CaptionGenerator.tsx - quick generator within tab
   - Input: Topic (text), Tone (dropdown: educational/breaking/opinion/hype)
   - Button: "Generate 3 Variations"
   - Display 3 generated captions
   - Actions: Copy, Save to Library

Hashtags Tab:
1. HashtagsTab.tsx - display trending hashtags
   - Trending list: top 20 hashtags with usage count + growth trend (↑/↓)
   - Search bar: search hashtags by keyword
   - "My Stack" section: 10-15 favorited hashtags (easy copy)
   - Add to Stack / Remove from Stack buttons
   - Hashtag chart: 7-day usage trend

Add: refresh button to manually update trending list
```

### Prompt for Claude Code (Part F - Format-Specific Tabs):
```
Create src/components/FormatTabs/

Three tabs with similar structure:
1. ReelsTab.tsx - show all reel-format content (drafts + published)
2. PostsTab.tsx (carousels)
3. StoriesTab.tsx

Each shows:
- Grid of format-specific thumbnails
- Hook text overlay
- Status badge (Draft, Scheduled, Published)
- Engagement metrics (if published)
- Actions: Edit, Preview, Reschedule, Delete

Add: toggle between draft & published views
```

### Prompt for Claude Code (Part G - Settings Tab):
```
Create src/components/SettingsTab/

Forms for:
1. Research Engine Settings
   - Daily sweep time (time picker, default 08:00)
   - Enable/disable sweep (toggle)
   - Data sources: checkboxes for Google API, RSS, Web Scraping
   - Content categories: checkboxes for AI News, Tools, Trends, Tips
   - Relevance threshold (slider 1-10)

2. Notification Preferences
   - Email digest: toggle + frequency dropdown (daily/weekly)
   - Slack: toggle + connect button (OAuth or manual token paste)
   - Slack channel: text input
   - In-app alerts: toggle
   - Real-time alerts: toggle

3. API Keys & Auth
   - Claude API key: password input (masked)
   - GPT-4 API key: password input
   - Google API key: password input
   - Slack bot token: password input
   - Save button → POST /api/settings

4. Publishing Schedule
   - Timezone: dropdown
   - Best posting times: time picker (editable list)
   - Content mix goal: 3 sliders (% Reels, Carousels, Stories)

Add: confirmation before saving, success toast
```

---

## STEP 6: Frontend - State Management & Hooks

### Prompt for Claude Code:
```
Create src/hooks/ and src/store/

1. src/store/useAppStore.ts (Zustand)
   - State: activeTab, research_items, content_ideas, content_drafts, selected_items, user_settings
   - Actions: setTab, setResearchItems, addContentDraft, deleteContentDraft, updateUserSettings, etc.

2. src/hooks/useResearch.ts
   - useQuery hook: call GET /api/research, return { items, loading, error }
   - useRefreshResearch hook: POST /api/research/refresh, show toast on success

3. src/hooks/useIdeation.ts
   - useGenerateIdeas hook: POST /api/ideation/generate, return { ideas, loading, error }

4. src/hooks/useDrafts.ts
   - useGetDrafts hook: GET /api/drafts
   - useCreateDraft hook: POST /api/drafts
   - useUpdateDraft hook: PUT /api/drafts/:id
   - useDeleteDraft hook: DELETE /api/drafts/:id

5. src/hooks/useCalendar.ts
   - useGetWeekSchedule hook: GET /api/calendar/week
   - useAutoSuggestSchedule hook: POST /api/calendar/auto-suggest

6. src/hooks/useHashtags.ts
   - useTrendingHashtags hook: GET /api/hashtags/trending

All hooks: proper error handling, retry logic, caching where applicable
```

---

## STEP 7: Backend - Environment & Startup

### Prompt for Claude Code:
```
Create the following:

1. .env.example - template with all required keys:
   NODE_ENV, PORT, DATABASE_URL
   ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_API_KEY
   EMAIL_SERVICE, SENDGRID_API_KEY, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
   SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET, SLACK_WEBHOOK_URL
   LOG_LEVEL, SENTRY_DSN

2. src/app.ts - Express app setup
   - CORS middleware (allow localhost:3000)
   - JSON parser
   - error handling middleware (catch all errors, return 500)
   - request logger (pino)
   - register all routes from src/routes/*

3. src/server.ts - entry point
   - Load .env with dotenv
   - Initialize Prisma client
   - Start Express on PORT
   - Initialize cron jobs
   - Log startup message with timestamp

4. src/utils/apiClients.ts - initialize API clients
   - Anthropic client (with API key)
   - OpenAI client (with API key)
   - Axios instance (base URL, headers)
   - Export all for use in services

5. src/utils/logger.ts - Pino logger configuration
   - Pretty print in dev, JSON in prod
   - Log levels based on NODE_ENV
```

---

## STEP 8: Frontend - Build & Run Configuration

### Prompt for Claude Code:
```
Create:

1. vite.config.ts
   - React plugin
   - Resolve alias for @/ imports
   - Proxy /api calls to backend (http://localhost:5000)

2. tailwind.config.js
   - content: ['./src/**/*.{js,ts,jsx,tsx}']
   - Import shadcn colors
   - Custom font (Inter or Poppins)

3. src/main.tsx - React entry point
   - Render App component to #root
   - Wrap in React.StrictMode

4. package.json scripts
   - dev: vite
   - build: vite build
   - preview: vite preview
```

---

## STEP 9: Docker Setup

### Prompt for Claude Code:
```
Create:

1. backend/Dockerfile
   - Node 20 alpine base
   - Copy package.json, install deps
   - Copy src, build TypeScript
   - Expose 5000
   - CMD: node dist/server.js

2. frontend/Dockerfile
   - Node 20 alpine base
   - Copy package.json, install deps
   - Copy src, build with vite
   - Nginx to serve static files
   - Expose 3000
   - Copy nginx.conf

3. docker-compose.yml
   - Backend service: port 5000, volume for code
   - Frontend service: port 3000, depends on backend
   - PostgreSQL service (optional, for cloud prep): port 5432
   - Environment files for each service
```

---

## STEP 10: Testing & Final Checks

### Prompts for Claude Code:
```
1. Write unit tests for researchEngine.deduplicateAndRank()
2. Write integration test for POST /api/ideation/generate
3. Add error boundaries to main Dashboard.tsx
4. Add loading states to all async operations
5. Ensure all form inputs are validated with Zod
6. Test cron jobs manually (create test runner that calls them once)
```

---

## QUICK START: HOW TO RUN

Once Claude Code generates everything:

### Local Setup
```bash
# 1. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 2. Setup database
cd ../backend
npx prisma migrate dev

# 3. Create .env.local with your API keys
cp .env.example .env.local
# Add: ANTHROPIC_API_KEY, OPENAI_API_KEY, etc.

# 4. Run (in separate terminals)
# Terminal 1: Backend
npm run dev

# Terminal 2: Frontend
npm run dev

# Frontend: http://localhost:3000
# Backend: http://localhost:5000
```

### Docker Setup
```bash
# Build & run
docker-compose up

# Access
Frontend: http://localhost:3000
Backend: http://localhost:5000
```

---

## PROMPTING STRATEGY FOR CLAUDE CODE

**Best approach:**
1. Copy the full spec (ContentIQ_SPEC.md) into Claude Code
2. Copy this implementation guide
3. Prompt Claude Code with specific STEP numbers: "Execute STEP 1: Project Initialization"
4. Wait for completion, review, then ask: "Execute STEP 2: Database Schema"
5. Continue through all 10 steps

**Or go full-stack at once:**
"Using the ContentIQ spec and implementation guide, generate the complete full-stack application with all files, code, configuration, and scripts ready to run."

---

## FILES YOU'LL HAVE AFTER GENERATION

```
✅ Backend: src/routes/*.ts, src/services/*.ts, src/jobs/*.ts, .env.example
✅ Frontend: src/components/**/*.tsx, src/hooks/*.ts, src/store/*.ts
✅ Database: prisma/schema.prisma, prisma/migrations/
✅ Docker: Dockerfile, docker-compose.yml
✅ Config: tsconfig.json, package.json (both), vite.config.ts, tailwind.config.js
✅ Root: README.md with setup instructions
```

---

## NEXT STEPS

1. Copy ContentIQ_SPEC.md + this file into Claude Code
2. Follow STEPS 1-10 in order
3. Test locally: npm run dev
4. Deploy: Docker → Cloud (Railway + Vercel)
5. Schedule first daily sweep at 8am
6. Start creating content! 🚀
