# ContentIQ: Quick Reference Card

---

## API ENDPOINTS AT A GLANCE

### Research
| Method | Endpoint | Purpose | Query Params |
|--------|----------|---------|--------------|
| GET | `/api/research` | Fetch all research items | `category`, `source`, `is_read`, `skip=0`, `limit=20` |
| POST | `/api/research/refresh` | Trigger research sweep now | — |

### Ideation
| Method | Endpoint | Purpose | Body |
|--------|----------|---------|------|
| POST | `/api/ideation/generate` | Generate content ideas | `{ research_item_ids: string[] }` |

### Drafts
| Method | Endpoint | Purpose | Params |
|--------|----------|---------|--------|
| GET | `/api/drafts` | Fetch all drafts | `status`, `format`, `scheduled_date_from`, `scheduled_date_to`, `skip`, `limit` |
| POST | `/api/drafts` | Create new draft | Body: `{ idea_id, scheduled_date, scheduled_time }` |
| PUT | `/api/drafts/:id` | Update draft | Body: `{ caption, hashtags[], scheduled_date, status }` |
| DELETE | `/api/drafts/:id` | Delete draft | — |

### Calendar
| Method | Endpoint | Purpose | Params |
|--------|----------|---------|--------|
| GET | `/api/calendar/week` | Get week's schedule | `week_start` (ISO date) |
| POST | `/api/calendar/auto-suggest` | Get optimal schedule | — |

### Hashtags
| Method | Endpoint | Purpose | Query |
|--------|----------|---------|-------|
| GET | `/api/hashtags/trending` | Fetch trending hashtags | `category` (optional) |

### Settings
| Method | Endpoint | Purpose | Body |
|--------|----------|---------|------|
| GET | `/api/settings` | Fetch user settings | — |
| PUT | `/api/settings` | Update settings | `{ research_sweep_time, email_enabled, slack_enabled, ... }` |

---

## DATA MODELS (Prisma Schema)

### ResearchItem
```
id: String @id @default(cuid())
title: String
snippet: String (500 max)
fullUrl: String
source: String (enum: hn, reddit, google, techcrunch, blog)
category: String (enum: AI News, AI Tools, Trends, Tips)
relevanceScore: Float (0-10)
isRead: Boolean @default(false)
isStarred: Boolean @default(false)
isArchived: Boolean @default(false)
publishedAt: DateTime
discoveredAt: DateTime @default(now())
createdAt: DateTime @default(now())
```

### ContentIdea
```
id: String @id @default(cuid())
researchItemIds: String[] (JSON array of research IDs)
format: String (enum: reel_hook, carousel, story, caption)
conceptVariation: Int (1-5)
aiGeneratedCaption: String
aiHook: String
tone: String (enum: Educational, Breaking, Opinion, Hype)
generatedBy: String (enum: claude, gpt4, both)
userEdited: Boolean @default(false)
createdAt: DateTime @default(now())
```

### ContentDraft
```
id: String @id @default(cuid())
ideaId: String @unique? (can be null if user writes from scratch)
title: String
caption: String
format: String (enum: reel, carousel, story, caption)
carouselSlides: Json? (array of {title, copy, image_url} if carousel)
hashtags: String[] (array)
scheduledDate: DateTime
scheduledTime: String (HH:MM format)
status: String (enum: draft, scheduled, published)
publishedAt: DateTime?
userNotes: String?
createdAt: DateTime @default(now())
updatedAt: DateTime @updatedAt
```

### PublishedPost
```
id: String @id @default(cuid())
draftId: String @unique
instagramPostId: String?
format: String
publishedAt: DateTime @default(now())
likes: Int @default(0)
comments: Int @default(0)
shares: Int @default(0)
saves: Int @default(0)
reach: Int @default(0)
impressions: Int @default(0)
lastSynced: DateTime @default(now())
```

### HashtagTrending
```
id: String @id @default(cuid())
hashtag: String @unique
category: String (enum: AI, Tech, Creator, General)
searchVolume: Int
growthRate: Float
isFavorite: Boolean @default(false)
lastUpdated: DateTime @default(now())
```

### UserSettings
```
id: String @id @default(cuid())
researchSweepTime: String @default("08:00")
researchSweepEnabled: Boolean @default(true)
dataSourcesEnabled: Json (e.g., {google: true, rss: true, scrape: true})
contentCategories: String[] (default: ["AI News", "AI Tools", "Trends", "Tips"])
relevanceThreshold: Int @default(5)
emailDigestEnabled: Boolean @default(true)
emailDigestFrequency: String (enum: daily, weekly)
slackEnabled: Boolean @default(false)
slackWebhookUrl: String? (encrypted)
slackChannel: String?
timezone: String @default("America/Los_Angeles")
bestPostingTimes: Json (e.g., {monday: ["09:00", "18:00"], ...})
contentMixGoal: Json (e.g., {reels: 40, carousels: 40, stories: 20})
createdAt: DateTime @default(now())
updatedAt: DateTime @updatedAt
```

