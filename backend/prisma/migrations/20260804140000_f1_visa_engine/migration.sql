-- F-1 Visa Compatibility Engine: Company profiles + job visa analysis
CREATE TABLE IF NOT EXISTS "Company" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL DEFAULT '',
    "industry" TEXT NOT NULL DEFAULT '',
    "size" TEXT NOT NULL DEFAULT '',
    "headquarters" TEXT NOT NULL DEFAULT '',
    "website" TEXT NOT NULL DEFAULT '',
    "optFriendly" TEXT NOT NULL DEFAULT 'unknown',
    "stemOptFriendly" TEXT NOT NULL DEFAULT 'unknown',
    "eVerify" TEXT NOT NULL DEFAULT 'unknown',
    "h1bSponsor" TEXT NOT NULL DEFAULT 'unknown',
    "greenCardSponsor" TEXT NOT NULL DEFAULT 'unknown',
    "internationalHiring" TEXT NOT NULL DEFAULT 'unknown',
    "citizenshipRequired" BOOLEAN NOT NULL DEFAULT false,
    "securityClearanceRequired" BOOLEAN NOT NULL DEFAULT false,
    "visaScore" INTEGER NOT NULL DEFAULT 50,
    "sponsorshipMeta" TEXT NOT NULL DEFAULT '{}',
    "aliases" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Company_slug_key" ON "Company"("slug");
CREATE INDEX IF NOT EXISTS "Company_normalizedName_idx" ON "Company"("normalizedName");

ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "companyId" TEXT;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "matchBreakdown" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "visaAnalysis" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "visaScore" INTEGER NOT NULL DEFAULT 50;

CREATE INDEX IF NOT EXISTS "Job_companyId_idx" ON "Job"("companyId");
CREATE INDEX IF NOT EXISTS "Job_visaScore_idx" ON "Job"("visaScore");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Job_companyId_fkey'
  ) THEN
    ALTER TABLE "Job"
      ADD CONSTRAINT "Job_companyId_fkey"
      FOREIGN KEY ("companyId") REFERENCES "Company"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
