# ContentIQ: AI-Powered Content Research & Generation Platform

**Project Owner:** Sejal Daterao  
**Created:** June 2026  
**Scope:** Full-featured MVP  
**Target Launch:** Local + Cloud deployment  

---

## 1. PRODUCT OVERVIEW

### Vision
A daily-intelligence-driven content generation suite that scours the internet for emerging AI, tech trends, and industry insights—then transforms raw research into publication-ready Instagram content (Reels, Carousels, Stories). Designed for creators who want to stay ahead of the curve without drowning in research.

### Core Promise
- **Daily Research Automation**: Sweep the entire web at 8am daily for breaking AI/tech news, trends, tips, and tools
- **Multi-Source Intelligence**: Google/Perplexity APIs + RSS feeds (HN, Reddit, tech blogs) + targeted web scraping
- **AI-Powered Ideation**: Generate caption concepts, hooks, and carousel structures using Claude + GPT models
- **Creator Dashboard**: Single source of truth for research, drafts, scheduling, and publishing analytics
- **Smart Notifications**: Daily digest emails + Slack updates + in-app alerts
- **Content Calendar**: Weekly publishing roadmap with auto-suggested content mix

---

## 2. USER FLOW & CORE WORKFLOWS

### Workflow 1: Daily Discovery & Digest
```
8:00 AM → Research Engine Runs
  ↓
Multi-source crawl (Google API, RSS, web scrape)
  ↓
Deduplication & relevance scoring
  ↓
Basic categorization (AI News, AI Tools, Trends, Tips)
  ↓
Slack alert + Email digest sent to user
  ↓
User reviews in-app (Research tab) within 24hrs
```

### Workflow 2: Content Ideation
```
User selects 1-5 research items → AI Ideation Engine Triggered
  ↓
Claude API: Generate 3-5 content concept variations
  ↓
GPT-4: Alternative captions & hooks
  ↓
Auto-tag relevant hashtags + trending terms
  ↓
Suggest best format (Reel hook, Carousel slide 1, Story teaser, etc.)
  ↓
Present in Ideation tab for user to pick/edit
```

### Workflow 3: Draft Creation & Scheduling
```
User approves ideation → Create Draft
  ↓
User edits AI-generated captions, hooks, hashtags
  ↓
Save to drafts + assign to publishing date
  ↓
View in Calendar tab (see week's publishing schedule)
  ↓
1-2 hours before scheduled post: Notification reminder
  ↓
User manually posts to Instagram OR auto-schedule via API (future phase)
```

### Workflow 4: Performance Tracking
```
User posts content → Track metrics (impressions, saves, shares)
  ↓
Analytics tab shows: top-performing content, audience segments, trends
  ↓
Recommendations fed back into ideation engine for next cycle
```

---

## 3. DASHBOARD STRUCTURE (TAB-BASED UI)

### Tab 1: **Research**
**Purpose**: Review today's discovered content, organized by category.

**Components:**
- **Filter bar**: Category (AI News, AI Tools, Trends, Tips, All), date range, source
- **Card grid**: Each research item shows:
  - Title + snippet (100 chars)
  - Source tag (e.g., "HN", "TechCrunch", "Reddit/r/MachineLearning")
  - Relevance score (1-10)
  - Published timestamp
  - Action buttons: "Ideate Now", "Save to Archive", "Mark Read"
- **Digest mode**: Toggle to see condensed daily summary
- **Bulk actions**: Select multiple items → "Batch Ideate"

---

### Tab 2: **Ideation**
**Purpose**: Transform research into content concepts.

**Components:**
- **Research selector**: "Pick 1-5 items above to ideate"
- **Ideation generator**: 
  - Button: "Generate Concepts"
  - Shows Claude + GPT responses side-by-side
  - 3-5 concept variations per item
- **Concept card** shows:
  - Content format (Reel hook, Carousel—5 slides, Story, Caption)
  - AI-generated hook/first line
  - Full caption text
  - 10-15 suggested hashtags (trending + evergreen)
  - Vibe/tone tag (Educational, Breaking, Opinion, Hype)
- **User actions per concept**:
  - "Edit Caption" → inline text editor
  - "Customize Hashtags" → search & picker
  - "Save as Draft" → confirm publish date
  - "Regenerate" → get new ideas

