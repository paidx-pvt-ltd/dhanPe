ALTER TABLE "User"
  ADD COLUMN "mobileNumber" TEXT,
  ADD COLUMN "isMobileVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "panNumber" TEXT,
  ADD COLUMN "panName" TEXT,
  ADD COLUMN "panVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "panVerifiedAt" TIMESTAMP(3),
  ALTER COLUMN "email" DROP NOT NULL,
  ALTER COLUMN "passwordHash" DROP NOT NULL;

WITH normalized_users AS (
  SELECT
    "id",
    NULLIF(BTRIM("phoneNumber"), '') AS "normalizedPhoneNumber",
    ROW_NUMBER() OVER (
      PARTITION BY NULLIF(BTRIM("phoneNumber"), '')
      ORDER BY "createdAt" ASC, "id" ASC
    ) AS "phoneRank"
  FROM "User"
)
UPDATE "User" AS u
SET "mobileNumber" = CASE
  WHEN nu."normalizedPhoneNumber" IS NULL THEN CONCAT('pending_', u."id")
  WHEN nu."phoneRank" = 1 THEN nu."normalizedPhoneNumber"
  ELSE CONCAT('dedupe_', u."id")
END
FROM normalized_users AS nu
WHERE u."id" = nu."id";

ALTER TABLE "User"
  ALTER COLUMN "mobileNumber" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "User_mobileNumber_key" ON "User"("mobileNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "User_panNumber_key" ON "User"("panNumber");
CREATE INDEX IF NOT EXISTS "User_mobileNumber_idx" ON "User"("mobileNumber");

DROP INDEX IF EXISTS "User_email_idx";
CREATE INDEX IF NOT EXISTS "User_createdAt_idx" ON "User"("createdAt");

ALTER TABLE "Beneficiary"
  ADD COLUMN "accountNumber" TEXT,
  ADD COLUMN "isVerified" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Beneficiary"
SET "accountNumber" = COALESCE(("rawDetails"->>'accountNumber'), "accountNumberMask");

ALTER TABLE "Beneficiary"
  ALTER COLUMN "accountNumber" SET NOT NULL;

CREATE TABLE "OtpChallenge" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "mobileNumber" TEXT NOT NULL,
  "otpHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "lastAttemptAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "OtpChallenge_mobileNumber_createdAt_idx" ON "OtpChallenge"("mobileNumber", "createdAt");
CREATE INDEX IF NOT EXISTS "OtpChallenge_expiresAt_idx" ON "OtpChallenge"("expiresAt");

ALTER TABLE "OtpChallenge"
  ADD CONSTRAINT "OtpChallenge_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
