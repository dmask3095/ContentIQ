# ContentIQ: Your Launch Checklist & Onboarding Guide

---

## 📋 WHAT YOU'VE BEEN GIVEN

You now have **3 comprehensive documents** that define ContentIQ completely:

### 1. **ContentIQ_SPEC.md** (15 sections, complete PRD)
   - Full product vision, user flows, data models
   - 8 dashboard tabs defined in detail
   - Technology stack, API integrations, deployment strategy
   - This is your **source of truth**

### 2. **ContentIQ_IMPLEMENTATION_GUIDE.md** (10-step tactical guide)
   - Step-by-step prompts for Claude Code
   - Exactly what to ask for at each phase
   - File structure, dependencies, code organization
   - This is your **build roadmap**

### 3. **ContentIQ_QUICK_REFERENCE.md** (cheat sheet)
   - API endpoints table
   - Data model schemas (copy-paste ready)
   - Prompt templates for AI ideation
   - Environment variables checklist
   - This is your **debugging companion**

---

## 🚀 HOW TO USE THESE FILES WITH CLAUDE CODE

### Option A: Step-by-Step (Recommended for learning)
```
1. Open all 3 files in VS Code (side-by-side)
2. Copy ContentIQ_SPEC.md into Claude Code chat
3. Copy ContentIQ_IMPLEMENTATION_GUIDE.md
4. Prompt Claude Code:
   "Execute STEP 1: Project Initialization"
5. Wait for completion (~2-3 min)
6. Review the generated files
7. Ask: "Execute STEP 2: Database Schema"
8. Repeat through STEP 10
```

**Pros:** You learn the codebase, can pause/adjust, catch issues early
**Time:** ~45-60 min of interaction (but code generation runs fast)

### Option B: Full Build (Fastest)
```
1. Copy all 3 files into Claude Code
2. Single prompt:
   "You are an expert full-stack TypeScript developer. 
    Using the ContentIQ spec and implementation guide provided, 
    build the complete full-stack application including:
    - Backend (Express + Prisma + services + routes)
    - Frontend (React + Vite + Tailwind components)
    - Database schema (Prisma)
    - Docker setup
    - .env.example
    
    Generate all files ready to run locally."
3. Claude Code generates everything in one pass
4. Download the generated repo
5. Review the code quality
```

**Pros:** Fastest, everything in one shot
**Cons:** Harder to catch issues, longer review time
**Time:** ~10-15 min generation + 30 min review

### Option C: Hybrid (Best if you have specific tech preferences)
```
1. Generate core infrastructure (STEPS 1-4):
   "Execute STEPS 1-4 (Initialization, Schema, Backend Services, Cron Jobs)"
2. Review, adjust, ask questions
3. Then generate frontend (STEPS 5-7):
   "Execute STEPS 5-7 (Frontend Components, Hooks, State Management)"
4. Review, adjust
5. Finally deployment configs (STEPS 8-10)
```

**Best for:** You have preferences on folder structure or styling approach
**Time:** ~30 min interaction time

---

## 🛠️ BEFORE YOU START

### Gather These API Keys
You'll need these to run the app locally. Get them now:

```
☐ Anthropic Claude API key
  → https://console.anthropic.com/account/keys
  → Free tier: $5 credit, then pay-as-you-go
  → Cost: ~$0.003-0.03 per 1K tokens

☐ OpenAI GPT-4 API key
  → https://platform.openai.com/account/api-keys
  → Must have paid account (add payment method)
  → Cost: ~$0.03-0.06 per 1K tokens

☐ Google Custom Search API key
  → https://console.cloud.google.com
  → Create project → Enable Custom Search API
  → Generate API key
  → Cost: ~$5/mo for 100 queries/day

☐ Slack Bot Token (for notifications)
  → https://api.slack.com/apps
  → Create new app → pick workspace
  → OAuth & Permissions → generate Bot Token
  → Cost: Free (if you own the workspace)

☐ Email Service (Nodemailer + Gmail app password OR SendGrid)
  Option 1 - Gmail:
  → https://myaccount.google.com/apppasswords
  → Generate app-specific password (16 chars)
  → Cost: Free
  
  Option 2 - SendGrid:
  → https://sendgrid.com (free tier: 100 emails/day)
  → Generate API key
  → Cost: Free for 100/day, $30/mo for more

Optional:
☐ Perplexity API (for enhanced search)
☐ Sentry (for error tracking in production)
```

**Total setup time:** ~15-20 min

---

## 💻 SYSTEM REQUIREMENTS

