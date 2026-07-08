import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthUser, isAuthUser } from "@/lib/auth";
import { runSearch } from "@/lib/search-service";
import { ALL_SOURCE_IDS, type SourceId } from "@/lib/sources";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Scanning several network sources can take a while.
export const maxDuration = 120;

const schema = z.object({
  query: z.string().optional(),
  location: z.string().optional(),
  remoteOnly: z.boolean().optional(),
  country: z.string().optional(),
  datePosted: z.enum(["all", "today", "3days", "week", "month"]).optional(),
  fullTimeOnly: z.boolean().optional(),
  sponsorshipFriendlyOnly: z.boolean().optional(),
  sources: z.array(z.string()).optional(),
  limit: z.number().int().positive().max(100).optional(),
  minScore: z.number().int().min(0).max(100).optional(),
});

export async function POST(req: Request) {
  const auth = await requireAuthUser();
  if (!isAuthUser(auth)) return auth;

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const requested = parsed.data.sources as SourceId[] | undefined;
  const sources = requested?.filter((s) =>
    ALL_SOURCE_IDS.includes(s),
  ) as SourceId[] | undefined;

  try {
    const result = await runSearch({
      userId: auth.id,
      query: parsed.data.query,
      location: parsed.data.location,
      remoteOnly: parsed.data.remoteOnly,
      country: parsed.data.country,
      datePosted: parsed.data.datePosted,
      fullTimeOnly: parsed.data.fullTimeOnly,
      sponsorshipFriendlyOnly: parsed.data.sponsorshipFriendlyOnly,
      sources: sources && sources.length ? sources : undefined,
      limit: parsed.data.limit,
      minScore: parsed.data.minScore,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
