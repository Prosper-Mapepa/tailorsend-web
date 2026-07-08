import { NextResponse } from "next/server";
import { fetchAdminStats } from "@/lib/admin-stats";
import { isAdminAuthUser, requireAdminUser } from "@/lib/admin";

export async function GET() {
  const admin = await requireAdminUser();
  if (!isAdminAuthUser(admin)) return admin;

  const stats = await fetchAdminStats();
  return NextResponse.json(stats);
}
