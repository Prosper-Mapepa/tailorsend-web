import { NextResponse } from "next/server";

/** Consistent JSON 500 for API route handlers. */
export function apiRouteError(err: unknown, context?: string): NextResponse {
  const raw =
    err instanceof Error ? err.message : "An unexpected error occurred.";
  console.error(context ? `${context}:` : "API error:", err);

  let message = raw;
  if (/DATABASE_URL is not set/i.test(raw)) {
    message =
      "Database is not configured. Set DATABASE_URL on the frontend host.";
  } else if (
    /column .* does not exist|Unknown argument|relation .* does not exist/i.test(
      raw,
    )
  ) {
    message =
      "Database schema is out of date. Run `npx prisma migrate deploy` on production.";
  }

  return NextResponse.json({ error: message }, { status: 500 });
}
