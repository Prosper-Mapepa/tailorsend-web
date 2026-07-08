import { NextResponse } from "next/server";
import {
  generateCommonFormResponses,
  generateFormResponsesFromScreenshot,
} from "@/lib/ai";
import { requireAuthUser, isAuthUser } from "@/lib/auth";
import { getProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function profilePayload(profile: Awaited<ReturnType<typeof getProfile>>) {
  return {
    fullName: profile.fullName,
    email: profile.email,
    phone: profile.phone,
    location: profile.location,
    summary: profile.summary,
    baseResume: profile.baseResume,
    skills: profile.skills,
    projects: profile.projects,
    visaStatus: profile.visaStatus,
    linkedin: profile.linkedin,
    github: profile.github,
    website: profile.website,
  };
}

export async function POST(req: Request) {
  const auth = await requireAuthUser();
  if (!isAuthUser(auth)) return auth;

  const contentType = req.headers.get("content-type") ?? "";
  const profile = await getProfile(auth.id);

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("image");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Upload an image screenshot." }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Upload an image file (PNG or JPG)." }, { status: 400 });
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Image is larger than 8MB." }, { status: 400 });
    }

    const title = String(form.get("title") ?? "").trim();
    const company = String(form.get("company") ?? "").trim();
    const location = String(form.get("location") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    const tailoredResume = String(form.get("tailoredResume") ?? "").trim();
    const coverLetter = String(form.get("coverLetter") ?? "").trim();

    if (!tailoredResume) {
      return NextResponse.json(
        { error: "Tailor a resume first, then upload the application form screenshot." },
        { status: 400 },
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const imageDataUrl = `data:${file.type};base64,${buf.toString("base64")}`;

    try {
      const fields = await generateFormResponsesFromScreenshot({
        imageDataUrl,
        job: {
          title: title || "the role",
          company: company || "the company",
          location,
          description,
        },
        profile: profilePayload(profile),
        tailoredResume,
        coverLetter,
      });

      return NextResponse.json({ fields });
    } catch (err) {
      return NextResponse.json(
        { error: (err as Error).message },
        { status: 500 },
      );
    }
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body.title ?? "").trim();
  const company = String(body.company ?? "").trim();
  const location = String(body.location ?? "").trim();
  const description = String(body.description ?? "").trim();
  const tailoredResume = String(body.tailoredResume ?? "").trim();
  const coverLetter = String(body.coverLetter ?? "").trim();

  if (!tailoredResume) {
    return NextResponse.json(
      { error: "Tailor a resume first, then generate form answers." },
      { status: 400 },
    );
  }

  try {
    const fields = await generateCommonFormResponses({
      job: {
        title: title || "the role",
        company: company || "the company",
        location,
        description,
      },
      profile: profilePayload(profile),
      tailoredResume,
      coverLetter,
    });

    return NextResponse.json({ fields });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
