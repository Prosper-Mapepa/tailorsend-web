-- Usage metering: credits, plans, per-application kit flags.

ALTER TABLE "Application" ADD COLUMN "tailorKitCharged" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Application" ADD COLUMN "autofillKitCharged" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Application" ADD COLUMN "incorporateCharged" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "UsageAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "isStudent" BOOLEAN NOT NULL DEFAULT false,
    "creditBalance" INTEGER NOT NULL DEFAULT 0,
    "periodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tailorKitsUsed" INTEGER NOT NULL DEFAULT 0,
    "autofillKitsUsed" INTEGER NOT NULL DEFAULT 0,
    "planKitsUsed" INTEGER NOT NULL DEFAULT 0,
    "seasonKitsTotal" INTEGER NOT NULL DEFAULT 0,
    "seasonEndsAt" TIMESTAMP(3),
    "flexPausedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsageAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UsageAccount_userId_key" ON "UsageAccount"("userId");

CREATE TABLE "UsageEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "creditsDelta" INTEGER NOT NULL DEFAULT 0,
    "applicationId" TEXT NOT NULL DEFAULT '',
    "meta" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UsageEvent_userId_createdAt_idx" ON "UsageEvent"("userId", "createdAt");

ALTER TABLE "UsageAccount" ADD CONSTRAINT "UsageAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
