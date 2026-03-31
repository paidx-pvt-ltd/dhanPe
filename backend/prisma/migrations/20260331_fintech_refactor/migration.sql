-- Update enums
ALTER TYPE "TransactionStatus" RENAME TO "TransactionStatus_old";
CREATE TYPE "TransactionStatus" AS ENUM ('INITIATED', 'PAID', 'FAILED');

CREATE TYPE "LedgerEntryType" AS ENUM ('DEBIT', 'CREDIT');
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED');
CREATE TYPE "PaymentProvider" AS ENUM ('CASHFREE');

-- Remove legacy tables and dependencies
ALTER TABLE "Transaction" DROP CONSTRAINT IF EXISTS "Transaction_paymentId_fkey";
DROP TABLE IF EXISTS "Payment";
DROP TABLE IF EXISTS "WebhookLog";

-- Rebuild User balance as decimal
ALTER TABLE "User" DROP COLUMN IF EXISTS "kycDocumentUrl";
ALTER TABLE "User"
  ALTER COLUMN "balance" TYPE DECIMAL(18,2)
  USING "balance"::DECIMAL(18,2),
  ALTER COLUMN "balance" SET DEFAULT 0;

-- Rebuild Transaction for transfer lifecycle
ALTER TABLE "Transaction" DROP COLUMN IF EXISTS "type";
ALTER TABLE "Transaction"
  ALTER COLUMN "amount" TYPE DECIMAL(18,2)
  USING "amount"::DECIMAL(18,2);
ALTER TABLE "Transaction"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "TransactionStatus"
  USING CASE
    WHEN "status"::text = 'SUCCESS' THEN 'PAID'::"TransactionStatus"
    WHEN "status"::text = 'FAILED' THEN 'FAILED'::"TransactionStatus"
    ELSE 'INITIATED'::"TransactionStatus"
  END;
DROP TYPE "TransactionStatus_old";
DROP TYPE IF EXISTS "TransactionType";

ALTER TABLE "Transaction"
  ADD COLUMN IF NOT EXISTS "paymentProvider" "PaymentProvider" NOT NULL DEFAULT 'CASHFREE',
  ADD COLUMN IF NOT EXISTS "orderId" TEXT,
  ADD COLUMN IF NOT EXISTS "providerOrderId" TEXT,
  ADD COLUMN IF NOT EXISTS "payoutStatus" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "bankAccount" JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS "metadata" JSONB;

UPDATE "Transaction"
SET "orderId" = COALESCE("orderId", CONCAT('legacy_', "id"))
WHERE "orderId" IS NULL;

ALTER TABLE "Transaction" ALTER COLUMN "orderId" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Transaction_orderId_key" ON "Transaction"("orderId");
CREATE UNIQUE INDEX IF NOT EXISTS "Transaction_paymentId_key" ON "Transaction"("paymentId");
CREATE INDEX IF NOT EXISTS "Transaction_userId_createdAt_idx" ON "Transaction"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Transaction_status_createdAt_idx" ON "Transaction"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Transaction_payoutStatus_createdAt_idx" ON "Transaction"("payoutStatus", "createdAt");

-- Ledger
CREATE TABLE IF NOT EXISTS "Ledger" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "transactionId" TEXT,
  "type" "LedgerEntryType" NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "referenceId" TEXT NOT NULL,
  "balanceAfter" DECIMAL(18,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Ledger_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Ledger_userId_createdAt_idx" ON "Ledger"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Ledger_referenceId_idx" ON "Ledger"("referenceId");
CREATE INDEX IF NOT EXISTS "Ledger_transactionId_idx" ON "Ledger"("transactionId");
ALTER TABLE "Ledger" ADD CONSTRAINT "Ledger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Ledger" ADD CONSTRAINT "Ledger_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Payouts
CREATE TABLE IF NOT EXISTS "Payout" (
  "id" TEXT NOT NULL,
  "txnId" TEXT NOT NULL,
  "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
  "bankAccount" JSONB NOT NULL,
  "providerRef" TEXT,
  "failureReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Payout_txnId_key" ON "Payout"("txnId");
CREATE INDEX IF NOT EXISTS "Payout_status_createdAt_idx" ON "Payout"("status", "createdAt");
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_txnId_fkey" FOREIGN KEY ("txnId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Risk profiles
CREATE TABLE IF NOT EXISTS "RiskProfile" (
  "userId" TEXT NOT NULL,
  "riskScore" INTEGER NOT NULL DEFAULT 0,
  "dailyLimitUsed" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "lastTxnAt" TIMESTAMP(3),
  "lastTxnAmount" DECIMAL(18,2),
  "velocityFlag" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RiskProfile_pkey" PRIMARY KEY ("userId")
);
ALTER TABLE "RiskProfile" ADD CONSTRAINT "RiskProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Webhook audit table
CREATE TABLE IF NOT EXISTS "WebhookEvent" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "eventId" TEXT,
  "orderId" TEXT,
  "payload" JSONB NOT NULL,
  "processed" BOOLEAN NOT NULL DEFAULT false,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "WebhookEvent_eventId_key" ON "WebhookEvent"("eventId");
CREATE INDEX IF NOT EXISTS "WebhookEvent_provider_createdAt_idx" ON "WebhookEvent"("provider", "createdAt");
CREATE INDEX IF NOT EXISTS "WebhookEvent_orderId_idx" ON "WebhookEvent"("orderId");
CREATE INDEX IF NOT EXISTS "WebhookEvent_processed_createdAt_idx" ON "WebhookEvent"("processed", "createdAt");

-- Idempotency storage
CREATE TABLE IF NOT EXISTS "IdempotencyKey" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "userId" TEXT,
  "requestHash" TEXT NOT NULL,
  "resourceId" TEXT,
  "responseBody" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "IdempotencyKey_key_key" ON "IdempotencyKey"("key");
CREATE INDEX IF NOT EXISTS "IdempotencyKey_scope_createdAt_idx" ON "IdempotencyKey"("scope", "createdAt");
CREATE INDEX IF NOT EXISTS "IdempotencyKey_userId_scope_idx" ON "IdempotencyKey"("userId", "scope");
ALTER TABLE "IdempotencyKey" ADD CONSTRAINT "IdempotencyKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
