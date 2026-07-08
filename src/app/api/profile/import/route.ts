import { NextResponse } from "next/server";
import { requireAuthUser, isAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseResume } from "@/lib/ai";
import { extractResumeText } from "@/lib/extract-text";
import { getProfile } from "@/lib/profile";
import { enrichParsedResume } from "@/lib/resume-import";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

// Accept a resume file upload, extract text, parse structured fields,
// and replace the profile with what was found on the resume.
export async function POST(req: Request) {
  const auth = await requireAuthUser();
  if (!isAuthUser(auth)) return auth;

  let text = "";
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No file uploaded." },
        { status: 400 },
      );
    }
    const buffer = await file.arrayBuffer();
    text = await extractResumeText(buffer, file.name, file.type);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  if (text.trim().length < 30) {
    return NextResponse.json(
      {
        error:
          "Couldn't read meaningful text from this file (it may be a scanned image). Try a text-based PDF or paste your resume manually.",
      },
      { status: 422 },
    );
  }

  try {
    const parsed = enrichParsedResume(text, await parseResume(text));

    await prisma.profile.update({
      where: { userId: auth.id },
      data: {
        fullName: parsed.fullName,
        email: parsed.email,
        phone: parsed.phone,
        location: parsed.location,
        linkedin: parsed.linkedin,
        github: parsed.github,
        website: parsed.website,
        summary: parsed.summary,
        baseResume: text,
        skills: JSON.stringify(parsed.skills),
        workExperience: JSON.stringify(parsed.workExperience),
        education: JSON.stringify(parsed.education),
        certifications: JSON.stringify(parsed.certifications),
        projects: JSON.stringify(parsed.projects),
      },
    });

    const profile = await getProfile(auth.id);

    return NextResponse.json({
      profile,
      extractedChars: text.length,
      imported: {
        workExperience: parsed.workExperience.length,
        education: parsed.education.length,
        projects: parsed.projects.length,
        certifications: parsed.certifications.length,
        skills: parsed.skills.length,
        hasLinkedIn: Boolean(parsed.linkedin),
        hasGitHub: Boolean(parsed.github),
        hasWebsite: Boolean(parsed.website),
      },
    });
  } catch (err) {
    const message = (err as Error).message;
    const staleClient =
      message.includes("Unknown argument") ||
      (message.includes("Invalid `") && message.includes("profile.update"));
    return NextResponse.json(
      {
        error: staleClient
          ? "Database client is out of date. Stop the dev server, run `npx prisma generate && npm run db:migrate`, then run `npm run dev` again and retry."
          : message,
      },
      { status: 500 },
    );
  }
}
