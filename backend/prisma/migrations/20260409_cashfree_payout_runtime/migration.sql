ALTER TABLE "User"
  ADD COLUMN "addressLine1" TEXT,
  ADD COLUMN "city" TEXT,
  ADD COLUMN "state" TEXT,
  ADD COLUMN "postalCode" TEXT,
  ADD COLUMN "countryCode" TEXT NOT NULL DEFAULT '+91';

ALTER TABLE "Beneficiary"
  ADD COLUMN "providerBeneficiaryId" TEXT,
  ADD COLUMN "providerStatus" TEXT,
  ADD COLUMN "verificationMetadata" JSONB;

CREATE INDEX "Beneficiary_providerBeneficiaryId_idx" ON "Beneficiary"("providerBeneficiaryId");

ALTER TABLE "Payout"
  ADD COLUMN "syncAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastSyncAt" TIMESTAMP(3),
  ADD COLUMN "nextRetryAt" TIMESTAMP(3),
  ADD COLUMN "statusDetails" JSONB;
