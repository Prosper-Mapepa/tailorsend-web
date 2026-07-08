import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { generateCommonFormResponses, generateFormResponsesFromScreenshot } from "@/lib/ai";
import { requireAuthUser, isAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getProfile } from "@/lib/profile";
import type { FormFieldResponse } from "@/lib/types";
import { safeJson } from "@/lib/util";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

async function imageToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Upload an image file (PNG or JPG).");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image is larger than 8MB.");
  }
  const buf = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buf.toString("base64")}`;
}

async function pathToDataUrl(filePath: string): Promise<string> {
  const buf = await fs.readFile(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime =
    ext === ".jpg" || ext === ".jpeg"
      ? "image/jpeg"
      : ext === ".webp"
        ? "image/webp"
        : "image/png";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

export async function POST(
  req: Request,
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

  const contentType = req.headers.get("content-type") ?? "";
  let imageDataUrl: string | null = null;

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("image");
    if (file instanceof File) {
      imageDataUrl = await imageToDataUrl(file);
    }
  }

  if (!imageDataUrl && application.reviewScreenshot) {
    try {
      imageDataUrl = await pathToDataUrl(application.reviewScreenshot);
    } catch {
      // Screenshot missing on disk — fall through to common generation.
    }
  }

  if (!imageDataUrl) {
    if (!application.tailoredResume.trim()) {
      return NextResponse.json(
        { error: "Tailor a resume first, then generate form answers." },
        { status: 400 },
      );
    }

    try {
      const fields = await generateCommonFormResponses({
        job: {
          title: application.job.title,
          company: application.job.company,
          location: application.job.location,
          description: application.job.description,
        },
        profile: {
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
        },
        tailoredResume: application.tailoredResume,
        coverLetter: application.coverLetter,
      });

      const existing = safeJson<Record<string, unknown>>(application.formAnswers, {});
      await prisma.application.update({
        where: { id },
        data: {
          formAnswers: JSON.stringify({
            ...existing,
            generatedFields: fields,
          }),
        },
      });

      return NextResponse.json({ fields });
    } catch (err) {
      return NextResponse.json(
        { error: (err as Error).message },
        { status: 500 },
      );
    }
  }

  try {
    const fields = await generateFormResponsesFromScreenshot({
      imageDataUrl,
      job: {
        title: application.job.title,
        company: application.job.company,
        location: application.job.location,
        description: application.job.description,
      },
      profile: {
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
      },
      tailoredResume: application.tailoredResume,
      coverLetter: application.coverLetter,
    });

    const existing = safeJson<Record<string, unknown>>(application.formAnswers, {});
    await prisma.application.update({
      where: { id },
      data: {
        formAnswers: JSON.stringify({
          ...existing,
          generatedFields: fields,
        }),
      },
    });

    return NextResponse.json({ fields });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthUser();
  if (!isAuthUser(auth)) return auth;

  const { id } = await params;
  const application = await prisma.application.findUnique({ where: { id } });
  if (!application || application.userId !== auth.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = safeJson<Record<string, unknown>>(application.formAnswers, {});
  const fields = (parsed.generatedFields ?? []) as FormFieldResponse[];
  return NextResponse.json({ fields });
}
