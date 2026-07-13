import { NextResponse } from "next/server";
import { z } from "zod";
import { incorporateBuildIdeas } from "@/lib/ai";
import { requireAuthUser, isAuthUser } from "@/lib/auth";
import { prepareResumeMarkdown } from "@/lib/markdown";
import { getProfile, profileResumeContact } from "@/lib/profile";
import {
  ensureAllProfileProjects,
  preserveExistingProjects,
} from "@/lib/resume-projects";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

const schema = z.object({
  resume: z.string().min(1),
  coverLetter: z.string().default(""),
  job: z.object({
    title: z.string().default(""),
    company: z.string().default(""),
  }),
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

export async function POST(req: Request) {
  const auth = await requireAuthUser();
  if (!isAuthUser(auth)) return auth;

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  try {
    const result = await incorporateBuildIdeas(parsed.data);
    const profile = await getProfile(auth.id);
    let resume = preserveExistingProjects(parsed.data.resume, result.resume);
    resume = ensureAllProfileProjects(resume, profile.projects);
    return NextResponse.json({
      ...result,
      resume: prepareResumeMarkdown(
        resume,
        profile.projects,
        profileResumeContact(profile),
      ),
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