```
✅ Node.js 18+ (check: node --version)
✅ npm or yarn
✅ Git (for version control)
✅ Docker & Docker Compose (for containerized local dev)
✅ VS Code (recommended)
✅ 4GB+ RAM (for running backend + frontend + DB simultaneously)
```

---

## 📁 PROJECT STRUCTURE AFTER GENERATION

Once Claude Code finishes, you'll have:

```
contentiq/
├── backend/
│   ├── src/
│   │   ├── routes/          [8 API routes]
│   │   ├── services/        [research, ideation, email, slack]
│   │   ├── jobs/            [cron jobs]
│   │   ├── prisma/          [schema.prisma]
│   │   └── utils/           [API clients, logger]
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/      [8 tabs + common]
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── store/           [Zustand state]
│   │   └── types/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── Dockerfile
│
├── docker-compose.yml
├── .gitignore
└── README.md
```

Total files: ~60-80 source files

---

## 🏃 QUICK START (After generation)

### 1. Setup (5 min)
```bash
# Clone/extract the generated repo
cd contentiq

# Copy backend env file & add your API keys
cp backend/.env.example backend/.env.local

# Edit backend/.env.local and fill in:
# ANTHROPIC_API_KEY=sk-ant-...
# OPENAI_API_KEY=sk-...
# etc. (see API Keys section above)
```

### 2. Install Dependencies (3 min)
```bash
# Backend
cd backend && npm install
npx prisma migrate dev

# Frontend
cd ../frontend && npm install

# Back to root
cd ..
```

### 3. Run Locally (1 min)
```bash
# Option A: Manual (two terminals)

# Terminal 1: Backend
cd backend && npm run dev
# Logs: "Server running on http://localhost:5000"

# Terminal 2: Frontend
cd frontend && npm run dev
# Logs: "Local: http://localhost:3000"

# Option B: Docker (one command)
docker-compose up
# Logs show both running
```

### 4. Access
```
Frontend: http://localhost:3000
Backend API: http://localhost:5000/api/research
Prisma Studio: http://localhost:5555
```

---

## ✅ VALIDATION CHECKLIST

After generation, test these:

### Backend Validation
```bash
# Terminal in backend/

# 1. Database setup
npx prisma migrate dev
npx prisma studio  # Should open GUI

# 2. API endpoints
curl http://localhost:5000/api/research
curl http://localhost:5000/api/hashtags/trending
curl -X POST http://localhost:5000/api/research/refresh

# 3. Environment check
npm run dev
# Should see: "Server running on port 5000"

# 4. Cron job initialization
# Check logs for: "Research sweep scheduled for 08:00"
```

### Frontend Validation
```bash
# Terminal in frontend/

# 1. Build
npm run dev
# Should see: "Local: http://localhost:3000"

# 2. Open in browser
# http://localhost:3000

# 3. Check console
# Open DevTools (F12) → Console
# Should have NO errors, only React warnings maybe

# 4. Try clicking tabs
# Research, Ideation, Drafts, Calendar, etc.
# Should load without crashing
```

---

## 🐛 COMMON ISSUES & QUICK FIXES

| Issue | Symptom | Fix |
|-------|---------|-----|
| **Port 5000 in use** | Backend fails to start | `lsof -i :5000` then `kill -9 <PID>` |
| **No .env.local** | Backend crashes on startup | Copy `.env.example` to `.env.local` & fill in API keys |
| **Missing ANTHROPIC_API_KEY** | API calls fail with 401 | Get key from https://console.anthropic.com/account/keys |
| **Prisma client error** | "PrismaClient not found" | Run `npx prisma generate` |
| **CORS error in browser** | "Access-Control-Allow-Origin missing" | Check backend has `cors()` middleware |
| **Vite can't connect to backend** | Network error in browser | Backend not running on :5000, or VITE_API_URL wrong |
| **Database locked** | "Database is locked" error | Kill all node processes, restart |
| **npm install fails** | Dependency conflicts | Try `npm install --legacy-peer-deps` |

---

## 🔑 KEY FEATURES TO TEST FIRST

After setup, test these in order:

### 1. Research Tab
- [ ] Click "Research" tab
- [ ] Should show empty or mock items
- [ ] Try filtering by category
- [ ] Click "Ideate Now" on an item

### 2. Settings Tab
- [ ] Fill in API keys (Claude, GPT)
- [ ] Set research sweep time to 8am
- [ ] Toggle email digest on/off
- [ ] Save settings

