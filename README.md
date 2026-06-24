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
- **Deployment**: Docker Compose locally; Railway (backend + Postgres) + Vercel (frontend) in the cloud — single shared instance, no per-user accounts (see Known limitations below)

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

This app is deployed as **one shared instance** — there's no login, so anyone with the URL sees and edits the same research feed, drafts, and settings. That's an intentional tradeoff for simplicity, not an oversight; see Known limitations.

- **Backend + Postgres**: [Railway](https://railway.app) — new project, add a Postgres plugin, deploy `backend/` as a service, set the env vars from `backend/.env.example` (Railway provides `DATABASE_URL` automatically once Postgres is attached)
- **Frontend**: [Vercel](https://vercel.com) — import `frontend/` as the project root, set `VITE_API_URL` to your Railway backend's public URL
- After deploying, update `FRONTEND_URL` in the backend's env vars to your Vercel URL (needed for CORS)

## Known limitations

- **No authentication / multi-user accounts.** Everyone using the deployed link shares the same data and the same Gemini free-tier quota (20 requests/day on the current model). This was a deliberate choice for simplicity over building real auth — see `ContentIQ_SPEC.md` section 15.
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
