import { NextResponse } from "next/server";
import { requireAuthUser, isAuthUser } from "@/lib/auth";
import { apiRouteError } from "@/lib/api-response";
import { getProfile } from "@/lib/profile";
import { parseAndSaveProfile } from "@/lib/profile-parse";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

/** AI-parse the saved base resume into structured profile fields. */
export async function POST() {
  try {
    const auth = await requireAuthUser();
    if (!isAuthUser(auth)) return auth;

    const profile = await getProfile(auth.id);
    const text = profile.baseResume.trim();
    if (text.length < 30) {
      return NextResponse.json(
        {
          error:
            "No resume text saved yet. Upload a resume first, then try again.",
        },
        { status: 400 },
      );
    }

    const result = await parseAndSaveProfile(auth.id, text);
    return NextResponse.json({
      profile: result.profile,
      imported: result.imported,
    });
  } catch (err) {
    return apiRouteError(err, "POST /api/profile/parse");
  }
}
