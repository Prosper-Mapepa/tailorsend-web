import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthUser, requireAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthUser();
  if (!isAuthUser(auth)) return auth;

  const { id } = await params;
  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      applications: {
        where: { userId: auth.id },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(job);
}

const patchSchema = z.object({
  status: z.enum(["new", "saved", "hidden"]).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthUser();
  if (!isAuthUser(auth)) return auth;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const job = await prisma.job.update({ where: { id }, data: parsed.data });
  return NextResponse.json(job);
}
