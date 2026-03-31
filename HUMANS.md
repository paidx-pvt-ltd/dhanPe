# Human Contributor Guide

This is the shortest path for a developer to get productive in this repo.

## Stack

- Backend: Node.js, TypeScript, Express, Prisma, PostgreSQL
- Frontend: Flutter, Provider, Dio
- Payments: Cashfree

## Local Setup

### Backend

```bash
cd backend
npm install
cp .env.development .env
npm run db:generate
npm run db:migrate
npm run dev
```

### Frontend

```bash
cd frontend
flutter pub get
flutter run
```

Optional API override:

```bash
flutter run --dart-define=DHANPE_API_BASE_URL=http://localhost:3000/api
```

## Files You Should Know

- `backend/src/app.ts`: route wiring, middleware, CORS, health endpoints
- `backend/src/config/index.ts`: env parsing and validation
- `backend/prisma/schema.prisma`: data model
- `frontend/lib/config/config.dart`: API target selection
- `frontend/lib/services/`: backend integration layer
- `frontend/lib/providers/`: app state

## Backend Commands

```bash
npm run dev
npm run build
npm start
npm test
npm run test:coverage
npm run lint
npm run format
npm run db:generate
npm run db:migrate
npm run db:seed
```

## Frontend Commands

```bash
flutter pub get
flutter analyze
flutter test
flutter run
flutter build apk
```

## Environment Rules

- Use `backend/.env.development` for local work.
- Treat `backend/.env.production` as a reference only.
- Never commit real secrets.
- Flutter configuration is compile-time based; use `--dart-define` instead of adding frontend secrets to source.

## API Routes That Matter

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/users/profile`
- `PATCH /api/users/profile`
- `POST /api/transfer`
- `GET /api/transaction/:id`
- `POST /api/webhook/cashfree`

## Before You Commit

Run the checks relevant to your change.

```bash
cd backend
npm test
npm run lint
```

```bash
cd frontend
flutter analyze
flutter test
```

If you changed only docs or env templates, a quick review plus `git diff --check` is usually enough.

## Commit Expectations

- Keep commits scoped.
- Do not commit `.env` or secrets.
- Update docs when behavior changes.
- If backend routes or env keys change, update `README.md` and the matching contributor guide in the same branch.
