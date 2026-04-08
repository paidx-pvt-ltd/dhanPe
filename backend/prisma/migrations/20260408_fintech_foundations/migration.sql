ALTER TABLE "Transaction"
  ADD COLUMN "grossAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "platformFeeAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "taxAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "netPayoutAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'INR',
  ADD COLUMN "feeRuleVersion" TEXT NOT NULL DEFAULT 'v1',
  ADD COLUMN "beneficiaryId" TEXT;

UPDATE "Transaction"
SET
  "grossAmount" = "amount",
  "netPayoutAmount" = "amount";

CREATE TYPE "BeneficiaryType" AS ENUM ('BANK_ACCOUNT', 'UPI');
CREATE TYPE "BeneficiaryStatus" AS ENUM ('PENDING_VERIFICATION', 'VERIFIED', 'REJECTED');
CREATE TYPE "JournalEntryKind" AS ENUM (
  'PAYMENT_CAPTURED',
  'PLATFORM_FEE_RECORDED',
  'PAYOUT_SUBMITTED',
  'PAYOUT_SETTLED',
  'PAYOUT_FAILED'
);
CREATE TYPE "JournalAccount" AS ENUM (
  'GATEWAY_CLEARING',
  'CUSTOMER_FUNDS_LIABILITY',
  'PLATFORM_REVENUE',
  'TAX_PAYABLE',
  'PAYOUT_CLEARING'
);

ALTER TYPE "PayoutStatus" ADD VALUE IF NOT EXISTS 'QUEUED';
ALTER TYPE "PayoutStatus" ADD VALUE IF NOT EXISTS 'SUBMITTED';

CREATE TABLE "Beneficiary" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "BeneficiaryType" NOT NULL DEFAULT 'BANK_ACCOUNT',
  "label" TEXT,
  "accountHolderName" TEXT NOT NULL,
  "accountNumberMask" TEXT NOT NULL,
  "accountNumberHash" TEXT NOT NULL,
  "ifsc" TEXT,
  "upiHandle" TEXT,
  "status" "BeneficiaryStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
  "rawDetails" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Beneficiary_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Beneficiary_userId_createdAt_idx" ON "Beneficiary"("userId", "createdAt");
CREATE INDEX "Beneficiary_status_createdAt_idx" ON "Beneficiary"("status", "createdAt");
CREATE UNIQUE INDEX "Beneficiary_userId_accountNumberHash_ifsc_key" ON "Beneficiary"("userId", "accountNumberHash", "ifsc");
ALTER TABLE "Beneficiary" ADD CONSTRAINT "Beneficiary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "Beneficiary"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Transaction_beneficiaryId_createdAt_idx" ON "Transaction"("beneficiaryId", "createdAt");

CREATE TABLE "PayoutAttempt" (
  "id" TEXT NOT NULL,
  "payoutId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
  "providerRef" TEXT,
  "providerStatus" TEXT,
  "requestPayload" JSONB NOT NULL,
  "responsePayload" JSONB,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PayoutAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PayoutAttempt_idempotencyKey_key" ON "PayoutAttempt"("idempotencyKey");
CREATE INDEX "PayoutAttempt_payoutId_createdAt_idx" ON "PayoutAttempt"("payoutId", "createdAt");
CREATE INDEX "PayoutAttempt_status_createdAt_idx" ON "PayoutAttempt"("status", "createdAt");
ALTER TABLE "PayoutAttempt" ADD CONSTRAINT "PayoutAttempt_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Payout" ADD COLUMN "providerStatus" TEXT;

ALTER TABLE "RefreshToken"
  ADD COLUMN "tokenHash" TEXT,
  ADD COLUMN "replacedByTokenId" TEXT,
  ADD COLUMN "lastUsedAt" TIMESTAMP(3),
  ADD COLUMN "deviceInfo" JSONB;

UPDATE "RefreshToken"
SET "tokenHash" = "token"
WHERE "tokenHash" IS NULL;

ALTER TABLE "RefreshToken" ALTER COLUMN "tokenHash" SET NOT NULL;
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

CREATE TABLE "JournalEntry" (
  "id" TEXT NOT NULL,
  "transactionId" TEXT,
  "referenceId" TEXT NOT NULL,
  "kind" "JournalEntryKind" NOT NULL,
  "memo" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "JournalLine" (
  "id" TEXT NOT NULL,
  "entryId" TEXT NOT NULL,
  "account" "JournalAccount" NOT NULL,
  "debit" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "credit" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JournalLine_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "JournalEntry_transactionId_createdAt_idx" ON "JournalEntry"("transactionId", "createdAt");
CREATE INDEX "JournalEntry_referenceId_idx" ON "JournalEntry"("referenceId");
CREATE INDEX "JournalEntry_kind_createdAt_idx" ON "JournalEntry"("kind", "createdAt");
CREATE INDEX "JournalLine_entryId_idx" ON "JournalLine"("entryId");
CREATE INDEX "JournalLine_account_createdAt_idx" ON "JournalLine"("account", "createdAt");
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
