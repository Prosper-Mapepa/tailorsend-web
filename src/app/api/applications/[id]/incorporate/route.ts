import { NextResponse } from "next/server";
import { z } from "zod";
import { incorporateBuildIdeas } from "@/lib/ai";
import { requireAuthUser, isAuthUser } from "@/lib/auth";
import {
  consumeUsage,
  UsageLimitError,
  usageLimitResponse,
} from "@/lib/billing/usage";
import { prisma } from "@/lib/db";
import { prepareResumeMarkdown } from "@/lib/markdown";
import { getProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

const schema = z.object({
  ideas: z
    .array(
      z.object({
        title: z.string(),
        description: z.string().default(""),
        tech: z.array(z.string()).default([]),
        impact: z.string().default(""),
      }),
    )
    .min(1, "Select at least one suggestion."),
});

export async function POST(
  req: Request,
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

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  if (!application.tailoredResume.trim()) {
    return NextResponse.json(
      { error: "Tailor a resume before adding build ideas." },
      { status: 400 },
    );
  }

  try {
    await consumeUsage(auth.id, auth.email, "incorporate", {
      applicationId: id,
      alreadyCharged: application.incorporateCharged,
    });

    const result = await incorporateBuildIdeas({
      resume: application.tailoredResume,
      coverLetter: application.coverLetter,
      job: {
        title: application.job.title,
        company: application.job.company,
      },
      ideas: parsed.data.ideas,
    });

    const profile = await getProfile(auth.id);
    const resume = prepareResumeMarkdown(result.resume, profile.projects);

    const updated = await prisma.application.update({
      where: { id },
      data: {
        tailoredResume: resume,
        coverLetter: result.coverLetter,
      },
      include: { job: true },
    });

    return NextResponse.json({
      resume,
      coverLetter: result.coverLetter,
      application: updated,
    });
  } catch (err) {
    if (err instanceof UsageLimitError) return usageLimitResponse(err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