---

### Tab 3: **Drafts**
**Purpose**: Manage all saved content drafts before publishing.

**Components:**
- **List view or card grid**:
  - Draft title (auto-generated or user-named)
  - Format type (Reel, Carousel, Story, Caption)
  - Scheduled publish date
  - Last edited timestamp
  - Status badge (Draft, Scheduled, Ready-to-Post)
- **Quick actions**:
  - "Edit" → opens full editor
  - "Preview" → renders mock Instagram post
  - "Move Date" → reschedule
  - "Delete" → archive or permanent delete
- **Bulk actions**: Select drafts → move to date, batch delete

---

### Tab 4: **Calendar**
**Purpose**: Weekly/monthly publishing roadmap at a glance.

**Components:**
- **Weekly grid view**:
  - Days of week (Mon-Sun) as columns
  - 5-7 posts per week distributed
  - Each cell shows: content format icon, title snippet, time scheduled
  - Visual balance indicator (e.g., "3 Reels, 2 Carousels, 1 Story this week")
- **Drag-to-reschedule**: Click & drag post to new day
- **Auto-suggest**: Button "Suggest Schedule" → AI recommends best posting times based on audience insights
- **Month view**: Heatmap of posting activity

---

### Tab 5: **Captions**
**Purpose**: Caption library & quick-access generator.

**Components:**
- **Search**: Filter by keyword, format, tone, source
- **Caption templates**:
  - Saved captions from past posts (organized by format)
  - Copy button, edit button, reuse button
- **Quick generator**:
  - Input: topic + tone (e.g., "Claude 3.5 launch, Educational")
  - Output: 3 caption variations
- **Metrics**: Show which saved captions got highest engagement

---

### Tab 6: **Trending Hashtags**
**Purpose**: Discover & track rising hashtags for reach.

**Components:**
- **Live trending list**: Real-time top 20 hashtags (AI, tech, creator space)
  - Hashtag name + usage count + growth trend (↑/↓)
  - Relevance tag (AI, Tech, Content Creation, etc.)
- **Search**: Find hashtags by keyword
- **Favorites**: Pin 10-15 hashtags to "My Stack" for quick insertion
- **Historical chart**: Show hashtag search volume over time
- **Suggested hashtags for drafts**: Auto-populate relevant ones in ideation

---

### Tab 7: **Reels/Posts/Stories** (Format-Specific Views)
**Purpose**: Filter and organize content by format.

**Components:**
- **Reels tab**: Show all reel-format drafts + past published reels
  - Thumbnail preview
  - Hook copy (first 15 words)
  - Schedule date + publish status
- **Posts tab**: Carousel-format content
- **Stories tab**: Story-format content
- Each format tab has same structure: drafts + published + metrics

---

### Tab 8: **Settings & Notifications**
**Purpose**: Configure research sweep, notification preferences, API keys.

**Components:**
- **Research Engine**:
  - Daily sweep time (default 8am, user-configurable)
  - Data sources toggle: Google API, RSS feeds, web scraping
  - Content categories to track (checkboxes)
  - Relevance threshold (1-10 slider)
- **Notification Preferences**:
  - Email digest: Enabled/Disabled + frequency
  - Slack integration: Connect workspace + channel
  - In-app alerts: Enabled/Disabled
  - Real-time alerts on breaking news (toggle)
- **API Keys & Auth**:
  - Slack bot token (paste/connect OAuth)
  - Email credentials (SMTP or OAuth)
  - Google API key (if using)
  - Claude + GPT API keys (for ideation engine)
- **Publishing Schedule**:
  - Timezone setting
  - Best posting times (manually set or auto-detect)
  - Content mix goal (e.g., 40% Reels, 40% Carousels, 20% Stories)

---

## 4. DATA MODELS & DATABASE SCHEMA

### Core Tables

#### `research_items`
```sql
id (PK)
title (text)
snippet (text, 500 chars)
full_url (text)
source (enum: 'hn', 'reddit', 'google', 'techcrunch', 'blog', 'rss')
source_url (text)
category (enum: 'AI News', 'AI Tools', 'Trends', 'Tips', 'Other')
published_at (timestamp)
discovered_at (timestamp)
relevance_score (float, 0-10)
is_read (boolean)
is_archived (boolean)
is_starred (boolean)
embedding (vector, for future similarity search)
created_at (timestamp)
```

