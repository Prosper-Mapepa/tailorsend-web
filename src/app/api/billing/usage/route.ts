import { NextResponse } from "next/server";
import { apiRouteError } from "@/lib/api-response";
import { requireAuthUser, isAuthUser } from "@/lib/auth";
import { getUsageSummary } from "@/lib/billing/usage";
import { storefrontPacks } from "@/lib/billing/plans";
import { isStripeEnabled } from "@/lib/billing/stripe";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAuthUser();
    if (!isAuthUser(auth)) return auth;

    const usage = await getUsageSummary(auth.id, auth.email);

    let hasStripeCustomer = false;
    let hasSubscription = false;
    try {
      const account = await prisma.usageAccount.findUnique({
        where: { userId: auth.id },
        select: { stripeCustomerId: true, stripeSubscriptionId: true },
      });
      hasStripeCustomer = Boolean(account?.stripeCustomerId);
      hasSubscription = Boolean(account?.stripeSubscriptionId);
    } catch (stripeErr) {
      console.warn("Stripe columns unavailable:", stripeErr);
    }

    return NextResponse.json({
      usage,
      packs: storefrontPacks(),
      stripeEnabled: isStripeEnabled(),
      hasStripeCustomer,
      hasSubscription,
    });
  } catch (err) {
    return apiRouteError(err, "GET /api/billing/usage");
  }
}
