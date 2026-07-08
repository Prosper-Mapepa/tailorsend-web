import { NextResponse } from "next/server";
import { requireAuthUser, isAuthUser } from "@/lib/auth";
import { getUsageSummary } from "@/lib/billing/usage";
import { CREDIT_PACKS } from "@/lib/billing/plans";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAuthUser();
  if (!isAuthUser(auth)) return auth;

  const usage = await getUsageSummary(auth.id, auth.email);
  return NextResponse.json({
    usage,
    packs: CREDIT_PACKS,
  });
}