---

## RESEARCH ENGINE: SOURCE PRIORITIES

### Tier 1: Structured APIs (fastest, most reliable)
- **Google Custom Search API**: keyword queries ("AI news", "tech trends")
- **Perplexity API**: question-based queries ("Top 10 AI breakthroughs this week?")

### Tier 2: RSS Feeds (reliable, near real-time)
- HackerNews official RSS
- Reddit RSS (/r/MachineLearning, /r/artificial)
- TechCrunch RSS
- VentureBeat RSS
- OpenAI blog RSS
- DeepMind blog RSS

### Tier 3: Web Scraping (fallback, high effort)
- Hugging Face updates
- ArXiv papers (new releases)
- Product Hunt (new AI tools)

**Cron job (8am):** runs all sources in parallel, deduplicates, scores, stores.

---

## IDEATION ENGINE: PROMPT TEMPLATES

### Claude Prompt
```
Topic: [research title & snippet]
Target Audience: Mixed (builders, creators, students, non-technical folks)
Platform: Instagram

Generate 3 content ideas for this topic. For each idea:
- Format: Choose one—Reel hook, Carousel (5 slides), Story, or Caption
- Hook (first 1-2 lines): Compelling, curiosity-driven, stop-the-scroll
- Full caption: 200-300 words. Include 1-2 actionable takeaways, concrete examples.
- Tone: Choose one—Educational, Breaking News, Opinion, Hype

Return ONLY valid JSON (no markdown):
[
  {
    "format": "reel_hook",
    "hook": "...",
    "caption": "...",
    "tone": "Educational"
  },
  ...
]
```

### Hashtag Generation
```
Topic: [topic]
Format: [reel/carousel/story/caption]

Generate 15 hashtags: 5 trending (current & relevant), 5 evergreen (always relevant), 5 niche (specific to topic).

Return JSON array: ["#hashtag1", "#hashtag2", ...]
```

---

## NOTIFICATION FORMATS

### Email Digest
```
Subject: ContentIQ Daily Brief — [Date]

From: ContentIQ <noreply@contentiq.app>
To: [user email]

---

Good morning! 🌅

Here are your top 10 research findings for today:

1. [TITLE 1]
   Source: HackerNews | Relevance: 9/10
   [snippet excerpt]
   
2. [TITLE 2]
   Source: Reddit | Relevance: 8/10
   [snippet excerpt]

[... 8 more items ...]

➡️ Review & ideate in ContentIQ: https://contentiq.app

---
Trending hashtags this week: #LLMs #AIAgents #PromptEngineering
Last updated: [timestamp]
```

### Slack Message
```
📊 Daily Research Sweep Complete!

Found 47 items | 18 new articles

Top 3 trending:
• Claude 3.5 Sonnet's Reasoning Improvements (Score: 9.8)
• Anthropic Releases New Safety Framework (Score: 9.6)
• OpenAI Hints at GPT-5 Timeline (Score: 9.2)

👉 Review & ideate in ContentIQ
```

---

## ENVIRONMENT VARIABLES (Backend)

```bash
# Core
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_URL=file:./dev.db
# Or: postgresql://user:password@host:port/dbname

# AI APIs
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=...
GOOGLE_SEARCH_ENGINE_ID=...
PERPLEXITY_API_KEY=... (optional)

# Email
EMAIL_SERVICE=sendgrid  # or nodemailer
SENDGRID_API_KEY=... (if SendGrid)
SMTP_HOST=smtp.gmail.com  # (if Nodemailer)
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=app-password-16-chars

# Slack
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Research
RESEARCH_SWEEP_TIME=08:00
RESEARCH_SWEEP_TIMEZONE=America/Los_Angeles

# Logging
LOG_LEVEL=info
SENTRY_DSN=... (optional)
```

---

## FRONTEND ENVIRONMENT VARIABLES

```bash
VITE_API_URL=http://localhost:5000
VITE_APP_NAME=ContentIQ
```

---

## COMPONENT HIERARCHY