### 3. Ideation Tab
- [ ] Select 1-2 research items
- [ ] Click "Generate Concepts"
- [ ] Wait 5-10 seconds
- [ ] See 3-5 concepts generated
- [ ] Edit a caption
- [ ] Save as draft

### 4. Drafts Tab
- [ ] See saved draft from above
- [ ] Click "Edit"
- [ ] Change caption, add hashtags
- [ ] Save

### 5. Calendar Tab
- [ ] See draft on scheduled date
- [ ] Drag it to a different day
- [ ] Click "Auto Suggest"
- [ ] See recommendations populate

---

## 📊 TESTING YOUR RESEARCH ENGINE

Once everything is running:

```bash
# Manually trigger a research sweep
curl -X POST http://localhost:5000/api/research/refresh

# Should return:
# { items_found: 25, items_added: 22, timestamp: "2024-06-23T..." }

# Check database
npx prisma studio
# Navigate to research_items table
# Should see 20+ new items with titles, sources, relevance scores

# Check email/Slack
# You should get a digest email + Slack message within 1 min
```

---

## 🌐 DEPLOY TO CLOUD

Once happy locally, deploy:

### Option 1: Railway (Easiest)
```
1. Create Railway account: https://railway.app
2. Create new project
3. Add GitHub repo
4. Connect backend/ folder
5. Add PostgreSQL plugin
6. Set environment variables from .env.local
7. Deploy → auto-triggers on git push
```

### Option 2: Vercel (Frontend) + Railway (Backend)
```
1. Deploy frontend to Vercel:
   - Link GitHub repo (frontend/ folder)
   - Set VITE_API_URL=https://your-railway-backend.com
   - Deploy

2. Deploy backend to Railway (see Option 1)
```

### Option 3: Docker Hub + Cloud Run
```
1. Push Docker images to Docker Hub
2. Deploy from Cloud Run / ECS
3. (More advanced, for later)
```

---

## 📞 WHEN TO ITERATE

After you have the MVP running, these are good second improvements:

### Week 1
- [ ] Fix any UI/UX issues you spot
- [ ] Tweak research sweep time
- [ ] Add 3-5 custom RSS feeds you like

### Week 2
- [ ] Run your first full research sweep
- [ ] Generate your first content idea
- [ ] Create & schedule your first post
- [ ] Get feedback from friends

### Week 3
- [ ] Measure post engagement
- [ ] Adjust content mix (more reels vs carousels?)
- [ ] Refine AI prompts for better captions
- [ ] Consider image generation feature

### Week 4+
- [ ] Explore auto-posting to Instagram API
- [ ] Add multi-user support (for team collaboration)
- [ ] Implement analytics dashboard
- [ ] Scale to handle 100+ research items/day

---

## 📚 HELPFUL RESOURCES

- **Anthropic Docs**: https://docs.anthropic.com
- **Express.js Guide**: https://expressjs.com
- **Prisma Docs**: https://www.prisma.io/docs
- **React Docs**: https://react.dev
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Node-cron**: https://github.com/node-cron/node-cron
- **Slack Bot Docs**: https://slack.dev/bolt-js

---

## 🎯 SUCCESS METRICS (First 30 Days)

- **Day 1**: App running locally, no crashes
- **Day 3**: First research sweep completes, 20+ items found
- **Day 5**: First content idea generated & saved as draft
- **Day 7**: First post published from ContentIQ draft
- **Day 14**: 3-4 posts published, tracking engagement
- **Day 30**: Publishing 5-7 posts/week, using all dashboard tabs regularly

---

## 🚀 YOU'RE READY!

Everything you need is in these three documents:
1. **ContentIQ_SPEC.md** — What to build
2. **ContentIQ_IMPLEMENTATION_GUIDE.md** — How to build it
3. **ContentIQ_QUICK_REFERENCE.md** — Quick lookup while building

### Next Step:
**Copy all 3 files into Claude Code** and choose your execution path (A, B, or C above).

Good luck! Questions? Ask Claude Code or revisit the spec docs for clarification. 🎉

---

## 📝 NOTES FOR YOU

- **Backup your .env.local** — Don't commit to GitHub!
- **Save your API keys securely** — Consider using 1Password, LastPass, or env-vault
- **Start with basics** — Email can wait, Slack can wait. Focus on core research + ideation first.
- **Test with mock data** — Don't wait for real research items. Mock 5-10 items for early UI testing.
- **Version control early** — Git init after generation, commit frequently
- **Ask Claude Code questions** — It can explain any generated code or help debug

---

**Created:** June 2026
**For:** Sejal Kishor Daterao
**Project:** ContentIQ — AI-Powered Content Research & Generation Platform
