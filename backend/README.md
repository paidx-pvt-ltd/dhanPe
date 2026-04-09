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
- `MSG91_WIDGET_ENABLED`
- `MSG91_AUTH_KEY`
- `MSG91_WIDGET_ID`
- `MSG91_WIDGET_TOKEN`
- `MSG91_BASE_URL`
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

Cashfree integration note:

- `CASHFREE_CLIENT_ID` / `CASHFREE_CLIENT_SECRET` are used for PG orders/refunds.
- `CASHFREE_PAYOUT_CLIENT_ID` / `CASHFREE_PAYOUT_CLIENT_SECRET` are used for payout beneficiary/transfers and payout webhook signature verification.

## Current Routes

Primary API routes:

- `GET /`
- `GET /health`
- `GET /health/ready`
- `GET /healthz`
- `GET /api/healthz`
- `GET /docs/openapi.json`
- `GET /api/auth/widget-config`
- `POST /api/auth/verify-otp`
- `POST /api/auth/refresh`
- `GET /api/users/profile`
- `PATCH /api/users/profile`
- `POST /api/users/pan`
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

## Risk Engine

`POST /api/transfer` runs the risk engine before creating a transfer order.

Current enforced controls:

- per-transaction amount cap via `RISK_MAX_TRANSACTION_AMOUNT`
- daily user volume cap via `RISK_MAX_DAILY_VOLUME`
- velocity cap (count in rolling window) via:
  - `RISK_VELOCITY_WINDOW_MINUTES`
  - `RISK_VELOCITY_MAX_TRANSACTIONS`

On breach, the API returns `422` with code `RISK_REJECTED`.
On pass, the backend updates `RiskProfile` with:

- `riskScore`
- `dailyLimitUsed`
- `lastTxnAt`
- `lastTxnAmount`
- `velocityFlag`

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

1. Frontend loads MSG91 widget configuration through `GET /api/auth/widget-config`.
2. Frontend launches the MSG91 widget directly if available, or guides the user through a 3-step progressive login flow (Enter Number → Receive OTP → Verify).
3. Frontend submits the MSG91 widget access token to `POST /api/auth/verify-otp`.
4. Backend verifies that access token with MSG91, resolves the verified mobile number, and issues JWT tokens.
5. Authenticated user updates or confirms profile data.
6. Frontend requests a Didit session token through `POST /api/users/kyc/session`.
7. Flutter launches the native Didit SDK with the returned `sessionToken`.
8. Frontend syncs the final SDK session through `POST /api/users/kyc/session/:sessionId/sync`.
9. On the first transfer attempt, frontend collects PAN if backend returns `PAN_REQUIRED`, then submits it through `POST /api/users/pan`.
10. User can register or reuse a beneficiary through `GET/POST /api/users/beneficiaries`; backend validates the bank account and blocks self-transfers.
11. Backend only allows `POST /api/transfer` after mobile verification, KYC approval, PAN verification, beneficiary verification, and risk checks.
12. Cashfree payment webhook updates the payment lifecycle through `POST /api/webhook/cashfree`.
13. BullMQ-backed payout worker submits payouts and status can be synced through `POST /api/payout/:transactionId/sync`.
14. Refunds are created through `POST /api/refund/:transactionId` and synced through `POST /api/refund/:refundId/sync`.
15. Admin operators can open and work dispute or chargeback cases through `/api/disputes/*`.
16. Scheduled or manual reconciliation compares internal state against Cashfree and stores findings for admin review.

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
