-- CreateEnum
CREATE TYPE "TransactionLifecycleState" AS ENUM (
  'INITIATED',
  'PAYMENT_PENDING',
  'PAYMENT_SUCCESS',
  'PAYMENT_FAILED',
  'PAYOUT_PENDING',
  'PAYOUT_SUCCESS',
  'PAYOUT_FAILED',
  'COMPLETED',
  'REFUNDED',
  'DISPUTED'
);

-- AlterTable
ALTER TABLE "Transaction"
  ADD COLUMN "lifecycleState" "TransactionLifecycleState" NOT NULL DEFAULT 'INITIATED',
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "TransactionLog" (
  "id" TEXT NOT NULL,
  "txnId" TEXT NOT NULL,
  "fromState" "TransactionLifecycleState" NOT NULL,
  "toState" "TransactionLifecycleState" NOT NULL,
  "reason" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TransactionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TransactionLog_txnId_createdAt_idx" ON "TransactionLog"("txnId", "createdAt");
CREATE INDEX "TransactionLog_toState_createdAt_idx" ON "TransactionLog"("toState", "createdAt");

-- AddForeignKey
ALTER TABLE "TransactionLog"
  ADD CONSTRAINT "TransactionLog_txnId_fkey"
  FOREIGN KEY ("txnId") REFERENCES "Transaction"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
