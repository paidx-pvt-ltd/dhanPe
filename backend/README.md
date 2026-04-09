# DhanPe Backend

Express + TypeScript API for auth, user profile/KYC, beneficiary management, transfer creation, payout execution, refunds, disputes/chargebacks, reconciliation, and Cashfree webhook handling.

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
- `REDIS_URL`

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
- `DIDIT_API_KEY`
- `DIDIT_WORKFLOW_ID`
- `DIDIT_WEBHOOK_SECRET`
- `DIDIT_API_BASE_URL`
- `RISK_MAX_TRANSACTION_AMOUNT`
- `RISK_MAX_DAILY_VOLUME`
- `RISK_VELOCITY_WINDOW_MINUTES`
- `RISK_VELOCITY_MAX_TRANSACTIONS`
- `LOG_LEVEL`
- `PAYOUT_QUEUE_CONCURRENCY`
- `PAYOUT_QUEUE_POLL_INTERVAL_MS`
- `RECONCILIATION_ENABLED`
- `RECONCILIATION_INTERVAL_MS`
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
- `GET /api/users/profile`
- `PATCH /api/users/profile`
- `GET /api/users/beneficiaries`
- `POST /api/users/beneficiaries`
- `POST /api/users/kyc/session`
- `POST /api/users/kyc/session/:sessionId/sync`
- `POST /api/transfer`
- `GET /api/transaction/:id`
- `POST /api/payout/:transactionId/sync`
- `POST /api/refund/:transactionId`
- `POST /api/refund/:refundId/sync`
- `POST /api/disputes`
- `GET /api/disputes`
- `GET /api/disputes/:disputeId`
- `POST /api/disputes/:disputeId/respond`
- `POST /api/disputes/:disputeId/resolve`
- `POST /api/reconciliation/run`
- `GET /api/reconciliation/runs/:runId`
- `GET /api/reconciliation/items`
- `POST /api/reconciliation/items/:itemId/resolve`
- `POST /api/webhook/cashfree`
- `POST /api/webhook/cashfree/payout`
- `POST /api/webhook/didit`

Notes:

- Base and `/api/*` variants exist for several route groups; prefer `/api/*`.
- Transfer creation is `POST /api/transfer`.
- Transaction lookup is `GET /api/transaction/:id`.
- Cashfree webhook is `POST /api/webhook/cashfree`.
- Cashfree payout webhook is `POST /api/webhook/cashfree/payout`.
- Didit session creation is `POST /api/users/kyc/session`.
- Didit status sync is `POST /api/users/kyc/session/:sessionId/sync`.
- Didit webhook is `POST /api/webhook/didit`.
- Reconciliation routes are admin-only and require a user with `isAdmin=true`.
- Dispute routes are admin-only and cover both first-party disputes and downstream chargebacks.

## Current Transfer Flow

1. Authenticated user updates or confirms profile data.
2. User can register or reuse a beneficiary through `GET/POST /api/users/beneficiaries`.
3. Frontend requests a Didit session token through `POST /api/users/kyc/session`.
4. Flutter launches the native Didit SDK with the returned `sessionToken`.
5. Frontend syncs the final SDK session through `POST /api/users/kyc/session/:sessionId/sync`.
6. Backend updates `kycStatus` from Didit and only then allows `POST /api/transfer`.
7. Cashfree payment webhook updates the payment lifecycle through `POST /api/webhook/cashfree`.
8. BullMQ-backed payout worker submits payouts and status can be synced through `POST /api/payout/:transactionId/sync`.
9. Refunds are created through `POST /api/refund/:transactionId` and synced through `POST /api/refund/:refundId/sync`.
10. Admin operators can open and work dispute or chargeback cases through `/api/disputes/*`.
11. Scheduled or manual reconciliation compares internal state against Cashfree and stores findings for admin review.

## Validation

```bash
npm run lint
npm test
```

Targeted checks used for the new transfer/KYC flow:

```bash
npm test -- --run src/modules/payment/payment.service.test.ts src/modules/user/user.service.test.ts src/modules/didit/didit.service.test.ts
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
