import type { NextFunction, Request, Response } from "express";
import { prisma } from "../db.js";
import { extractBearer, hashToken } from "../lib/tokens.js";

import { isAdminUser } from "../lib/admin-access.js";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isAdmin: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      sessionId?: string;
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractBearer(req.headers.authorization);
  if (!token) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  const tokenHash = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    }
    res.status(401).json({ error: "Session expired. Please sign in again." });
    return;
  }

  req.user = {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
    isAdmin: isAdminUser({
      email: session.user.email,
      role: session.user.role,
    }),
  };
  req.sessionId = session.id;
  next();
}

export async function createSession(userId: string): Promise<string> {
  const { generateToken, hashToken, sessionExpiry } = await import(
    "../lib/tokens.js"
  );
  const token = generateToken();
  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: sessionExpiry(),
    },
  });
  return token;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
}

export async function getUserFromToken(
  token: string,
): Promise<AuthUser | null> {
  const tokenHash = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
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