#### `content_ideas`
```sql
id (PK)
research_item_ids (text array, JSON of linked items)
format (enum: 'reel_hook', 'carousel', 'story', 'caption')
concept_variation (int, 1-5)
ai_generated_caption (text)
ai_hook (text, first line)
tone (enum: 'Educational', 'Breaking', 'Opinion', 'Hype')
generated_by (enum: 'claude', 'gpt4', 'both')
user_edited (boolean)
created_at (timestamp)
```

#### `content_drafts`
```sql
id (PK)
idea_id (FK → content_ideas)
title (text)
caption (text)
format (enum: 'reel', 'carousel', 'story', 'caption')
carousel_slides (JSON, if format='carousel')
hashtags (text array)
scheduled_date (date)
scheduled_time (time)
status (enum: 'draft', 'scheduled', 'published')
published_at (timestamp)
user_notes (text)
created_at (timestamp)
updated_at (timestamp)
```

#### `published_posts`
```sql
id (PK)
draft_id (FK → content_drafts)
instagram_post_id (text)
format (enum: 'reel', 'carousel', 'story', 'caption')
published_at (timestamp)
likes (int)
comments (int)
shares (int)
saves (int)
reach (int)
impressions (int)
last_synced (timestamp)
```

#### `hashtags_trending`
```sql
id (PK)
hashtag (text, unique)
category (enum: 'AI', 'Tech', 'Creator', 'General')
search_volume (int)
growth_rate (float)
is_favorite (boolean)
last_updated (timestamp)
```

#### `user_settings`
```sql
id (PK, usually just 1 row)
research_sweep_time (time, default '08:00')
research_sweep_enabled (boolean)
data_sources_enabled (JSON)
content_categories (text array)
relevance_threshold (int, 1-10)
email_digest_enabled (boolean)
email_digest_frequency (enum: 'daily', 'weekly')
slack_enabled (boolean)
slack_webhook_url (text, encrypted)
slack_channel (text)
timezone (text)
best_posting_times (JSON)
content_mix_goal (JSON)
created_at (timestamp)
```

---

## 5. TECHNOLOGY STACK

### Frontend
- **Framework**: React 18+ with Vite
- **UI Library**: Tailwind CSS + shadcn/ui components
- **State Management**: Zustand or Redux Toolkit
- **Calendar**: react-big-calendar or similar
- **Code Editor**: Monaco Editor or CodeMirror (for caption editing)
- **Charts**: Recharts or Chart.js (for analytics)
- **HTTP Client**: Axios or TanStack Query

### Backend
- **Runtime**: Node.js + Express (TypeScript)
- **Database**: 
  - **Local**: SQLite (development)
  - **Cloud**: PostgreSQL (production)
- **ORM**: Prisma (works with both SQLite & Postgres)
- **Cron Jobs**: node-cron (daily 8am research sweep)
- **Email**: Nodemailer (SMTP) or SendGrid
- **Slack Integration**: @slack/bolt (official SDK)
- **AI APIs**:
  - Claude (Anthropic SDK)
  - OpenAI (GPT-4)
- **Web Scraping**: Cheerio + Axios (lightweight) or Puppeteer (if needed)
- **Search APIs**:
  - Google Custom Search API
  - Perplexity API (optional, for structured search)
- **RSS Parser**: rss-parser npm package
- **Validation**: Zod or Joi

### Deployment
- **Local**: Docker Compose (backend + DB + frontend)
- **Cloud**: 
  - Backend: Railway or Render
  - Frontend: Vercel
  - Database: Railway PostgreSQL or AWS RDS
  - Cron Jobs: GitHub Actions or Railway background jobs

### DevOps & Monitoring
- **Environment**: `.env` files for API keys (local) → environment variables (cloud)
- **Logging**: Pino or Winston
- **Error Tracking**: Sentry (optional)
- **CI/CD**: GitHub Actions (auto-deploy on push)

---

## 6. KEY FEATURES & SPECIFICATIONS

