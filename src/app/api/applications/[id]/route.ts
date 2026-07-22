import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthUser, isAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  persistRecruiterOutreach,
  hydrateApplicationOutreach,
} from "@/lib/application-persist";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
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
  const hydrated = await hydrateApplicationOutreach(prisma, application);
  return NextResponse.json(hydrated);
}

const patchSchema = z.object({
  status: z
    .enum([
      "draft",
      "tailored",
      "autofilled",
      "needs_review",
      "submitted",
      "failed",
      "rejected",
      "interview",
      "offer",
    ])
    .optional(),
  tailoredResume: z.string().optional(),
  coverLetter: z.string().optional(),
  matchNotes: z.string().optional(),
  linkedInRecruiterNote: z.string().optional(),
  recruiterEmail: z.string().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthUser();
  if (!isAuthUser(auth)) return auth;

  const { id } = await params;
  const existing = await prisma.application.findUnique({ where: { id } });
  if (!existing || existing.userId !== auth.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const {
    linkedInRecruiterNote,
    recruiterEmail,
    ...rest
  } = parsed.data;

  const data = { ...rest } as Record<string, unknown>;
  if (parsed.data.status === "submitted") {
    data.submittedAt = new Date();
  }

  const application = await prisma.application.update({
    where: { id },
    data,
    include: { job: true },
  });

  if (
    linkedInRecruiterNote !== undefined ||
    recruiterEmail !== undefined
  ) {
    await persistRecruiterOutreach(
      prisma,
      id,
      linkedInRecruiterNote ?? "",
      recruiterEmail ?? "",
    );
  }

  const hydrated = await hydrateApplicationOutreach(prisma, application);
  return NextResponse.json(hydrated);
}
