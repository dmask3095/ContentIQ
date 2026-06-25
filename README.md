# ContentIQ

AI-powered content research & generation platform. Daily research sweeps surface AI/tech content about using AI to automate tasks and grow income, then Gemini turns it into Instagram-ready Reels, Carousels, and Stories — reel scripts sized for a 30-second voiceover.

Full product details live in [ContentIQ_SPEC.md](ContentIQ_SPEC.md). Build steps live in [ContentIQ_IMPLEMENTATION_GUIDE.md](ContentIQ_IMPLEMENTATION_GUIDE.md).

## What's working

- **Research**: daily crawl across RSS feeds, web scraping, and Google Custom Search, deduplicated and scored for relevance
- **Ideation**: Gemini-generated Reel/Carousel/Story/Caption concepts, framed around AI leverage for productivity and profit (not news reporting)
- **Drafts, Calendar, Captions, Trending Hashtags**: full CRUD, drag-to-reschedule weekly calendar, caption library + quick generator
- **Settings**: research sweep config, notification preferences, API key status
- Backend unit/integration tests (Vitest), a React error boundary, and a Docker Compose setup that's been built and run for real

## Stack

- **Backend**: Express + TypeScript, Prisma + PostgreSQL, node-cron, Google Gemini SDK (Claude/OpenAI SDKs wired up but dormant — see `backend/src/utils/apiClients.ts`)
- **Frontend**: React 18 + Vite, Tailwind CSS, Zustand
- **Deployment**: Docker Compose locally; [Render](https://render.com) (backend, free tier) + [Neon](https://neon.tech) (Postgres, free tier) + [Vercel](https://vercel.com) (frontend, free tier) in the cloud — single shared instance, no per-user accounts (see Known limitations below)

**Live**: https://content-iq-frontend.vercel.app (backend: https://contentiq-zdhg.onrender.com)

## Project layout

```
contentiq/
├── backend/    Express API (src/routes, services, jobs, middleware, prisma)
├── frontend/   React app (src/components, pages, hooks, types)
└── docker-compose.yml
```

## Getting started (local dev)

### 1. Install dependencies

```bash
npm install
```

This installs both `backend` and `frontend` workspaces from the root.

### 2. Configure environment variables

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Fill in `backend/.env` with at least `GEMINI_API_KEY` (free, no credit card — get one at [aistudio.google.com](https://aistudio.google.com)) to use Ideation/Captions. Everything else (Google Custom Search, SMTP, Slack) is optional; the app degrades gracefully without them.

### 3. Start Postgres and run migrations

```bash
docker-compose up -d postgres
npm run db:generate
npm run db:migrate
```

`backend/.env.example`'s `DATABASE_URL` already points at the docker-compose Postgres service.

### 4. Run in development

```bash
npm run dev
```

- Backend: http://localhost:5000 (health check at `/health`)
- Frontend: http://localhost:3000

### Run tests

```bash
npm run test -w backend
```

### Docker (full stack)

```bash
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- Postgres: localhost:5432

## Deploying (shared instance)

This app is deployed as **one shared instance**, entirely on free tiers — there's no login, so anyone with the URL sees and edits the same research feed, drafts, and settings. That's an intentional tradeoff for simplicity, not an oversight; see Known limitations.

- **Database**: [Neon](https://neon.tech) free Postgres — sign in with GitHub, create a project, copy the connection string
- **Backend**: [Render](https://render.com) free web service — sign in with GitHub, new Web Service from this repo, **Root Directory** = `backend`, **Runtime** = Docker (uses `backend/Dockerfile`, which runs migrations automatically on boot). Env vars: `DATABASE_URL` (from Neon), `GEMINI_API_KEY`, `GOOGLE_API_KEY`, `GOOGLE_SEARCH_ENGINE_ID`, `NODE_ENV=production`, and `FRONTEND_URL` (set after the frontend is deployed)
- **Frontend**: [Vercel](https://vercel.com) free hobby plan — import this repo, **Root Directory** = `frontend`, env var `VITE_API_URL` = your Render backend's URL
- After both are up, set `FRONTEND_URL` on Render to the Vercel URL (needed for CORS) and redeploy

**Render's free tier spins down after 15 min idle** (cold start ~50s on next request), which means the 8am daily sweep and 6-hour hashtag job won't fire reliably unless something pings `/health` periodically. A free [UptimeRobot](https://uptimerobot.com) monitor (5 min interval) fixes this — currently not set up; the app works fine without it, scheduled jobs just aren't guaranteed to fire on time.

## Known limitations

- **No authentication / multi-user accounts.** Everyone using the deployed link shares the same data and the same Gemini free-tier quota (20 requests/day on the current model). This was a deliberate choice for simplicity over building real auth — see `ContentIQ_SPEC.md` section 15.
- **No keep-alive ping configured** — see the Render note above. Scheduled cron jobs may not fire if the instance is asleep; manual "Refresh Research" always works since it wakes the instance on request.
- Claude/GPT-4 are wired up in code but dormant (no billing configured) — Gemini is the active AI provider.
- No Instagram auto-posting, full analytics dashboard, or historical hashtag charts yet — explicitly "future phase" in the original spec.

## Scripts (root)

| Script | Purpose |
|---|---|
| `npm run dev` | Run backend + frontend dev servers concurrently |
| `npm run build` | Build both workspaces |
| `npm run typecheck` | Type-check both workspaces |
| `npm run db:migrate` | Run Prisma migrations (backend) |
| `npm run db:studio` | Open Prisma Studio |
