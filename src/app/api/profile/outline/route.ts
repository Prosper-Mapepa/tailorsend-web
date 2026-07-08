import { NextResponse } from "next/server";
import { requireAuthUser, isAuthUser } from "@/lib/auth";
import { generateResumeOutline } from "@/lib/ai";
import { getProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

// Generate a high-impact master resume outline personalized from the profile.
// Does not persist; returns the markdown for the user to review and save.
export async function POST() {
  const auth = await requireAuthUser();
  if (!isAuthUser(auth)) return auth;

  const profile = await getProfile(auth.id);
  try {
    const outline = await generateResumeOutline({
      profile: {
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
      },
      targetTitles: profile.targetRoles.map((r) => r.title).filter(Boolean),
    });
    return NextResponse.json({ outline });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
