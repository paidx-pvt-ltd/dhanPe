# DhanPe Backend

Express + TypeScript backend for auth, user profile/KYC, beneficiary management, transfer creation, payout execution, refunds, disputes/chargebacks, reconciliation, and provider webhook handling.

## Execution Architecture

The backend now runs as three independent processes inside `backend/`:

- `apps/api`: control plane, request validation, resource creation, and queue production
- `apps/worker`: execution plane, BullMQ workers, external provider calls, DB state transitions
- `apps/scheduler`: reconciliation repeat scheduler for BullMQ v5 job schedulers

Shared backend packages:

- `packages/config`: environment parsing and logger setup
- `packages/db`: Prisma singleton
- `packages/queue`: BullMQ queue factories, Redis connections, rate limits
- `packages/runtime`: shared service wiring and queue dispatcher
- `packages/types`: shared job contracts

## Quick Start

```bash
cd backend
npm install
cp .env.development .env
npm run db:generate
npm run db:migrate
npm run dev:api
```

The API runs on `http://localhost:3000` by default.

Run the worker and scheduler in separate shells:

```bash
cd backend
npm run dev:worker
npm run dev:scheduler
```

## Required Environment Variables

Required:

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `CASHFREE_CLIENT_ID`
- `CASHFREE_CLIENT_SECRET`
- `CASHFREE_PAYOUT_CLIENT_ID`
- `CASHFREE_PAYOUT_CLIENT_SECRET`
- `CASHFREE_WEBHOOK_SECRET`
- `REDIS_URL`
- `MSG91_AUTH_KEY`
- `MSG91_WIDGET_ID`
- `MSG91_WIDGET_TOKEN`

Also parsed by config:

- `NODE_ENV`
- `PORT`
- `APP_URL`
- `CORS_ORIGIN`
- `DIRECT_URL`
- `JWT_EXPIRY`
- `JWT_REFRESH_EXPIRY`
- `OTP_EXPIRY_MINUTES`
- `OTP_MAX_ATTEMPTS`
- `MSG91_BASE_URL`
- `MSG91_WIDGET_ENABLED`
- `MSG91_WIDGET_VERIFY_BASE_URL`
- `MSG91_SANDBOX_ENABLED`
- `MSG91_SANDBOX_OTP`
- `MSG91_SANDBOX_ALLOW_PRODUCTION`
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
- `COMPLIANCE_SELF_TRANSFER_THRESHOLD`
- `COMPLIANCE_SELF_TRANSFER_TOKEN_THRESHOLD`
- `LOG_LEVEL`
- `PAYOUT_QUEUE_CONCURRENCY`
- `WEBHOOK_QUEUE_CONCURRENCY`
- `RECONCILIATION_QUEUE_CONCURRENCY`
- `QUEUE_ATTEMPTS`
- `QUEUE_BACKOFF_DELAY_MS`
- `QUEUE_PREFIX`
- `PAYOUT_QUEUE_LIMITER_MAX`
- `PAYOUT_QUEUE_LIMITER_DURATION_MS`
- `WEBHOOK_QUEUE_LIMITER_MAX`
- `WEBHOOK_QUEUE_LIMITER_DURATION_MS`
- `RECONCILIATION_QUEUE_LIMITER_MAX`
- `RECONCILIATION_QUEUE_LIMITER_DURATION_MS`
- `RECONCILIATION_ENABLED`
- `RECONCILIATION_INTERVAL_MS`
- `SEED_USER_EMAIL`
- `SEED_USER_PASSWORD`

Use `backend/.env.development` as the local template. Production secrets should come from the host environment, not git.

The root `docker-compose.yml` also requires a local `POSTGRES_PASSWORD` environment variable before starting PostgreSQL:

```bash
POSTGRES_PASSWORD=change-me-for-local-dev docker compose up -d
```

PowerShell:

```powershell
$env:POSTGRES_PASSWORD = 'change-me-for-local-dev'
docker compose up -d
```

Cashfree integration note:

- `CASHFREE_CLIENT_ID` / `CASHFREE_CLIENT_SECRET` are used for PG orders/refunds.
- `CASHFREE_PAYOUT_CLIENT_ID` / `CASHFREE_PAYOUT_CLIENT_SECRET` are used for payout beneficiary/transfers and payout webhook signature verification.

MSG91 integration note:

- Normal API mode requires `MSG91_AUTH_KEY` and uses MSG91's SendOTP API.
- Widget mode uses `GET /api/auth/widget-config` and `POST /api/auth/verify-widget`.
- Widget mode requires `MSG91_WIDGET_ID` and `MSG91_WIDGET_TOKEN`; the backend verifies the returned access token server-side with `MSG91_AUTH_KEY`.
- Temporary testing can use `MSG91_SANDBOX_ENABLED=true`, which skips MSG91 delivery and accepts `MSG91_SANDBOX_OTP`.
- If `NODE_ENV` is `production` or `staging`, sandbox mode also requires `MSG91_SANDBOX_ALLOW_PRODUCTION=true`. Use this only for temporary testing and turn it off before real users.

## Current Routes

Primary API routes:

