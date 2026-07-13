import { NextResponse } from "next/server";
import { requireAuthUser, isAuthUser } from "@/lib/auth";
import { apiRouteError } from "@/lib/api-response";
import { prisma } from "@/lib/db";
import { extractResumeText } from "@/lib/extract-text";
import { getProfile } from "@/lib/profile";
import { quickExtractContact } from "@/lib/profile-parse";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Fast resume upload: extract text and save baseResume immediately.
 * Call POST /api/profile/parse afterward for AI field extraction.
 */
export async function POST(req: Request) {
  try {
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

    const contact = quickExtractContact(text);

    await prisma.profile.upsert({
      where: { userId: auth.id },
      create: {
        userId: auth.id,
        email: contact.email,
        phone: contact.phone,
        baseResume: text,
      },
      update: {
        email: contact.email || undefined,
        phone: contact.phone || undefined,
        baseResume: text,
      },
    });

    const profile = await getProfile(auth.id);

    return NextResponse.json({
      profile,
      extractedChars: text.length,
      needsParse: true,
    });
  } catch (err) {
    return apiRouteError(err, "POST /api/profile/import");
  }
}
