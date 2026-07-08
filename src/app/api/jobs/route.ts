import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;
  const source = searchParams.get("source") ?? undefined;
  const minScore = Number(searchParams.get("minScore") ?? 0);
  const q = searchParams.get("q")?.toLowerCase();
  const sort = searchParams.get("sort") ?? "match"; // match | recent
  const sponsorshipFriendly = searchParams.get("sponsorshipFriendly") === "1";

  // "recent" sorts by posted date (then discovery); "match" by relevance.
  const orderBy =
    sort === "recent"
      ? [{ postedAt: "desc" as const }, { discoveredAt: "desc" as const }]
      : [{ matchScore: "desc" as const }, { discoveredAt: "desc" as const }];

  const jobs = await prisma.job.findMany({
    where: {
      ...(status ? { status } : { status: { not: "hidden" } }),
      ...(source ? { source } : {}),
      ...(sponsorshipFriendly ? { visaRisk: "none" } : {}),
      matchScore: { gte: Number.isFinite(minScore) ? minScore : 0 },
    },
    orderBy,
    take: 300,
    include: {
      applications: {
        select: { id: true, status: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const filtered = q
    ? jobs.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.company.toLowerCase().includes(q),
      )
    : jobs;

  return NextResponse.json({ jobs: filtered });
}

// Clear discovered jobs. Preserves any job that already has an application so
// tailored work is never lost.
export async function DELETE() {
  const result = await prisma.job.deleteMany({
    where: { applications: { none: {} } },
  });
  return NextResponse.json({ deleted: result.count });
}
