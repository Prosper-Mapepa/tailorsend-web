import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthUser, isAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  appBaseUrl,
  checkoutLineItems,
  checkoutMode,
  getStripe,
  isStripeEnabled,
  type CheckoutKind,
} from "@/lib/billing/stripe";

export const dynamic = "force-dynamic";

const schema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("pack"), packId: z.string() }),
  z.object({ kind: z.literal("flex") }),
  z.object({ kind: z.literal("season") }),
]);

export async function POST(req: Request) {
  const auth = await requireAuthUser();
  if (!isAuthUser(auth)) return auth;

  if (!isStripeEnabled()) {
    return NextResponse.json(
      {
        error:
          "Stripe is not configured. Set STRIPE_SECRET_KEY to enable checkout.",
      },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid checkout request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { kind } = parsed.data;
  const packId = parsed.data.kind === "pack" ? parsed.data.packId : undefined;

  try {
    const stripe = getStripe();
    const account = await prisma.usageAccount.findUnique({
      where: { userId: auth.id },
    });

    let customerId = account?.stripeCustomerId ?? undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: auth.email,
        name: auth.name || undefined,
        metadata: { userId: auth.id },
      });
      customerId = customer.id;
      await prisma.usageAccount.upsert({
        where: { userId: auth.id },
        create: { userId: auth.id, stripeCustomerId: customerId },
        update: { stripeCustomerId: customerId },
      });
    }

    const base = appBaseUrl();
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: checkoutMode(kind as CheckoutKind),
      line_items: checkoutLineItems(kind as CheckoutKind, auth.email, packId),
      metadata: {
        userId: auth.id,
        kind,
        packId: packId ?? "",
      },
      success_url: `${base}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/billing/cancel`,
      allow_promotion_codes: true,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Could not create checkout session." },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
