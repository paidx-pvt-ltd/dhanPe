CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED');
CREATE TYPE "ReconciliationScope" AS ENUM ('PAYMENT', 'PAYOUT', 'REFUND');
CREATE TYPE "ReconciliationRunStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');
CREATE TYPE "ReconciliationItemStatus" AS ENUM ('OPEN', 'RESOLVED');
CREATE TYPE "ReconciliationSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

ALTER TYPE "JournalEntryKind" ADD VALUE IF NOT EXISTS 'REFUND_SETTLED';

CREATE TABLE "Refund" (
  "id" TEXT NOT NULL,
  "transactionId" TEXT NOT NULL,
  "refundId" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
  "providerRefundId" TEXT,
  "providerStatus" TEXT,
  "providerReference" TEXT,
  "reason" TEXT,
  "metadata" JSONB,
  "failureReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Refund_refundId_key" ON "Refund"("refundId");
CREATE UNIQUE INDEX "Refund_providerRefundId_key" ON "Refund"("providerRefundId");
CREATE INDEX "Refund_transactionId_createdAt_idx" ON "Refund"("transactionId", "createdAt");
CREATE INDEX "Refund_status_createdAt_idx" ON "Refund"("status", "createdAt");
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ReconciliationRun" (
  "id" TEXT NOT NULL,
  "scope" "ReconciliationScope" NOT NULL,
  "status" "ReconciliationRunStatus" NOT NULL DEFAULT 'RUNNING',
  "triggeredByUserId" TEXT,
  "summary" JSONB,
  "mismatchCount" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "ReconciliationRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReconciliationRun_scope_startedAt_idx" ON "ReconciliationRun"("scope", "startedAt");
CREATE INDEX "ReconciliationRun_status_startedAt_idx" ON "ReconciliationRun"("status", "startedAt");

CREATE TABLE "ReconciliationItem" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "transactionId" TEXT,
  "scope" "ReconciliationScope" NOT NULL,
  "severity" "ReconciliationSeverity" NOT NULL DEFAULT 'MEDIUM',
  "status" "ReconciliationItemStatus" NOT NULL DEFAULT 'OPEN',
  "code" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "expectedState" JSONB NOT NULL,
  "actualState" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "ReconciliationItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReconciliationItem_runId_createdAt_idx" ON "ReconciliationItem"("runId", "createdAt");
CREATE INDEX "ReconciliationItem_transactionId_createdAt_idx" ON "ReconciliationItem"("transactionId", "createdAt");
CREATE INDEX "ReconciliationItem_scope_status_createdAt_idx" ON "ReconciliationItem"("scope", "status", "createdAt");
ALTER TABLE "ReconciliationItem" ADD CONSTRAINT "ReconciliationItem_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ReconciliationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReconciliationItem" ADD CONSTRAINT "ReconciliationItem_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
