# DhanPe

DhanPe is a fintech application for compliant, bill-payment-based fund flows with KYC, risk, reconciliation, and transaction integrity controls.

## Repository Structure

- `backend/`: Node.js + TypeScript backend (Express + Prisma)
- `frontend/`: Flutter mobile/web client

## Current Status

- MVP in active development
- Core payment, payout, refund, dispute, and reconciliation flows implemented

## Architecture (Current)

- Client: Flutter app
- API: Express backend
- Data: PostgreSQL via Prisma
- Queue: Redis + BullMQ (payout worker)
- Integrations:
  - Cashfree (payments, payouts, payment/payout webhooks)
  - Didit (KYC session + webhook)
  - MSG91 (mobile OTP widget with Step-Indicator flow)

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

Backend default URL: `http://localhost:3000`

### Frontend

```bash
cd frontend
flutter pub get
flutter run
```

Override backend target if needed:

```bash
flutter run --dart-define=DHANPE_API_BASE_URL=http://localhost:3000/api
```

## Frontend Runtime Targeting

From `frontend/lib/config/config.dart`:

- Web debug defaults to production backend
- Android emulator defaults to `http://10.0.2.2:3000/api`
- `DHANPE_API_BASE_URL` overrides defaults

## Environment Files

Backend templates/checklists:

- `backend/.env.development`
- `backend/.env.production`
- `backend/.env.example`

Notes:

- Use `.env.development` for local setup.
- `.env.production` is a placeholder checklist; do not commit secrets.
- Flutter uses `--dart-define`, not `.env` files.
- Cashfree uses separate key pairs:
  - `CASHFREE_CLIENT_ID` / `CASHFREE_CLIENT_SECRET` for PG
  - `CASHFREE_PAYOUT_CLIENT_ID` / `CASHFREE_PAYOUT_CLIENT_SECRET` for payout APIs
- MSG91 requires three specific keys for the widget:
  - `MSG91_AUTH_KEY`: Primary Auth Key
  - `MSG91_WIDGET_ID`: Widget ID from OTP section
  - `MSG91_WIDGET_TOKEN`: Widget Token for verification bridge

## Transaction Lifecycle (Strict State Machine)

The backend enforces a strict transaction lifecycle:

- `INITIATED`
- `PAYMENT_PENDING`
- `PAYMENT_SUCCESS`
- `PAYMENT_FAILED`
- `PAYOUT_PENDING`
- `PAYOUT_SUCCESS`
- `PAYOUT_FAILED`
- `COMPLETED`
- `REFUNDED`
- `DISPUTED`

Allowed transitions:

- `INITIATED -> PAYMENT_PENDING`
- `PAYMENT_PENDING -> PAYMENT_SUCCESS | PAYMENT_FAILED`
- `PAYMENT_SUCCESS -> PAYOUT_PENDING`
- `PAYOUT_PENDING -> PAYOUT_SUCCESS | PAYOUT_FAILED`
- `PAYOUT_SUCCESS -> COMPLETED`
- `COMPLETED -> REFUNDED | DISPUTED`

Transitions are validated and audited server-side.

## Risk and Ledger Controls

### Risk engine

`POST /api/transfer` enforces:

- max transaction amount
- daily volume limits
- velocity checks

Violations return `422` with code `RISK_REJECTED`.

### Ledger maintenance

Double-entry and ledger updates occur in backend services during:

- payment capture
- payout submission/settlement
- refund settlement

`GET /api/transaction/:id` includes lifecycle, payout, ledger, journals, refunds, disputes, and reconciliation status.

## Reconciliation

Admin endpoints:

- `POST /api/reconciliation/run`
- `GET /api/reconciliation/runs/:runId`
- `GET /api/reconciliation/items`
- `POST /api/reconciliation/items/:itemId/resolve`

Scheduled reconciliation is controlled by backend config (`RECONCILIATION_ENABLED`, `RECONCILIATION_INTERVAL_MS`).

## API Surface (Primary `/api/*` Routes)

### Health and docs

- `GET /`
- `GET /health`
- `GET /health/ready`
- `GET /healthz`
- `GET /api/healthz`
- `GET /docs/openapi.json`

### Auth

- `GET /api/auth/widget-config`
- `POST /api/auth/verify-otp`
- `POST /api/auth/refresh`

### User and beneficiary

- `GET /api/users/profile`
- `PATCH /api/users/profile`
- `POST /api/users/pan`
- `GET /api/users/beneficiaries`
- `POST /api/users/beneficiaries`

### KYC

- `POST /api/users/kyc/session`
- `POST /api/users/kyc/session/:sessionId/sync`

### Transfer and transaction

- `POST /api/transfer`
- `GET /api/transaction`
- `GET /api/transaction/:id`

### Payout and refund

- `POST /api/payout/:transactionId/sync`
- `POST /api/refund/:transactionId`
- `POST /api/refund/:refundId/sync`

### Disputes

- `POST /api/disputes`
- `GET /api/disputes`
- `GET /api/disputes/:disputeId`
- `POST /api/disputes/:disputeId/respond`
- `POST /api/disputes/:disputeId/resolve`

### Reconciliation

- `POST /api/reconciliation/run`
- `GET /api/reconciliation/runs/:runId`
- `GET /api/reconciliation/items`
- `POST /api/reconciliation/items/:itemId/resolve`

### Webhooks

- `POST /api/webhook/cashfree`
- `POST /api/webhook/cashfree/payout`
- `POST /api/webhook/didit`

## Compliance Note

DhanPe facilitates bill-payment-based flows and is not a direct cash-advance product.

Controls include:

- KYC verification
- risk checks
- ledgering and reconciliation
- webhook signature verification and idempotency

## Deployment Notes

- Never commit secrets.
- Inject production environment variables from hosting platforms.
- Treat `backend/.env.production` as a checklist only.
- Configure frontend target using `--dart-define=DHANPE_API_BASE_URL=...`.

## Contributor Docs

- [HUMANS.md](/d:/Personal%20Data/dhanPe-local/dhanPe/HUMANS.md)
- [AGENTS.md](/d:/Personal%20Data/dhanPe-local/dhanPe/AGENTS.md)
- [backend/README.md](/d:/Personal%20Data/dhanPe-local/dhanPe/backend/README.md)
- [frontend/README.md](/d:/Personal%20Data/dhanPe-local/dhanPe/frontend/README.md)
