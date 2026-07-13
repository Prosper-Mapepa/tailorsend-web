-- Stripe customer + subscription ids on usage account
ALTER TABLE "UsageAccount" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;
ALTER TABLE "UsageAccount" ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT;

-- Idempotent checkout fulfillment
CREATE TABLE IF NOT EXISTS "StripeCheckout" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "meta" TEXT NOT NULL DEFAULT '{}',
    "fulfilled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeCheckout_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StripeCheckout_sessionId_key" ON "StripeCheckout"("sessionId");
CREATE INDEX IF NOT EXISTS "StripeCheckout_userId_idx" ON "StripeCheckout"("userId");
