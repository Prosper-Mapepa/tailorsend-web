import { NextResponse } from "next/server";
import { requireAuthUser, isAuthUser } from "@/lib/auth";
import { getUsageSummary } from "@/lib/billing/usage";
import { CREDIT_PACKS } from "@/lib/billing/plans";
import { isStripeEnabled } from "@/lib/billing/stripe";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAuthUser();
  if (!isAuthUser(auth)) return auth;

  try {
    const usage = await getUsageSummary(auth.id, auth.email);
    const account = await prisma.usageAccount.findUnique({
      where: { userId: auth.id },
      select: { stripeCustomerId: true, stripeSubscriptionId: true },
    });

    return NextResponse.json({
      usage,
      packs: CREDIT_PACKS,
      stripeEnabled: isStripeEnabled(),
      hasStripeCustomer: Boolean(account?.stripeCustomerId),
      hasSubscription: Boolean(account?.stripeSubscriptionId),
    });
  } catch (err) {
    console.error("GET /api/billing/usage failed:", err);
    return NextResponse.json(
      {
        error:
          (err as Error).message ||
          "Could not load billing. If you recently updated the app, run npm run db:migrate.",
      },
      { status: 500 },
    );
  }
}
