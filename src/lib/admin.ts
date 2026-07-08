import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/admin-access";
import { getAuthUser, type AuthUser } from "@/lib/auth";

export { adminEmails, isAdminUser } from "@/lib/admin-access";

export async function getAdminUser(): Promise<AuthUser | null> {
  const user = await getAuthUser();
  if (!user || !isAdminUser(user)) return null;
  return user;
}

export async function requireAdminUser(): Promise<AuthUser | NextResponse> {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (!isAdminUser(user)) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  return user;
}

export function isAdminAuthUser(
  value: AuthUser | NextResponse,
): value is AuthUser {
  return !(value instanceof NextResponse);
}