### Feature 1: Daily Research Engine (8am Sweep)
**Execution:**
1. **Multi-source crawl** (runs in parallel):
   - Google Custom Search API: Query "AI news", "tech trends 2024", "AI launches"
   - Perplexity API: Ask "What are the top 10 AI breakthroughs this week?"
   - RSS feeds: Subscribe to HN, Reddit r/MachineLearning, r/artificial, TechCrunch, VentureBeat
   - Web scraping: 5-10 curated blogs (e.g., OpenAI blog, DeepMind blog, Hugging Face updates)

2. **Deduplication & ranking**:
   - Hash title + source → remove exact duplicates
   - Relevance scoring: keyword matching ("AI", "ML", "LLM", "prompt", etc.) × source authority × recency
   - Score 1-10, keep items ≥ threshold (user-configurable)

3. **Categorization**:
   - Rules-based: Look for keywords → assign to "AI News", "AI Tools", "Trends", "Tips"
   - Example: "Claude 3.5 Sonnet launches" → "AI News"
   - Example: "10 Prompt Engineering Tricks" → "Tips"

4. **Storage & notifications**:
   - Insert into `research_items` table
   - Compile digest: top 10-15 items by relevance score
   - Send email + Slack message with summary
   - Mark as unread in-app, user reviews in Research tab

---

### Feature 2: AI-Powered Ideation Engine
**Execution:**
1. User selects 1-5 research items in Ideation tab
2. Backend calls Claude API + GPT-4 API in parallel:
   - **Claude prompt**:
     ```
     Topic: [research item title & snippet]
     Target Audience: Mixed (builders, creators, students, non-technical folks)
     Platform: Instagram
     
     Generate 3 content ideas for this topic. For each idea:
     - Content format: Reel hook, Carousel (5 slides), Story, or Caption
     - Hook (first 1-2 lines): Compelling, curiosity-driven
     - Full caption: 200-300 words, include 1-2 actionable takeaways
     - Tone: Choose one—Educational, Breaking, Opinion, Hype
     
     Return JSON: [{ format, hook, caption, tone }, ...]
     ```
   - **GPT-4 prompt**: Similar but focus on alternative angles, viral hooks

