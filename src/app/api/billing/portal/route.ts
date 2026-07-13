import { NextResponse } from "next/server";
import { requireAuthUser, isAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { appBaseUrl, getStripe, isStripeEnabled } from "@/lib/billing/stripe";

export const dynamic = "force-dynamic";

/** Stripe Customer Portal — manage Flex subscription, payment methods, invoices. */
export async function POST() {
  const auth = await requireAuthUser();
  if (!isAuthUser(auth)) return auth;

  if (!isStripeEnabled()) {
    return NextResponse.json(
      { error: "Stripe is not configured." },
      { status: 503 },
    );
  }

  const account = await prisma.usageAccount.findUnique({
    where: { userId: auth.id },
  });

  if (!account?.stripeCustomerId) {
    return NextResponse.json(
      { error: "No billing account yet. Make a purchase first." },
      { status: 400 },
    );
  }

  try {
    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: account.stripeCustomerId,
      return_url: `${appBaseUrl()}/billing`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
