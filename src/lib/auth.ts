import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AUTH_COOKIE } from "@/lib/auth-constants";
import { isAdminUser } from "@/lib/admin-access";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isAdmin: boolean;
}

function sessionSecret(): string {
  return process.env.SESSION_SECRET ?? "dev-session-secret-change-in-production";
}

export function hashToken(token: string): string {
  return createHash("sha256")
    .update(`${token}:${sessionSecret()}`)
    .digest("hex");
}

async function tokenFromRequest(): Promise<string | null> {
  const h = await headers();
  const auth = h.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  const jar = await cookies();
  return jar.get(AUTH_COOKIE)?.value ?? null;
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const token = await tokenFromRequest();
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    }
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
    isAdmin: isAdminUser({
      email: session.user.email,
      role: session.user.role,
    }),
  };
}

export async function requireAuthUser(): Promise<AuthUser | NextResponse> {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  return user;
}

export function isAuthUser(
  value: AuthUser | NextResponse,
): value is AuthUser {
  return !(value instanceof NextResponse);
}
