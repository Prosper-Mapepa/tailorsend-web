import { NextResponse } from "next/server";
import { researchCompanyEdge, normalizeCompanyEdge, type CompanyEdge } from "@/lib/ai";
import { requireAuthUser, isAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 180;

function parseStoredEdge(raw: string): CompanyEdge | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as CompanyEdge;
    if (!Array.isArray(parsed.research)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Return cached company edge research, or compute and cache. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthUser();
  if (!isAuthUser(auth)) return auth;

  const { id } = await params;
  const application = await prisma.application.findUnique({
    where: { id },
    include: { job: true },
  });
  if (!application || application.userId !== auth.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const cached = parseStoredEdge(application.companyEdge);
  if (cached) return NextResponse.json({ edge: normalizeCompanyEdge(cached) });

  return computeAndStore(application.id, auth.id);
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthUser();
  if (!isAuthUser(auth)) return auth;

  const { id } = await params;
  const application = await prisma.application.findUnique({ where: { id } });
  if (!application || application.userId !== auth.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return computeAndStore(id, auth.id);
}

async function computeAndStore(applicationId: string, userId: string) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { job: true },
  });
  if (!application || application.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const profile = await getProfile(userId);
  const edge = normalizeCompanyEdge(
    await researchCompanyEdge({
    job: {
      title: application.job.title,
      company: application.job.company,
      location: application.job.location,
      description: application.job.description,
    },
    candidate: { summary: profile.summary, skills: profile.skills },
    }),
  );

  try {
    await prisma.application.update({
      where: { id: applicationId },
      data: { companyEdge: JSON.stringify(edge) },
    });
  } catch (err) {
    console.error("Failed to cache company edge:", err);
  }

  return NextResponse.json({ edge });
}
