/** Public Railway API (same project as tailorsend-web). */
export const PRODUCTION_API_URL =
  "https://tailorsend-api-production.up.railway.app";

function trimBase(url: string): string {
  return url.trim().replace(/\/$/, "");
}

function isRailway(): boolean {
  return Boolean(
    process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID,
  );
}

/**
 * Auth API origin. Never use localhost on Railway — that is this container.
 * Override with BACKEND_URL / AUTH_API_URL / API_URL if the API host changes.
 */
export function resolveBackendBase(): string {
  const explicit = trimBase(
    process.env.BACKEND_URL ||
      process.env.AUTH_API_URL ||
      process.env.API_URL ||
      "",
  );
  if (explicit && !/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(explicit)) {
    return explicit;
  }
  if (isRailway() || process.env.NODE_ENV === "production") {
    return PRODUCTION_API_URL;
  }
  return explicit || "http://localhost:4000";
}
