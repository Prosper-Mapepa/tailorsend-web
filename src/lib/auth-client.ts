import { AUTH_TOKEN_KEY } from "@/lib/auth-constants";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isAdmin: boolean;
}

function apiBase(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  return configured ?? "";
}

function authUrl(path: string): string {
  const base = apiBase();
  return base ? `${base}${path}` : path;
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    document.cookie = `${AUTH_TOKEN_KEY}=${token}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    document.cookie = `${AUTH_TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`;
  }
}

export async function authFetch(
  input: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = getStoredToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(input, { ...init, headers });
}

export async function registerUser(input: {
  email: string;
  password: string;
  name?: string;
}): Promise<{ token: string; user: AuthUser }> {
  const res = await fetch(authUrl("/api/auth/register"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Registration failed.");
  return data;
}

export async function loginUser(input: {
  email: string;
  password: string;
}): Promise<{ token: string; user: AuthUser }> {
  const res = await fetch(authUrl("/api/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Sign in failed.");
  return data;
}

export async function logoutUser(): Promise<void> {
  const token = getStoredToken();
  if (token) {
    await fetch(authUrl("/api/auth/logout"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }
  setStoredToken(null);
}

export async function fetchMe(): Promise<AuthUser | null> {
  const token = getStoredToken();
  if (!token) return null;
  const res = await fetch(authUrl("/api/auth/me"), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    setStoredToken(null);
    return null;
  }
  const data = await res.json();
  return data.user ?? null;
}

export async function requestPasswordReset(
  email: string,
): Promise<{ message: string; devResetLink?: string }> {
  const res = await fetch(authUrl("/api/auth/forgot-password"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed.");
  return data;
}

export async function resetPassword(input: {
  token: string;
  password: string;
}): Promise<{ token: string; user: AuthUser; message: string }> {
  const res = await fetch(authUrl("/api/auth/reset-password"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Reset failed.");
  return data;
}

/** Authenticated fetch for Next.js API routes (same origin). */
export function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  return authFetch(input, init);
}
