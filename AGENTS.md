# AI Contributor Guide

This guide is for AI agents and automation-oriented contributors working in the repo.

## Primary Goals

- Preserve user changes outside the requested scope.
- Prefer small, reviewable edits.
- Keep docs aligned with the actual code, especially routes and env keys.
- Never invent runtime behavior when `backend/src/app.ts`, `backend/src/config/index.ts`, or `frontend/lib/config/config.dart` can be read directly.

## Ground Truth Files

- `backend/src/app.ts`: active routes and middleware
- `backend/src/config/index.ts`: required env vars and defaults
- `backend/package.json`: backend scripts
- `frontend/lib/config/config.dart`: frontend runtime target selection
- `frontend/pubspec.yaml`: Flutter dependencies

## Environment Conventions

- Backend local setup uses `backend/.env.development`, copied to `.env`.
- Production secrets belong in the host environment, not the repo.
- Flutter uses `String.fromEnvironment`, so document `--dart-define` values instead of creating fake secret flows.

## Required Backend Env Keys

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `CASHFREE_CLIENT_ID`
- `CASHFREE_CLIENT_SECRET`
- `CASHFREE_WEBHOOK_SECRET`

Supporting keys currently parsed by config:

- `NODE_ENV`
- `PORT`
- `APP_URL`
- `CORS_ORIGIN`
- `DIRECT_URL`
- `JWT_EXPIRY`
- `JWT_REFRESH_EXPIRY`
- `CASHFREE_API_BASE_URL`
- `CASHFREE_PAYOUT_BASE_URL`
- `CASHFREE_WEBHOOK_SIGNATURE_HEADER`
- `CASHFREE_WEBHOOK_TIMESTAMP_HEADER`
- `RISK_MAX_TRANSACTION_AMOUNT`
- `RISK_MAX_DAILY_VOLUME`
- `RISK_VELOCITY_WINDOW_MINUTES`
- `RISK_VELOCITY_MAX_TRANSACTIONS`
- `LOG_LEVEL`
- `PAYOUT_QUEUE_CONCURRENCY`
- `SEED_USER_EMAIL`
- `SEED_USER_PASSWORD`

## Operational Notes

- The backend exposes both base and `/api/*` variants for some routes; prefer documenting `/api/*`.
- Current transfer creation route is `/api/transfer`, not `/api/payments/create-order`.
- Current transaction lookup route is `/api/transaction/:id`, not `/api/transactions/:id`.
- Current Cashfree webhook route is `/api/webhook/cashfree`, not `/api/payments/webhook`.

## Safe Workflow

1. Inspect `git status` before editing.
2. Avoid touching unrelated modified files.
3. Use `apply_patch` for file edits.
4. Re-run targeted validation after changes.
5. Summarize what changed and what was verified.

## Validation Checklist

For docs or env-only changes:

```bash
git diff --check
git status --short
```

For backend behavior changes:

```bash
cd backend
npm test
npm run lint
```

For frontend behavior changes:

```bash
cd frontend
flutter analyze
flutter test
```

## Commit Hygiene

- Do not commit real credentials.
- Keep new documentation concise and current.
- If you remove docs, replace their important operational content somewhere discoverable.
- Flag unverified assumptions explicitly in the handoff.
