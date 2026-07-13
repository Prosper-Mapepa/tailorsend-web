import { NextResponse } from "next/server";
import { requireAuthUser, isAuthUser } from "@/lib/auth";
import { formatUploadedResume } from "@/lib/ai";
import { extractResumeText } from "@/lib/extract-text";
import { prepareResumeMarkdown } from "@/lib/markdown";
import { getProfile, profileResumeContact } from "@/lib/profile";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

/** Upload a resume file and return clean, formatted Markdown for preview/PDF. */
export async function POST(req: Request) {
  const auth = await requireAuthUser();
  if (!isAuthUser(auth)) return auth;

  let text = "";
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
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
          "Couldn't read meaningful text from this file (it may be a scanned image). Try a text-based PDF or DOCX.",
      },
      { status: 422 },
    );
  }

  try {
    const profile = await getProfile(auth.id);
    const raw = await formatUploadedResume(text, {
      projects: profile.projects,
      linkedin: profile.linkedin,
      website: profile.website,
    });
    const formatted = prepareResumeMarkdown(
      raw,
      profile.projects,
      profileResumeContact(profile),
    );
    return NextResponse.json({
      markdown: formatted,
      extractedChars: text.length,
      sourcePreview: text.slice(0, 500),
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
