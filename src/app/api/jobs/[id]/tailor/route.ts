import { NextResponse } from "next/server";
import { researchCompanyEdge, normalizeCompanyEdge } from "@/lib/ai";
import { requireAuthUser, isAuthUser } from "@/lib/auth";
import {
  assertCanUse,
  consumeUsage,
  UsageLimitError,
  usageLimitResponse,
} from "@/lib/billing/usage";
import { prisma } from "@/lib/db";
import { getProfile } from "@/lib/profile";
import { runTailorPipeline } from "@/lib/tailor-pipeline";
import {
  createTailoredApplication,
  updateTailoredApplication,
  formatDbErrorForUser,
  type TailoredApplicationPayload,
} from "@/lib/application-persist";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 180;

// Generate tailored resume + cover letter for a job and store as an Application.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthUser();
  if (!isAuthUser(auth)) return auth;

  const { id } = await params;
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const profile = await getProfile(auth.id);
  if (!profile.baseResume.trim()) {
    return NextResponse.json(
      { error: "Add your base resume in Profile before tailoring." },
      { status: 400 },
    );
  }

  const tailorProfile = {
    fullName: profile.fullName,
    email: profile.email,
    phone: profile.phone,
    location: profile.location,
    summary: profile.summary,
    baseResume: profile.baseResume,
    skills: profile.skills,
    projects: profile.projects,
    workExperience: profile.workExperience,
    education: profile.education,
    certifications: profile.certifications,
    visaStatus: profile.visaStatus,
    linkedin: profile.linkedin,
    github: profile.github,
    website: profile.website,
  };

  const existing = await prisma.application.findFirst({
    where: { jobId: id, userId: auth.id },
    orderBy: { createdAt: "desc" },
  });

  const alreadyCharged = existing?.tailorKitCharged ?? false;

  try {
    if (!alreadyCharged) {
      await assertCanUse(auth.id, auth.email, "tailor");
    }

    const [tailored, edge] = await Promise.all([
      runTailorPipeline(
        {
          title: job.title,
          company: job.company,
          location: job.location,
          description: job.description,
        },
        tailorProfile,
      ),
      researchCompanyEdge({
        job: {
          title: job.title,
          company: job.company,
          location: job.location,
          description: job.description,
        },
        candidate: { summary: profile.summary, skills: profile.skills },
      }).catch(() => null),
    ]);

    const appData: TailoredApplicationPayload = {
      tailoredResume: tailored.tailoredResume,
      coverLetter: tailored.coverLetter,
      matchNotes: tailored.matchNotes,
      linkedInRecruiterNote: tailored.linkedInRecruiterNote,
      recruiterEmail: tailored.recruiterEmail,
      beforeMatch: JSON.stringify(tailored.beforeMatch),
      afterMatch: JSON.stringify(tailored.afterMatch),
      companyEdge: edge ? JSON.stringify(normalizeCompanyEdge(edge)) : "",
      status: "tailored",
    };

    const application = existing
      ? await updateTailoredApplication(prisma, existing.id, appData)
      : await createTailoredApplication(prisma, {
          jobId: id,
          userId: auth.id,
          ...appData,
        });

    if (!alreadyCharged) {
      await consumeUsage(auth.id, auth.email, "tailor", {
        applicationId: application.id,
      });
    }

    return NextResponse.json(application);
  } catch (err) {
    if (err instanceof UsageLimitError) return usageLimitResponse(err);
    return NextResponse.json(
      { error: formatDbErrorForUser(err) },
      { status: 500 },
    );
  }
}
