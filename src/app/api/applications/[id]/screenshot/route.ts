import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import { requireAuthUser, isAuthUser } from "@/lib/auth";
import { captureApplyPageScreenshot } from "@/lib/apply/capture-page";
import { prisma } from "@/lib/db";
import { PLAYWRIGHT_DISABLED_MESSAGE } from "@/lib/playwright-env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

// Serve the review screenshot captured by the autofiller or page capture.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const application = await prisma.application.findUnique({ where: { id } });
  if (!application?.reviewScreenshot) {
    return NextResponse.json({ error: "No screenshot" }, { status: 404 });
  }
  try {
    const buf = await fs.readFile(application.reviewScreenshot);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "File missing" }, { status: 404 });
  }
}

/** Capture a headless screenshot of the job apply page (manual-apply preview). */
export async function POST(
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

  const applyUrl = application.job.applyUrl || application.job.url;
  if (!applyUrl) {
    return NextResponse.json(
      { error: "This job has no application URL." },
      { status: 400 },
    );
  }

  try {
    const { screenshotPath, log } = await captureApplyPageScreenshot({
      applicationId: id,
      applyUrl,
    });

    await prisma.application.update({
      where: { id },
      data: { reviewScreenshot: screenshotPath },
    });

    return NextResponse.json({ ok: true, log });
  } catch (err) {
    const message = (err as Error).message;
    const status =
      message === PLAYWRIGHT_DISABLED_MESSAGE ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
