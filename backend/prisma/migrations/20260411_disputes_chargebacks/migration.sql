CREATE TYPE "DisputePhase" AS ENUM ('DISPUTE', 'CHARGEBACK');
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'WON', 'LOST', 'CLOSED');

CREATE TABLE "Dispute" (
  "id" TEXT NOT NULL,
  "transactionId" TEXT NOT NULL,
  "disputeId" TEXT NOT NULL,
  "phase" "DisputePhase" NOT NULL DEFAULT 'DISPUTE',
  "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
  "amount" DECIMAL(18,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "providerDisputeId" TEXT,
  "providerCaseId" TEXT,
  "providerStatus" TEXT,
  "reasonCode" TEXT,
  "reasonMessage" TEXT,
  "operatorNote" TEXT,
  "resolutionNote" TEXT,
  "evidenceDueBy" TIMESTAMP(3),
  "respondedAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "openedByUserId" TEXT,
  "resolvedByUserId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Dispute_disputeId_key" ON "Dispute"("disputeId");
CREATE UNIQUE INDEX "Dispute_providerDisputeId_key" ON "Dispute"("providerDisputeId");
CREATE INDEX "Dispute_transactionId_createdAt_idx" ON "Dispute"("transactionId", "createdAt");
CREATE INDEX "Dispute_status_phase_createdAt_idx" ON "Dispute"("status", "phase", "createdAt");
CREATE INDEX "Dispute_evidenceDueBy_status_idx" ON "Dispute"("evidenceDueBy", "status");

ALTER TABLE "Dispute"
  ADD CONSTRAINT "Dispute_transactionId_fkey"
  FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