```
App.tsx
├── Dashboard.tsx (main layout)
│   ├── Header.tsx
│   ├── Sidebar.tsx (8 tabs)
│   └── TabContent (switches based on activeTab)
│       ├── ResearchTab/
│       │   ├── FilterBar.tsx
│       │   └── ResearchGrid.tsx (many ResearchCard.tsx)
│       ├── IdeationTab/
│       │   ├── ConceptGenerator.tsx
│       │   └── ConceptDisplay.tsx (many ConceptCard.tsx)
│       ├── DraftsTab/
│       │   ├── DraftsList.tsx (many DraftCard.tsx)
│       │   └── DraftEditor.tsx (modal)
│       ├── CalendarTab/
│       │   ├── WeeklyCalendar.tsx
│       │   └── AutoSuggestModal.tsx
│       ├── CaptionsTab/
│       │   ├── CaptionSearch.tsx
│       │   ├── CaptionLibrary.tsx
│       │   └── QuickGenerator.tsx
│       ├── HashtagsTab/
│       │   ├── TrendingList.tsx
│       │   └── MyStack.tsx
│       ├── FormatTabs/ (Reels, Posts, Stories)
│       └── SettingsTab/
│           ├── ResearchSettings.tsx
│           ├── NotificationSettings.tsx
│           └── APIKeyForm.tsx
```

---

## KEY PACKAGES & VERSIONS

### Backend
```json
{
  "express": "^4.18.2",
  "prisma": "^5.x.x",
  "@prisma/client": "^5.x.x",
  "node-cron": "^3.0.2",
  "axios": "^1.6.2",
  "@slack/bolt": "^3.x.x",
  "nodemailer": "^6.9.x",
  "dotenv": "^16.3.1",
  "zod": "^3.22.4",
  "pino": "^8.x.x",
  "typescript": "^5.x.x",
  "ts-node": "^10.x.x"
}
```

### Frontend
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "vite": "^5.x.x",
  "tailwindcss": "^3.3.x",
  "zustand": "^4.4.x",
  "axios": "^1.6.x",
  "react-big-calendar": "^1.8.x",
  "recharts": "^2.10.x"
}
```

---

## DEVELOPMENT WORKFLOW

### Local Dev Loop
```bash
# Terminal 1: Backend
cd backend
npm run dev  # Watch mode with ts-node

# Terminal 2: Frontend
cd frontend
npm run dev  # Vite dev server on :3000

# Terminal 3: Monitor logs
cd backend
npm run logs  # or `tail -f logs/app.log`

# Test API endpoints
curl http://localhost:5000/api/research

# Trigger manual research sweep
curl -X POST http://localhost:5000/api/research/refresh
```

### Database Migrations
```bash
# Create migration
npx prisma migrate dev --name add_hashtag_table

# Deploy migration
npx prisma migrate deploy

# Reset database (dev only)
npx prisma migrate reset

# View data
npx prisma studio  # Opens GUI at localhost:5555
```

---

## COMMON ISSUES & FIXES

| Issue | Cause | Fix |
|-------|-------|-----|
| CORS errors | Frontend on :3000, backend on :5000 | Check `app.use(cors())` in backend |
| API key 401 | Missing or invalid API key in .env | Verify ANTHROPIC_API_KEY, OPENAI_API_KEY |
| Cron not running | Job not initialized | Check `initializeCronJobs()` in server.ts |
| Database locked | SQLite file locked by another process | Kill other node processes, restart |
| Prisma client error | Schema out of sync with client | Run `npx prisma generate` |
| Email not sending | SMTP config wrong | Test credentials in Nodemailer docs |
| Slack message failed | Webhook URL expired or invalid | Reconnect Slack in Settings |

---

## PERFORMANCE NOTES

- **Research sweep:** Should complete in <30s (parallel API calls)
- **Ideation generation:** 5-10s per request (Claude + GPT API latency)
- **Dashboard load:** <2s (fetch all tabs' data)
- **Calendar drag-drop:** Sub-100ms (local state update)
- **Database queries:** Index on `source`, `category`, `scheduled_date`, `status`

---

## SECURITY CHECKLIST

- [ ] API keys in .env (never in code or repo)
- [ ] .env.local added to .gitignore
- [ ] CORS configured to allow only localhost (dev) / specific domains (prod)
- [ ] Slack token encrypted at rest (consider AWS Secrets Manager for prod)
- [ ] Input validation with Zod on all routes
- [ ] Error messages don't leak internal details (e.g., "Invalid API key" not "Claude API: 401 Unauthorized")
- [ ] HTTPS enforced in cloud deployment
- [ ] Database connection uses TLS in production

---

## USEFUL COMMANDS

```bash
# Start from scratch
npm install
npx prisma migrate dev

# Development
npm run dev (starts both backend & frontend)

# Production build
npm run build
npm start

# Database debugging
npx prisma studio

# Format code
npm run format

# Lint
npm run lint

# Test
npm run test

# Docker
docker-compose up
docker-compose down
```

---

## METRICS TO TRACK

- Research items discovered per day
- Ideation requests per week
- Drafts created vs. published ratio
- Average time from research to published content
- Engagement metrics per post (likes, comments, saves)
- Top-performing content formats & posting times
- User engagement with app (DAU, feature adoption)

---

**Ready to build? Copy this card + the full spec into Claude Code and start executing! 🚀**
