import { NextResponse } from "next/server";
import { isAuthUser, requireAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { TargetRole } from "@/lib/types";
import { safeJson } from "@/lib/util";

export const dynamic = "force-dynamic";

function truthy(v: string | null): boolean {
  return v === "1" || v === "true";
}

export async function GET(req: Request) {
  const auth = await requireAuthUser();
  if (!isAuthUser(auth)) return auth;

  const profile = await prisma.profile.findUnique({
    where: { userId: auth.id },
    select: { targetRoles: true },
  });
  const targetRoles = safeJson<TargetRole[]>(profile?.targetRoles, []).filter(
    (r) => r.title?.trim(),
  );
  if (targetRoles.length === 0) {
    return NextResponse.json({
      jobs: [],
      requiresTargetRoles: true,
    });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;
  const source = searchParams.get("source") ?? undefined;
  const minScore = Number(searchParams.get("minScore") ?? 0);
  const q = searchParams.get("q")?.toLowerCase();
  const sort = searchParams.get("sort") ?? "match"; // match | recent | visa
  const sponsorshipFriendly = truthy(searchParams.get("sponsorshipFriendly"));
  const optFriendly = truthy(searchParams.get("optFriendly"));
  const stemOpt = truthy(searchParams.get("stemOpt"));
  const h1bSponsor = truthy(searchParams.get("h1bSponsor"));
  const greenCardSponsor = truthy(searchParams.get("greenCardSponsor"));
  const eVerify = truthy(searchParams.get("eVerify"));
  const noCitizenship = truthy(searchParams.get("noCitizenship"));
  const noClearance = truthy(searchParams.get("noClearance"));
  const remote = truthy(searchParams.get("remote"));
  const hybrid = truthy(searchParams.get("hybrid"));
  const entryLevel = truthy(searchParams.get("entryLevel"));
  const internship = truthy(searchParams.get("internship"));
  const category = searchParams.get("category")?.toLowerCase() ?? "";

  const orderBy =
    sort === "recent"
      ? [{ postedAt: "desc" as const }, { discoveredAt: "desc" as const }]
      : sort === "visa"
        ? [{ visaScore: "desc" as const }, { matchScore: "desc" as const }]
        : [{ matchScore: "desc" as const }, { discoveredAt: "desc" as const }];

  const jobs = await prisma.job.findMany({
    where: {
      ...(status ? { status } : { status: { not: "hidden" } }),
      ...(source ? { source } : {}),
      ...(sponsorshipFriendly ? { visaRisk: "none" } : {}),
      ...(remote ? { remote: true } : {}),
      ...(noCitizenship
        ? {
            OR: [
              { visaRisk: { not: "citizenship" } },
              { visaRisk: "none" },
            ],
          }
        : {}),
      ...(noClearance ? { visaRisk: { not: "clearance" } } : {}),
      ...(h1bSponsor || greenCardSponsor || eVerify
        ? {
            companyRef: {
              ...(h1bSponsor ? { h1bSponsor: "yes" } : {}),
              ...(greenCardSponsor ? { greenCardSponsor: "yes" } : {}),
              ...(eVerify ? { eVerify: "yes" } : {}),
            },
          }
        : {}),
      matchScore: { gte: Number.isFinite(minScore) ? minScore : 0 },
    },
    orderBy,
    take: 400,
    include: {
      companyRef: {
        select: {
          id: true,
          slug: true,
          name: true,
          optFriendly: true,
          stemOptFriendly: true,
          eVerify: true,
          h1bSponsor: true,
          greenCardSponsor: true,
          visaScore: true,
          citizenshipRequired: true,
          securityClearanceRequired: true,
        },
      },
      applications: {
        where: { userId: auth.id },
        select: { id: true, status: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  let filtered = q
    ? jobs.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.company.toLowerCase().includes(q),
      )
    : jobs;

  if (
    hybrid ||
    entryLevel ||
    internship ||
    category ||
    optFriendly ||
    stemOpt
  ) {
    filtered = filtered.filter((j) => {
      const analysis = safeJson<Record<string, unknown>>(j.visaAnalysis, {});
      if (hybrid && !analysis.hybrid) return false;
      if (entryLevel && !analysis.entryLevel) return false;
      if (internship && !analysis.internship) return false;
      if (category) {
        const cats = Array.isArray(analysis.categories)
          ? (analysis.categories as string[])
          : [];
        if (!cats.map((c) => c.toLowerCase()).includes(category)) return false;
      }
      if (optFriendly) {
        const ok =
          analysis.optFriendly === true || j.companyRef?.optFriendly === "yes";
        if (!ok) return false;
      }
      if (stemOpt) {
        const ok =
          analysis.stemOptFriendly === true ||
          j.companyRef?.stemOptFriendly === "yes";
        if (!ok) return false;
      }
      return true;
    });
  }

  const shaped = filtered.map((j) => {
    const analysis = safeJson<Record<string, unknown>>(j.visaAnalysis, {});
    const breakdown = safeJson<Record<string, number>>(j.matchBreakdown, {});
    return {
      ...j,
      visaAnalysis: analysis,
      matchBreakdown: breakdown,
      companySlug: j.companyRef?.slug ?? null,
    };
  });

  return NextResponse.json({ jobs: shaped });
}

export async function DELETE() {
  const auth = await requireAuthUser();
  if (!isAuthUser(auth)) return auth;

  const result = await prisma.job.deleteMany({
    where: { applications: { none: {} } },
  });
  return NextResponse.json({ deleted: result.count });
}
