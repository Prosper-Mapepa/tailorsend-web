import { NextResponse } from "next/server";
import { extractJobPosting, researchCompanyEdge } from "@/lib/ai";
import { fetchJobText } from "@/lib/fetch-job";
import { runTailorPipeline } from "@/lib/tailor-pipeline";
import { requireAuthUser, isAuthUser } from "@/lib/auth";
import {
  assertCanUse,
  consumeUsage,
  UsageLimitError,
  usageLimitResponse,
} from "@/lib/billing/usage";
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
    return { title, company, location, description: sourceText };
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
    await assertCanUse(auth.id, auth.email, "tailor");

    const [tailored, edge] = await Promise.all([
      runTailorPipeline(job, tailorProfile),
      researchCompanyEdge({
        job: { ...scoreJob, location: job.location },
        candidate: { summary: profile.summary, skills: profile.skills },
      }).catch(() => null),
    ]);

    await consumeUsage(auth.id, auth.email, "tailor");

    return NextResponse.json({
      job,
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
