import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthUser, isAuthUser } from "@/lib/auth";
import {
  assertCanUse,
  consumeUsage,
  UsageLimitError,
  usageLimitResponse,
} from "@/lib/billing/usage";
import { prisma } from "@/lib/db";
import { autofillApplication } from "@/lib/apply/autofill";
import { manualApplyNotice, requiresAuthentication } from "@/lib/apply/detect";
import { buildFormAnswers, buildAutofillProfile, getProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 180;

const schema = z.object({
  headless: z.boolean().optional(),
  continueSession: z.boolean().optional(),
  resumeAlreadyUploaded: z.boolean().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthUser();
  if (!isAuthUser(auth)) return auth;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { headless, continueSession, resumeAlreadyUploaded } = schema.parse(body ?? {});

  const application = await prisma.application.findUnique({
    where: { id },
    include: { job: true },
  });
  if (!application || application.userId !== auth.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const applyUrl = application.job.applyUrl || application.job.url;
  if (!applyUrl) {
    return NextResponse.json(
      { error: "This job has no application URL." },
      { status: 400 },
    );
  }

  if (requiresAuthentication(applyUrl, application.job.atsPlatform)) {
    return NextResponse.json(
      {
        ok: false,
        error: manualApplyNotice(applyUrl, application.job.atsPlatform),
      },
      { status: 400 },
    );
  }

  const profile = await getProfile(auth.id);

  try {
    await consumeUsage(auth.id, auth.email, "autofill", {
      applicationId: application.id,
      alreadyCharged: application.autofillKitCharged,
      continueSession: Boolean(continueSession),
    });
  } catch (err) {
    if (err instanceof UsageLimitError) return usageLimitResponse(err);
    throw err;
  }

  const answers = buildFormAnswers(
    profile,
    application.tailoredResume,
    application.coverLetter,
  );

  const result = await autofillApplication({
    applicationId: application.id,
    applyUrl,
    answers,
    job: {
      title: application.job.title,
      company: application.job.company,
      description: application.job.description,
    },
    profile: buildAutofillProfile(profile),
    headless,
    continueSession,
    resumeAlreadyUploaded,
  });

  const existingAnswers = JSON.parse(application.formAnswers || "{}") as Record<
    string,
    unknown
  >;

  await prisma.application.update({
    where: { id },
    data: {
      status: result.ok ? "needs_review" : "failed",
      formAnswers: JSON.stringify({
        ...existingAnswers,
        ...answers,
        autofillFields: result.fields,
      }),
      reviewScreenshot: result.screenshotPath || application.reviewScreenshot,
      autoApplyLog: result.log.join("\n"),
    },
  });

  return NextResponse.json(result);
}
