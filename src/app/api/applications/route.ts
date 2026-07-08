import { NextResponse } from "next/server";
import { requireAuthUser, isAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAuthUser();
  if (!isAuthUser(auth)) return auth;

  const applications = await prisma.application.findMany({
    where: { userId: auth.id },
    orderBy: { updatedAt: "desc" },
    include: { job: true },
  });
  return NextResponse.json({ applications });
}
