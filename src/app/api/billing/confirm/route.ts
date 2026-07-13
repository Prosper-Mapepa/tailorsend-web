import { NextResponse } from "next/server";
import { requireAuthUser, isAuthUser } from "@/lib/auth";
import { fulfillCheckoutSession } from "@/lib/billing/fulfill";
import { getUsageSummary } from "@/lib/billing/usage";
import { isStripeEnabled } from "@/lib/billing/stripe";

export const dynamic = "force-dynamic";

/** Confirm checkout after redirect (webhook is source of truth; this is for fast UI refresh). */
export async function GET(req: Request) {
  const auth = await requireAuthUser();
  if (!isAuthUser(auth)) return auth;

  const sessionId = new URL(req.url).searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  if (!isStripeEnabled()) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  try {
    await fulfillCheckoutSession(sessionId);
    const usage = await getUsageSummary(auth.id, auth.email);
    return NextResponse.json({ ok: true, usage });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 },
    );
  }
}
