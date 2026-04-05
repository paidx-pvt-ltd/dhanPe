# DhanPe Backend

Express + TypeScript API for auth, user profile/KYC, transfer creation, transaction lifecycle, and Cashfree webhook handling.

## Quick Start

```bash
cd backend
npm install
cp .env.development .env
npm run db:generate
npm run db:migrate
npm run dev
```

The API runs on `http://localhost:3000` by default.

## Required Environment Variables

Required:

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `CASHFREE_CLIENT_ID`
- `CASHFREE_CLIENT_SECRET`
- `CASHFREE_WEBHOOK_SECRET`

Also parsed by config:

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

Use `backend/.env.development` as the local template. Production secrets should come from the host environment, not git.

## Current Routes

Primary API routes:

- `GET /`
- `GET /health`
- `GET /health/ready`
- `GET /healthz`
- `GET /api/healthz`
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

Notes:

- Base and `/api/*` variants exist for several route groups; prefer `/api/*`.
- Transfer creation is `POST /api/transfer`.
- Transaction lookup is `GET /api/transaction/:id`.
- Cashfree webhook is `POST /api/webhook/cashfree`.

## Current Transfer Flow

1. Authenticated user updates or confirms profile data.
2. Frontend completes the in-app identity step through `POST /api/users/kyc/complete`.
3. Frontend creates a transfer with `POST /api/transfer`.
4. Backend creates an initiated transaction and a Cashfree order.
5. Frontend checks transfer state with `GET /api/transaction/:id`.
6. Cashfree webhook updates the backend through `POST /api/webhook/cashfree`.

## Validation

```bash
npm run lint
npm test
```

Targeted checks used for the new transfer/KYC flow:

```bash
npm test -- --run src/modules/payment/payment.service.test.ts src/modules/user/user.service.test.ts
```

## Scripts

```bash
npm run dev
npm run build
npm start
npm run lint
npm run format
npm test
npm run test:coverage
npm run db:migrate
npm run db:generate
npm run db:seed
```
