import { NextResponse } from "next/server";
import { requireAuthUser, isAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getProfile } from "@/lib/profile";
import {
  extractJobRubric,
  scoreAgainstRubric,
  type MatchScore,
} from "@/lib/match-score";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function parseStoredMatch(raw: string): MatchScore | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as MatchScore;
    if (typeof parsed.score !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Return cached ATS match scores, or compute from stored resumes and cache. */
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

  const before = parseStoredMatch(application.beforeMatch);
  const after = parseStoredMatch(application.afterMatch);
  if (before && after) {
    return NextResponse.json({ beforeMatch: before, afterMatch: after });
  }

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
  if (!profile.baseResume.trim() || !application.tailoredResume.trim()) {
    return NextResponse.json(
      { error: "Base resume and tailored resume are required to score." },
      { status: 400 },
    );
  }

  const rubric = await extractJobRubric({
    title: application.job.title || "the role",
    company: application.job.company || "the company",
    description: application.job.description,
  });

  const beforeMatch = scoreAgainstRubric(profile.baseResume, rubric);
  const afterMatch = scoreAgainstRubric(application.tailoredResume, rubric);

  try {
    await prisma.application.update({
      where: { id: applicationId },
      data: {
        beforeMatch: JSON.stringify(beforeMatch),
        afterMatch: JSON.stringify(afterMatch),
      },
    });
  } catch (err) {
    console.error("Failed to cache match scores:", err);
  }

  return NextResponse.json({ beforeMatch, afterMatch });
}
