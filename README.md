# DhanPe

DhanPe is a split-repo style project with:

- a Node.js + TypeScript backend in `backend/`
- a Flutter frontend in `frontend/`
- Cashfree-based payment and webhook flows

This repository is set up for local development first. Production values should be injected by your hosting platform and never committed.

## What Exists Today

- Auth endpoints for signup, login, refresh, and logout
- Transfer creation through Cashfree-backed backend routes
- In-app KYC completion before transfer confirmation
- Cashfree webhook ingestion and transaction lifecycle tracking
- PostgreSQL with Prisma migrations
- Flutter app configured for local and deployed backend targets

## Repository Layout

```text
backend/   Express + TypeScript API, Prisma schema, tests
frontend/  Flutter application
README.md  Project overview and quick start
HUMANS.md  Guide for human contributors
AGENTS.md  Guide for AI/code agents
```

## Quick Start

### Backend

```bash
cd backend
npm install
cp .env.development .env
npm run db:generate
npm run db:migrate
npm run dev
```

Backend defaults to `http://localhost:3000`.

### Frontend

```bash
cd frontend
flutter pub get
flutter run
```

For a non-default backend, pass a compile-time override:

```bash
flutter run --dart-define=DHANPE_API_BASE_URL=http://localhost:3000/api
```

Current frontend target defaults:

- Web debug uses the production backend
- Android emulator debug uses `http://10.0.2.2:3000/api`
- `DHANPE_API_BASE_URL` overrides both

## Environment Files

Backend example envs live here:

- `backend/.env.development`
- `backend/.env.production`
- `backend/.env.example`

Notes:

- `.env.development` is the safe local template.
- `.env.production` documents required production keys with placeholder values only.
- `.env.example` mirrors the local template for tools and contributor habits that expect it.
- The Flutter app does not load `.env` files. It uses `--dart-define`, documented in the contributor guides.

## Current Backend Surface

Primary routes exposed by the app today:

- `GET /`
- `GET /health`
- `GET /health/ready`
- `GET /docs/openapi.json`
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/users/profile`
- `PATCH /api/users/profile`
- `POST /api/users/kyc/complete`
- `POST /api/transfer`
- `GET /api/transaction/:id`
- `POST /api/webhook/cashfree`

## Contributor Docs

- Human contributors: [HUMANS.md](/d:/Personal%20Data/dhanPe-local/dhanPe/HUMANS.md)
- AI contributors: [AGENTS.md](/d:/Personal%20Data/dhanPe-local/dhanPe/AGENTS.md)
- Backend details: [backend/README.md](/d:/Personal%20Data/dhanPe-local/dhanPe/backend/README.md)
- Frontend details: [frontend/README.md](/d:/Personal%20Data/dhanPe-local/dhanPe/frontend/README.md)

## Deployment Notes

- Keep secrets out of git.
- Inject production env vars from the deployment platform.
- Use `backend/.env.production` only as a checklist/template, not as a committed secrets file.
- Set Flutter production API endpoints with `--dart-define=DHANPE_API_BASE_URL=...`.
