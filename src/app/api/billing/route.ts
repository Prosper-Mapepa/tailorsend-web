import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthUser, isAuthUser } from "@/lib/auth";
import {
  addCredits,
  pauseFlex,
  setPlan,
  UsageLimitError,
  usageLimitResponse,
} from "@/lib/billing/usage";
import {
  CREDIT_PACKS,
  FLEX_PRICE_CENTS,
  SEASON_PRICE_CENTS,
  isStudentEmail,
  packById,
} from "@/lib/billing/plans";
import { isStripeEnabled } from "@/lib/billing/stripe";

export const dynamic = "force-dynamic";

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("purchase_pack"),
    packId: z.string(),
  }),
  z.object({
    action: z.literal("set_plan"),
    plan: z.enum(["free", "flex", "season"]),
  }),
  z.object({
    action: z.literal("pause_flex"),
  }),
]);

/** Dev-only billing when Stripe is not configured. */
export async function POST(req: Request) {
  const auth = await requireAuthUser();
  if (!isAuthUser(auth)) return auth;

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  if (
    isStripeEnabled() &&
    (data.action === "purchase_pack" || data.action === "set_plan")
  ) {
    return NextResponse.json(
      {
        error: "Use checkout for purchases. Paid plans and packs go through Stripe.",
        code: "USE_CHECKOUT",
      },
      { status: 400 },
    );
  }

  try {
    if (data.action === "purchase_pack") {
      const pack = packById(data.packId);
      if (!pack) {
        return NextResponse.json({ error: "Unknown pack" }, { status: 400 });
      }
      const student = isStudentEmail(auth.email);
      const priceCents =
        student && pack.studentPriceCents != null
          ? pack.studentPriceCents
          : pack.priceCents;
      const usage = await addCredits(auth.id, auth.email, pack.kits, pack.id);
      return NextResponse.json({
        ok: true,
        usage,
        chargedCents: priceCents,
        message: `Added ${pack.kits} kits to your account.`,
        devNote:
          "Stripe not connected — this is a simulated purchase for development.",
      });
    }

    if (data.action === "set_plan") {
      const usage = await setPlan(auth.id, auth.email, data.plan);
      const price =
        data.plan === "flex"
          ? FLEX_PRICE_CENTS
          : data.plan === "season"
            ? SEASON_PRICE_CENTS
            : 0;
      return NextResponse.json({
        ok: true,
        usage,
        chargedCents: price,
        message: `Plan set to ${data.plan}.`,
        devNote: "Simulated plan change (no Stripe).",
      });
    }

    const usage = await pauseFlex(auth.id, auth.email);
    return NextResponse.json({
      ok: true,
      usage,
      message: "Student Monthly paused for 30 days.",
    });
  } catch (err) {
    if (err instanceof UsageLimitError) return usageLimitResponse(err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    packs: CREDIT_PACKS,
    plans: {
      flex: { priceCents: FLEX_PRICE_CENTS, kitsPerMonth: 20 },
      season: { priceCents: SEASON_PRICE_CENTS, totalKits: 60, months: 4 },
    },
  });
}
