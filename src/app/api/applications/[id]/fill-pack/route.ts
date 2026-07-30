import { NextResponse } from "next/server";
import { requireAuthUser, isAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getProfile } from "@/lib/profile";
import type { FormFieldResponse } from "@/lib/types";
import { safeJson } from "@/lib/util";

export const dynamic = "force-dynamic";

function profileFallbackFields(
  profile: Awaited<ReturnType<typeof getProfile>>,
): FormFieldResponse[] {
  const rows: Array<[string, string, string]> = [
    ["First Name", "text", profile.fullName.trim().split(/\s+/)[0] || ""],
    ["Last Name", "text", profile.fullName.trim().split(/\s+/).slice(1).join(" ") || ""],
    ["Full Name", "text", profile.fullName],
    ["Email", "email", profile.email],
    ["Phone", "phone", profile.phone],
    ["Location", "text", profile.location],
    ["City", "text", profile.location],
    ["LinkedIn", "url", profile.linkedin],
    ["GitHub", "url", profile.github],
    ["Website", "url", profile.website],
    ["LinkedIn Profile", "url", profile.linkedin],
    ["Country", "text", "United States"],
    ["Are you legally authorized to work", "select", profile.authorizedToWork || "Yes"],
    ["Will you now or in the future require sponsorship", "select", profile.needsSponsorship ? "Yes" : "No"],
    ["Do you require sponsorship", "select", profile.needsSponsorship ? "Yes" : "No"],
    ["Gender", "select", profile.gender || "Decline to self-identify"],
    ["Race", "select", profile.raceEthnicity || "Decline to self-identify"],
    ["Veteran", "select", profile.veteranStatus || "I am not a protected veteran"],
    ["Disability", "select", profile.disabilityStatus || "I don't wish to answer"],
    ["How did you hear", "text", profile.hearAboutSource || "LinkedIn"],
  ];

  return rows
    .filter(([, , answer]) => Boolean(answer?.trim()))
    .map(([label, fieldType, answer]) => ({ label, fieldType, answer }));
}

/** Pack everything the Chrome extension needs to fill one application. */
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

  const profile = await getProfile(auth.id);
  const parsed = safeJson<Record<string, unknown>>(application.formAnswers, {});
  const generated = (parsed.generatedFields ?? []) as FormFieldResponse[];
  const fields = generated.length > 0 ? generated : profileFallbackFields(profile);

  return NextResponse.json({
    id: application.id,
    company: application.job.company,
    title: application.job.title,
    applyUrl: application.job.applyUrl || application.job.url || "",
    fields,
    hasGeneratedAnswers: generated.length > 0,
    resumeMarkdown: application.tailoredResume || "",
    coverMarkdown: application.coverLetter || "",
  });
}
