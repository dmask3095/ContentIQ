# ContentIQ

AI-powered content research & generation platform. Daily research sweeps surface AI/tech news, then Claude + GPT turn it into Instagram-ready Reels, Carousels, and Stories.

Full product details live in [ContentIQ_SPEC.md](ContentIQ_SPEC.md). Build steps live in [ContentIQ_IMPLEMENTATION_GUIDE.md](ContentIQ_IMPLEMENTATION_GUIDE.md).

This repo is currently scaffolded through **STEP 1: Project Initialization** — folder structure, configs, and a minimal running server/app. Routes, services, jobs, Prisma models, and UI components are added in subsequent steps.

## Stack

- **Backend**: Express + TypeScript, Prisma (SQLite locally / PostgreSQL in prod), node-cron, Claude + OpenAI SDKs
- **Frontend**: React 18 + Vite, Tailwind CSS, Zustand
- **Deployment**: Docker Compose locally; Railway (backend) + Vercel (frontend) in the cloud

## Project layout

```
contentiq/
├── backend/    Express API (src/routes, services, jobs, middleware, prisma)
├── frontend/   React app (src/components, pages, hooks, types)
└── docker-compose.yml
```

## Getting started

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

Fill in `backend/.env` with your API keys (Anthropic, OpenAI, Google, Slack, SMTP/SendGrid). The app boots fine with these blank for now — they're only needed once the research/ideation services are wired up in later steps.

### 3. Set up the database

```bash
npm run db:generate
npm run db:migrate
```

### 4. Run in development

```bash
npm run dev
```

- Backend: http://localhost:5000 (health check at `/health`)
- Frontend: http://localhost:3000

### Docker

```bash
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- Postgres (cloud-prep, optional): localhost:5432

## Scripts (root)

| Script | Purpose |
|---|---|
| `npm run dev` | Run backend + frontend dev servers concurrently |
| `npm run build` | Build both workspaces |
| `npm run typecheck` | Type-check both workspaces |
| `npm run db:migrate` | Run Prisma migrations (backend) |
| `npm run db:studio` | Open Prisma Studio |
