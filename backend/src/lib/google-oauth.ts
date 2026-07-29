import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { config } from "../config.js";

const STATE_TTL_MS = 10 * 60 * 1000;

export function isGoogleAuthConfigured(): boolean {
  return Boolean(config.google.clientId && config.google.clientSecret);
}

function signPayload(body: string): string {
  return createHmac("sha256", config.sessionSecret).update(body).digest("base64url");
}

export function createOAuthState(): string {
  const payload = {
    n: randomBytes(16).toString("hex"),
    exp: Date.now() + STATE_TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${signPayload(body)}`;
}

export function verifyOAuthState(state: string): boolean {
  const [body, sig] = state.split(".");
  if (!body || !sig) return false;
  const expected = signPayload(body);
  try {
    const a = Buffer.from(sig, "base64url");
    const b = Buffer.from(expected, "base64url");
    if (a.length !== b.length) return false;
    if (!timingSafeEqual(a, b)) return false;
  } catch {
    return false;
  }
  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as { exp?: number };
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

export function googleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: config.google.clientId,
    redirect_uri: config.google.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
    access_type: "online",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

export async function exchangeGoogleCode(code: string): Promise<GoogleUserInfo> {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.google.clientId,
      client_secret: config.google.clientSecret,
      redirect_uri: config.google.redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const tokenData = (await tokenRes.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!tokenRes.ok || !tokenData.access_token) {
    throw new Error(
      tokenData.error_description ??
        tokenData.error ??
        "Google token exchange failed.",
    );
  }

  const profileRes = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    },
  );

  const profile = (await profileRes.json()) as GoogleUserInfo & {
    error?: { message?: string };
  };

  if (!profileRes.ok || !profile.id || !profile.email) {
    throw new Error(
      profile.error?.message ?? "Could not load Google profile.",
    );
  }

  if (!profile.verified_email) {
    throw new Error("Google email is not verified.");
  }

  return profile;
}

export function oauthCallbackRedirect(
  params: { token: string; newUser?: boolean } | { error: string },
): string {
  const base = `${config.frontendUrl}/auth/callback`;
  const url = new URL(base);
  if ("error" in params) {
    url.searchParams.set("error", params.error);
  } else {
    url.searchParams.set("token", params.token);
    if (params.newUser) url.searchParams.set("new", "1");
  }
  return url.toString();
}