3. Generate 10-15 hashtags:
   - 5 trending (fetched from `hashtags_trending` table)
   - 5 evergreen (hardcoded: #AI #MachineLearning #TechTrends #AINews #FutureOfWork)
   - 5 niche (e.g., #PromptEngineering, #LargeLanguageModels based on content)

4. Return all variations in Ideation tab for user to pick/edit

---

### Feature 3: Draft Editor & Scheduling
**Components:**
- **Caption editor**: Textarea with character counter, emoji picker
- **Hashtag manager**: Search + multi-select from trending list
- **Format previewer**: Render Instagram-style mock-up (Reel placeholder, Carousel slides, Story frame)
- **Schedule picker**: Date + time selector with timezone awareness
- **Save & schedule**: Button → saves to `content_drafts` table, marks as "scheduled"

---

### Feature 4: Weekly Calendar & Auto-Suggest
**Calendar view:**
- 7 columns (Mon-Sun)
- Drag & drop to reschedule
- Visual balance: show "3 Reels, 2 Carousels, 1 Story" for week

**Auto-suggest:**
- Algorithm: Analyze `published_posts` metrics for format + day/time performance
- Recommend: "Reels perform best Tue/Thu 9am, Carousels best Wed 7pm"
- Button "Suggest Schedule" → populates calendar with optimized dates/times

---

### Feature 5: Notifications (Email + Slack + In-App)
**Email digest** (daily, 8:30am):
- Subject: "ContentIQ Daily Brief: [5 top stories]"
- Body: 
  - Top 10-15 research items as list (title, source, snippet)
  - "Review in app & ideate" CTA
  - If new trending hashtags: include them

**Slack message** (daily, 8:30am):
- Message: "📊 Daily research sweep complete! Found [X] items. [View in ContentIQ]"
- Thread replies: Top 3-5 items as expandable blocks

**In-app alerts**:
- Badge count on Research tab
- Toast notifications for high-relevance items (score ≥ 8)

---

### Feature 6: Trending Hashtags Tracker
**Data source:**
- Instagram API (if available, future phase) or scrape Instagram's Explore page
- Twitter's trending API
- Manual refresh every 6 hours via scheduled job

**Display:**
- Live top 20 hashtags
- Search + filter by category (AI, Tech, Creator)
- "Add to My Stack" button → save 10-15 favorites for quick insertion into captions
- Chart: hashtag usage over last 7 days (trend visualization)

---

### Feature 7: Analytics & Performance Tracking
**Metrics tracked** (future phase, after publishing):
- Likes, comments, shares, saves, reach, impressions per post
- Best-performing content formats & posting times
- Audience growth trends

**Dashboard:**
- Show top-3 posts by engagement
- Heatmap: which days/times get best reach
- Recommendations: "Carousels on Wed get 3x engagement; plan accordingly"

---

## 7. API INTEGRATIONS & THIRD-PARTY SERVICES

### External APIs Required
1. **Google Custom Search API**
   - Docs: https://developers.google.com/custom-search/v1
   - Auth: API key
   - Usage: Search "AI news", "tech trends", etc.
   - Cost: ~$5/mo for 100 queries/day

2. **Perplexity API**
   - Docs: https://docs.perplexity.ai
   - Auth: API key
   - Usage: "What are top AI breakthroughs this week?"
   - Cost: Pay-as-you-go (optional, can skip if budget-limited)

3. **OpenAI API (GPT-4)**
   - Docs: https://platform.openai.com/docs
   - Auth: API key
   - Usage: Alternative ideation engine
   - Cost: ~$0.03-0.06 per 1K tokens

4. **Anthropic Claude API**
   - Docs: https://docs.anthropic.com
   - Auth: API key
   - Usage: Primary ideation engine
   - Cost: ~$0.003-0.03 per 1K tokens (Sonnet/Opus)

5. **Slack API (@slack/bolt)**
   - Docs: https://slack.dev/bolt-js
   - Auth: Bot token via OAuth
   - Usage: Send daily digest messages
   - Cost: Free (if using workspace you own)

6. **SendGrid (email) or Nodemailer**
   - SendGrid: https://sendgrid.com (free tier: 100 emails/day)
   - Nodemailer: Free (SMTP relay via Gmail, Outlook, etc.)

7. **RSS Feed Parser**
   - Feeds to subscribe: HackerNews, Reddit, TechCrunch, VentureBeat, DeepMind, OpenAI blog
   - rss-parser npm package: Free, open-source

---

## 8. DEVELOPMENT ROADMAP (PHASED)

### Phase 1: MVP (Weeks 1-3)
- ✅ Backend setup (Express + Prisma + SQLite)
- ✅ Frontend scaffold (React + Tailwind)
- ✅ Research tab + daily sweep logic (8am cron job)
- ✅ Basic email digest
- ✅ Ideation engine (Claude API calls)
- ✅ Drafts tab + scheduler
- ✅ Settings for API keys + notifications

### Phase 2: Polish & Cloud Ready (Weeks 4-5)
- ✅ Slack integration
- ✅ Calendar view + drag-to-reschedule
- ✅ Trending hashtags tracker
- ✅ Caption editor refinement
- ✅ Docker setup for local deployment
- ✅ PostgreSQL migration scripts

### Phase 3: Advanced Features (Weeks 6+)
- 🔄 Analytics dashboard (post-publish metrics)
- 🔄 Auto-suggest scheduling algorithm
- 🔄 Instagram API integration (auto-posting)
- 🔄 Multi-user mode (JWT auth, team workspaces)
- 🔄 Image generation for carousels (DALL-E / Midjourney integration)
- 🔄 Advanced search (embedding-based similarity matching)

---

## 9. FOLDER STRUCTURE (FULL-STACK)

```
contentiq/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── TabNavigation.tsx
│   │   │   ├── ResearchTab/
│   │   │   │   ├── ResearchCard.tsx
│   │   │   │   ├── FilterBar.tsx
│   │   │   │   └── ResearchGrid.tsx
│   │   │   ├── IdeationTab/
│   │   │   │   ├── ConceptGenerator.tsx
│   │   │   │   ├── ConceptCard.tsx
│   │   │   │   └── IdeationPanel.tsx
│   │   │   ├── DraftsTab/
│   │   │   │   ├── DraftCard.tsx
│   │   │   │   ├── DraftEditor.tsx
│   │   │   │   └── DraftsList.tsx
│   │   │   ├── CalendarTab/
│   │   │   │   ├── WeeklyCalendar.tsx
│   │   │   │   ├── ScheduleCell.tsx
│   │   │   │   └── AutoSuggestModal.tsx
│   │   │   ├── CaptionsTab/
│   │   │   │   ├── CaptionLibrary.tsx
│   │   │   │   ├── CaptionGenerator.tsx
│   │   │   │   └── CaptionSearch.tsx
│   │   │   ├── HashtagsTab/
│   │   │   │   ├── TrendingList.tsx
│   │   │   │   ├── HashtagCard.tsx
│   │   │   │   └── MyHashtagStack.tsx
│   │   │   ├── FormatTabs/
│   │   │   │   ├── ReelsTab.tsx
│   │   │   │   ├── PostsTab.tsx
│   │   │   │   └── StoriesTab.tsx
│   │   │   ├── SettingsTab/
│   │   │   │   ├── ResearchSettings.tsx
│   │   │   │   ├── NotificationSettings.tsx
│   │   │   │   └── APIKeyForm.tsx
│   │   │   └── Common/
│   │   │       ├── Header.tsx
│   │   │       ├── LoadingSpinner.tsx
│   │   │       └── Modal.tsx
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Login.tsx (future)
│   │   │   └── Settings.tsx
│   │   ├── hooks/
│   │   │   ├── useResearch.ts
│   │   │   ├── useIdeation.ts
│   │   │   ├── useDrafts.ts
│   │   │   └── useSettings.ts
│   │   ├── types/
│   │   │   └── index.ts (all TypeScript interfaces)
│   │   ├── utils/
│   │   │   ├── api.ts (Axios instance)
│   │   │   ├── formatters.ts (date, text)
│   │   │   └── validators.ts
│   │   ├── styles/
│   │   │   └── globals.css
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── research.ts (GET /research, POST /research/refresh)
│   │   │   ├── ideation.ts (POST /ideation/generate)
│   │   │   ├── drafts.ts (GET, POST, PUT, DELETE /drafts)
│   │   │   ├── calendar.ts (GET /calendar/week, POST /calendar/auto-suggest)
│   │   │   ├── hashtags.ts (GET /hashtags/trending)
│   │   │   ├── posts.ts (GET /posts/published)
│   │   │   ├── settings.ts (GET, PUT /settings)
│   │   │   └── notifications.ts (POST /notifications/test)
│   │   ├── services/
│   │   │   ├── researchEngine.ts (multi-source crawl logic)
│   │   │   ├── ideationEngine.ts (Claude + GPT calls)
│   │   │   ├── emailService.ts (Nodemailer / SendGrid)
│   │   │   ├── slackService.ts (Slack bot messages)
│   │   │   ├── hashtagService.ts (trending hashtags)
│   │   │   └── instagramService.ts (future: Instagram API)
│   │   ├── jobs/
│   │   │   ├── dailyResearchSweep.ts (8am cron)
│   │   │   ├── updateTrendingHashtags.ts (every 6 hours)
│   │   │   └── syncPostMetrics.ts (daily, after 8pm)
│   │   ├── middleware/
│   │   │   ├── auth.ts (JWT, future)
│   │   │   ├── errorHandler.ts
│   │   │   └── requestLogger.ts
│   │   ├── prisma/
│   │   │   └── schema.prisma (database schema)
│   │   ├── utils/
│   │   │   ├── apiClients.ts (Google, Perplexity, Claude, GPT initializers)
│   │   │   ├── logger.ts
│   │   │   └── validators.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── app.ts (Express app setup)
│   │   └── server.ts (entry point)
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
│
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## 10. ENVIRONMENT VARIABLES & CONFIG

### `.env.local` (Backend)
```bash
# Server
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# Database (SQLite for local, PostgreSQL connection string for cloud)
DATABASE_URL=file:./dev.db
# For cloud: postgresql://user:password@host:port/dbname

# AI APIs
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=...
GOOGLE_SEARCH_ENGINE_ID=...
PERPLEXITY_API_KEY=... (optional)

# Email
EMAIL_SERVICE=sendgrid  # or 'nodemailer'
SENDGRID_API_KEY=... (if using SendGrid)
SMTP_HOST=smtp.gmail.com  # if using Nodemailer
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=app-password

# Slack
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Logging & Monitoring
LOG_LEVEL=info
SENTRY_DSN=... (optional)

# Research Engine
RESEARCH_SWEEP_TIME=08:00  # 24-hour format
RESEARCH_SWEEP_TIMEZONE=America/Los_Angeles
```

### `.env.local` (Frontend)
```bash
VITE_API_URL=http://localhost:5000
VITE_APP_NAME=ContentIQ
```

---

## 11. TESTING CHECKLIST

### Backend
- [ ] Research engine: multi-source crawl returns unique, deduplicated items
- [ ] Ideation engine: Claude API generates 3-5 variations per item
- [ ] Drafts: Create, read, update, delete, reschedule
- [ ] Email digest: Sends correctly formatted digest
- [ ] Slack integration: Posts to channel, includes top 5 items
- [ ] Cron jobs: 8am research sweep + 6am hashtag update run on schedule
- [ ] Database: Prisma migrations succeed, queries work

### Frontend
- [ ] Research tab: Loads items, filter works, "Ideate Now" button works
- [ ] Ideation tab: Generates 5+ concepts, displays in card format
- [ ] Drafts tab: Create, edit, delete, move to calendar
- [ ] Calendar: Drag & drop reschedule, auto-suggest populates week
- [ ] Captions tab: Search, copy, reuse, generate
- [ ] Hashtags tab: Display trending, add to favorites, search
- [ ] Settings: Save API keys, notification preferences persist
- [ ] Responsive: Mobile, tablet, desktop layouts work

---

## 12. DEPLOYMENT STEPS

### Local (Docker)
```bash
# Build & run
docker-compose up

# Access
Frontend: http://localhost:3000
Backend: http://localhost:5000
Database: SQLite at ./dev.db
```

### Cloud (Railway + Vercel)
1. **Backend on Railway**:
   - Create Railway project
   - Link GitHub repo
   - Add PostgreSQL plugin
   - Set environment variables
   - Deploy on push

2. **Frontend on Vercel**:
   - Link GitHub repo (frontend/ folder)
   - Set VITE_API_URL=https://your-railway-backend.com
   - Deploy on push

3. **Cron jobs on Railway**:
   - Use Railway's background job runner or GitHub Actions

---

## 13. FUTURE ENHANCEMENTS (Post-MVP)

1. **Instagram API Integration**: Auto-post to Instagram (requires Meta approval)
2. **Image Generation**: DALL-E / Midjourney integration for carousel graphics
3. **Multi-user & Teams**: JWT auth, shared workspaces, collaboration
4. **Advanced Analytics**: Cohort analysis, audience segmentation, A/B testing
5. **Custom AI Training**: Fine-tune Claude on your brand voice
6. **Browser Extension**: One-click "Save for ContentIQ" from any webpage
7. **Mobile App**: iOS/Android native app (React Native)
8. **Content Marketplace**: Buy/sell content ideas, templates

---

## 14. SUCCESS METRICS

- **Engagement**: Time spent per day in app, drafts created per week
- **Productivity**: Posts published per week (target: 5-7)
- **Quality**: Engagement rate on published posts (target: 3-5% for reels)
- **Retention**: Weekly active users, feature adoption (% using ideation)
- **System Health**: 99% uptime, <2s page load time, <1s API response

---

## 15. KNOWN CONSTRAINTS & ASSUMPTIONS

- **No Instagram API initially**: Posts will be drafted, user copies caption & schedules manually
- **Email delivery**: Assumes valid SMTP or SendGrid setup
- **Rate limits**: Google API (100 queries/day), Claude (limited by quota), GPT-4 (pay-as-you-go)
- **Content moderation**: All research items auto-fetched; no content filtering yet (user reviews before posting)
- **Single user initially**: No auth/multi-user in MVP (future phase)
- **Hashtags**: Manually curated list + trending tracker; no Instagram native integration yet

---

## READY TO BUILD!

This spec is your north star. Share this document with Claude Code, and it will guide generation of:
1. Prisma schema
2. Express backend routes + services
3. React frontend components
4. Docker setup
5. GitHub Actions CI/CD
6. Deployment configs

**Questions to refine further?** Ask away. Otherwise, time to build! 🚀
