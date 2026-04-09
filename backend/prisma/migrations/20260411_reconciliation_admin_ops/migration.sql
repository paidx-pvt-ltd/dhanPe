ALTER TABLE "User"
  ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "ReconciliationItem"
  ADD COLUMN "resolutionNote" TEXT,
  ADD COLUMN "resolvedByUserId" TEXT;