- `GET /`
- `GET /health`
- `GET /health/ready`
- `GET /healthz`
- `GET /api/healthz`
- `GET /docs/openapi.json`
- `GET /api/auth/widget-config`
- `POST /api/auth/verify-widget`
- `POST /api/auth/send-otp`
- `POST /api/auth/verify-otp`
- `POST /api/auth/refresh`
- `GET /api/users/onboarding`
- `GET /api/users/profile`
- `PATCH /api/users/profile`
- `POST /api/users/pan`
- `POST /api/users/pan/fallback`
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
- PAN fallback document verification is `POST /api/users/pan/fallback`.
- Didit webhook is `POST /api/webhook/didit`.
- Reconciliation routes are admin-only and require a user with `isAdmin=true`.
- Dispute routes are admin-only and cover both first-party disputes and downstream chargebacks.
- Webhook endpoints validate signatures synchronously, enqueue work, and return immediately.
- Manual sync endpoints enqueue work and return `202 Accepted`.

## Risk Engine

`POST /api/transfer` runs the risk engine before creating a transfer order.

Current enforced controls:

- per-transaction amount cap via `RISK_MAX_TRANSACTION_AMOUNT`
- daily user volume cap via `RISK_MAX_DAILY_VOLUME`
- velocity cap (count in rolling window) via:
  - `RISK_VELOCITY_WINDOW_MINUTES`
  - `RISK_VELOCITY_MAX_TRANSACTIONS`
- repeated beneficiary changes in the last 24 hours
- repeated payout failures in the last 24 hours
- suspicious distinct session/device count in the last 24 hours

On breach, the API returns `422` with code `RISK_REJECTED`.
On pass, the backend updates `RiskProfile` with:

- `riskScore`
- `dailyLimitUsed`
- `lastTxnAt`
- `lastTxnAmount`
- `velocityFlag`
- `riskSignals`

Implementation references:

- `backend/src/modules/payment/payment.service.ts` (`riskService.evaluateTransfer(...)`)
- `backend/src/modules/risk/risk.service.ts`
- `backend/src/modules/risk/risk.repository.ts`

## Ledger Maintenance

Ledger and journal maintenance is automatic; there is no direct public write endpoint for ledger rows.

Recorded flows:

- Cashfree payment captured webhook:
  - credits customer ledger
  - records balanced `PAYMENT_CAPTURED` journal
- payout submission and settlement:
  - records `PAYOUT_SUBMITTED` and `PAYOUT_SETTLED` journals
- refund settlement:
  - records `REFUND_SETTLED` journal and proportional reversals

Implementation references:

- `backend/src/modules/ledger/ledger.service.ts`
- `backend/src/modules/webhook/webhook.service.ts`
- `backend/src/modules/payout/payout.service.ts`
- `backend/src/modules/refund/refund.service.ts`

Operational visibility and maintenance:

- `GET /api/transaction/:id` returns `ledger`, `journals`, and `reconciliation` arrays in lifecycle data.
- reconciliation is available through admin routes:
  - `POST /api/reconciliation/run`
  - `GET /api/reconciliation/runs/:runId`
  - `GET /api/reconciliation/items`
  - `POST /api/reconciliation/items/:itemId/resolve`
- scheduled reconciliation is controlled by:
  - `RECONCILIATION_ENABLED`
  - `RECONCILIATION_INTERVAL_MS`

## Current Transfer Flow

1. Frontend loads public widget settings from `GET /api/auth/widget-config`.
2. If widget mode is enabled, the app completes MSG91 widget verification and submits `{ mobileNumber, accessToken }` to `POST /api/auth/verify-widget`.
3. If widget mode is unavailable or the user chooses SMS fallback, frontend submits the mobile number to `POST /api/auth/send-otp`.
4. Backend normalizes the number, sends the OTP through MSG91's server-side OTP API, and returns success only after MSG91 accepts the request.
5. Frontend collects the OTP and submits `{ mobileNumber, otp }` to `POST /api/auth/verify-otp`.
6. Backend verifies the widget token or OTP with MSG91, creates or updates the verified user, and issues JWT tokens.
7. Authenticated user loads onboarding status from `GET /api/users/onboarding` and updates or confirms profile data.
8. Frontend requests a Didit session token through `POST /api/users/kyc/session`.
9. Flutter launches the native Didit SDK with the returned `sessionToken`.
10. Frontend syncs the final SDK session through `POST /api/users/kyc/session/:sessionId/sync`.
11. Frontend collects PAN and submits it through `POST /api/users/pan`; failed PAN API verification can offer `POST /api/users/pan/fallback`.
12. User can register or reuse a beneficiary through `GET/POST /api/users/beneficiaries`; backend validates the bank account, registers it for payouts, and blocks self-transfers.
13. Backend only allows `POST /api/transfer` after mobile verification, KYC approval, PAN verification, profile completion, beneficiary verification, payout registration, and risk checks.
14. Cashfree payment webhook updates the payment lifecycle through `POST /api/webhook/cashfree`.
15. Cashfree payment webhooks enqueue payout execution work and return immediately.
16. The worker submits payouts, handles webhook jobs, performs manual sync jobs, and updates the database idempotently.
17. Refunds are created through `POST /api/refund/:transactionId` and synced through `POST /api/refund/:refundId/sync`.
18. Admin operators can open and work dispute or chargeback cases through `/api/disputes/*`.
19. Scheduled or manual reconciliation runs on the worker and stores findings for admin review.

## Railway Deployment

Deploy each process as an independent Railway service pointing at `backend/`:

- API: `npm run start:api`
- Worker: `npm run start:worker`
- Scheduler: `npm run start:scheduler`

Build command:

```bash
npm run build
```

Required shared environment variables include at least:

- `DATABASE_URL`
- `REDIS_URL`
- `NODE_ENV`

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
