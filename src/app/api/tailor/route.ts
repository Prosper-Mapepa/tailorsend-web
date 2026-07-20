import { createHash } from "crypto";
import { NextResponse } from "next/server";
import {
  extractJobPosting,
  normalizeCompanyEdge,
  researchCompanyEdge,
} from "@/lib/ai";
import { detectAts } from "@/lib/apply/detect";
import { fetchJobText } from "@/lib/fetch-job";
import { runTailorPipeline } from "@/lib/tailor-pipeline";
import { requireAuthUser, isAuthUser } from "@/lib/auth";
import {
  assertCanUse,
  consumeUsage,
  UsageLimitError,
  usageLimitResponse,
} from "@/lib/billing/usage";
import { prisma } from "@/lib/db";
import { getProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 180;

const MAX_IMAGES = 6;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

interface JobSeed {
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
}

function tailorExternalId(url: string, job: JobSeed): string {
  if (url.trim()) {
    return createHash("sha256")
      .update(url.trim().toLowerCase())
      .digest("hex")
      .slice(0, 32);
  }
  const key =
    `${job.company}|${job.title}|${job.description.slice(0, 240)}`.toLowerCase();
  return createHash("sha256").update(key).digest("hex").slice(0, 32);
}

async function resolveJob(req: Request): Promise<JobSeed> {
  const contentType = req.headers.get("content-type") ?? "";

  let title = "";
  let company = "";
  let location = "";
  let pastedText = "";
  let url = "";
  const images: string[] = [];

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    title = String(form.get("title") ?? "").trim();
    company = String(form.get("company") ?? "").trim();
    location = String(form.get("location") ?? "").trim();
    pastedText = String(form.get("text") ?? "").trim();
    url = String(form.get("url") ?? "").trim();

    for (const entry of form.getAll("images")) {
      if (!(entry instanceof File)) continue;
      if (!entry.type.startsWith("image/")) {
        throw new Error(`"${entry.name}" is not an image.`);
      }
      if (entry.size > MAX_IMAGE_BYTES) {
        throw new Error(`"${entry.name}" is larger than 8MB.`);
      }
      const buf = Buffer.from(await entry.arrayBuffer());
      images.push(`data:${entry.type};base64,${buf.toString("base64")}`);
      if (images.length >= MAX_IMAGES) break;
    }
  } else {
    const body = await req.json().catch(() => ({}));
    title = String(body.title ?? "").trim();
    company = String(body.company ?? "").trim();
    location = String(body.location ?? "").trim();
    pastedText = String(body.text ?? "").trim();
    url = String(body.url ?? "").trim();
  }

  let sourceText = pastedText;
  if (url) {
    const fetched = await fetchJobText(url);
    sourceText = sourceText ? `${sourceText}\n\n${fetched}` : fetched;
  }

  if (!sourceText && images.length === 0) {
    throw new Error(
      "Provide a job link, paste the description, or upload screenshots.",
    );
  }

  if (sourceText && images.length === 0 && title && company) {
    return { title, company, location, description: sourceText, url };
  }

  const extracted = await extractJobPosting({
    text: sourceText || undefined,
    images: images.length ? images : undefined,
  });

  return {
    title: title || extracted.title,
    company: company || extracted.company,
    location: location || extracted.location,
    description: extracted.description || sourceText,
    url,
  };
}

export async function POST(req: Request) {
  const auth = await requireAuthUser();
  if (!isAuthUser(auth)) return auth;

  let job: JobSeed;
  try {
    job = await resolveJob(req);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  if (!job.description || job.description.trim().length < 40) {
    return NextResponse.json(
      {
        error:
          "Couldn't read a usable job description. Try pasting the text or clearer screenshots.",
      },
      { status: 422 },
    );
  }

  const profile = await getProfile(auth.id);
  if (!profile.baseResume.trim()) {
    return NextResponse.json(
      { error: "Add your base resume in Profile before tailoring." },
      { status: 400 },
    );
  }

  const applyUrl = job.url;
  const atsPlatform = applyUrl ? detectAts(applyUrl) : "unknown";
  const externalId = tailorExternalId(job.url, job);

  const dbJob = await prisma.job.upsert({
    where: {
      source_externalId: { source: "tailor", externalId },
    },
    create: {
      source: "tailor",
      externalId,
      title: job.title || "Untitled role",
      company: job.company || "Unknown company",
      location: job.location || "",
      url: job.url || "",
      applyUrl: job.url || "",
      description: job.description,
      atsPlatform,
      status: "tailored",
    },
    update: {
      title: job.title || "Untitled role",
      company: job.company || "Unknown company",
      location: job.location || "",
      description: job.description,
      ...(job.url
        ? { url: job.url, applyUrl: job.url, atsPlatform }
        : {}),
    },
  });

  const existing = await prisma.application.findFirst({
    where: { jobId: dbJob.id, userId: auth.id },
    orderBy: { createdAt: "desc" },
  });
  const alreadyCharged = existing?.tailorKitCharged ?? false;

  const scoreJob = {
    title: job.title || "the role",
    company: job.company || "the company",
    description: job.description,
  };

  const tailorProfile = {
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
  };

  try {
    if (!alreadyCharged) {
      await assertCanUse(auth.id, auth.email, "tailor");
    }

    const [tailored, edge] = await Promise.all([
      runTailorPipeline(job, tailorProfile),
      researchCompanyEdge({
        job: { ...scoreJob, location: job.location },
        candidate: { summary: profile.summary, skills: profile.skills },
      }).catch(() => null),
    ]);

    const appData = {
      tailoredResume: tailored.tailoredResume,
      coverLetter: tailored.coverLetter,
      matchNotes: tailored.matchNotes,
      beforeMatch: JSON.stringify(tailored.beforeMatch),
      afterMatch: JSON.stringify(tailored.afterMatch),
      companyEdge: edge ? JSON.stringify(normalizeCompanyEdge(edge)) : "",
      status: "tailored",
    };

    const application = existing
      ? await prisma.application.update({
          where: { id: existing.id },
          data: appData,
        })
      : await prisma.application.create({
          data: { jobId: dbJob.id, userId: auth.id, ...appData },
        });

    if (!alreadyCharged) {
      await consumeUsage(auth.id, auth.email, "tailor", {
        applicationId: application.id,
      });
    }

    return NextResponse.json({
      applicationId: application.id,
      job: {
        ...job,
        applyUrl,
        atsPlatform,
      },
      tailoredResume: tailored.tailoredResume,
      coverLetter: tailored.coverLetter,
      matchNotes: tailored.matchNotes,
      beforeMatch: tailored.beforeMatch,
      afterMatch: tailored.afterMatch,
      edge,
    });
  } catch (err) {
    if (err instanceof UsageLimitError) return usageLimitResponse(err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
