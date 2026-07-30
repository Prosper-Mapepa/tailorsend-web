import { NextResponse } from "next/server";
import { scoreApplicationUrlMatch } from "@/lib/application-url-match";
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

/**
 * Match the current browser apply-page URL to the user's TailorSend applications.
 * Used by the Chrome extension overlay (no prior dashboard click required).
 */
export async function GET(req: Request) {
  const auth = await requireAuthUser();
  if (!isAuthUser(auth)) return auth;

  const url = new URL(req.url).searchParams.get("url")?.trim() || "";
  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  const applications = await prisma.application.findMany({
    where: { userId: auth.id },
    orderBy: { updatedAt: "desc" },
    include: { job: true },
    take: 80,
  });

  const profile = await getProfile(auth.id);
  const fallback = profileFallbackFields(profile);

  const scored = applications
    .map((app) => {
      const applyUrl = app.job.applyUrl || app.job.url || "";
      const score = Math.max(
        scoreApplicationUrlMatch(url, applyUrl),
        scoreApplicationUrlMatch(url, app.job.url || ""),
      );
      const parsed = safeJson<Record<string, unknown>>(app.formAnswers, {});
      const generated = (parsed.generatedFields ?? []) as FormFieldResponse[];
      const fields = generated.length > 0 ? generated : fallback;
      return {
        score,
        application: {
          id: app.id,
          status: app.status,
          company: app.job.company,
          title: app.job.title,
          applyUrl,
          fields,
          hasGeneratedAnswers: generated.length > 0,
          hasResume: Boolean(app.tailoredResume?.trim()),
          hasCover: Boolean(app.coverLetter?.trim()),
          resumeMarkdown: app.tailoredResume || "",
          coverMarkdown: app.coverLetter || "",
          updatedAt: app.updatedAt,
        },
      };
    })
    .filter((row) => row.score >= 40)
    .sort((a, b) => b.score - a.score || +new Date(b.application.updatedAt) - +new Date(a.application.updatedAt));

  return NextResponse.json({
    url,
    matches: scored.map((s) => ({ ...s.application, score: s.score })),
    best: scored[0] ? { ...scored[0].application, score: scored[0].score } : null,
  });
}
