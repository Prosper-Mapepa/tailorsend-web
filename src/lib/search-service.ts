import { prisma } from "@/lib/db";
import { mergeSearchBoards } from "@/lib/job-boards";
import { scoreJob } from "@/lib/match";
import { ALL_SOURCE_IDS, searchAllSources, type SourceId } from "@/lib/sources";
import type {
  DatePosted,
  JobBoardSite,
  NormalizedJob,
  SearchParams,
  TargetRole,
} from "@/lib/types";
import { detectClosed, safeJson } from "@/lib/util";
import { detectVisaRisk } from "@/lib/visa";

export interface RunSearchOptions {
  /** Override the role/query to search; defaults to the profile's target roles. */
  query?: string;
  location?: string;
  remoteOnly?: boolean;
  /** 2-letter country code; defaults to "us". */
  country?: string;
  /** Recency window; defaults to "month". */
  datePosted?: DatePosted;
  /** Restrict to full-time roles where supported. */
  fullTimeOnly?: boolean;
  /** Drop jobs that require citizenship/clearance or refuse sponsorship. */
  sponsorshipFriendlyOnly?: boolean;
  sources?: SourceId[];
  /** Per-source result cap. */
  limit?: number;
  /** Minimum match score required to persist a job. */
  minScore?: number;
}

/** Convert a recency window into a cutoff Date (or null for "all"). */
function recencyCutoff(window: DatePosted): Date | null {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  switch (window) {
    case "today":
      return new Date(now - day);
    case "3days":
      return new Date(now - 3 * day);
    case "week":
      return new Date(now - 7 * day);
    case "month":
      return new Date(now - 31 * day);
    default:
      return null;
  }
}

export interface RunSearchResult {
  found: number;
  inserted: number;
  updated: number;
  skippedStale: number;
  skippedVisa: number;
  skippedClosed: number;
  perSource: { source: string; count: number; error?: string }[];
}

/** Read the profile and run a full multi-source search, persisting results. */
export async function runSearch(
  opts: RunSearchOptions & { userId?: string } = {},
): Promise<RunSearchResult> {
  const profile = opts.userId
    ? await prisma.profile.findUnique({ where: { userId: opts.userId } })
    : null;
  const targetRoles = safeJson<TargetRole[]>(profile?.targetRoles, []);
  const skills = safeJson<string[]>(profile?.skills, []);
  const userSites = safeJson<JobBoardSite[]>(profile?.jobBoards, []);

  // F1 students will need sponsorship; default to filtering blocked jobs when
  // the profile flags it, unless the caller overrides.
  const sponsorshipFriendlyOnly =
    opts.sponsorshipFriendlyOnly ?? Boolean(profile?.needsSponsorship);

  const country = opts.country ?? "us";
  const datePosted: DatePosted = opts.datePosted ?? "month";
  const fullTimeOnly = opts.fullTimeOnly ?? false;
  const cutoff = recencyCutoff(datePosted);
  // Default location targets the US unless the user searches remote-only.
  const defaultLocation = opts.remoteOnly ? undefined : "United States";

  // Build the list of queries to run. Either the explicit override, or one
  // query per configured target role.
  const queries: SearchParams[] = [];

  // Per-user career sites (Profile → Job boards) merged with optional env defaults.
  const resolved = mergeSearchBoards({
    envGreenhouse: process.env.GREENHOUSE_BOARDS,
    envLever: process.env.LEVER_BOARDS,
    envCompanies: process.env.TARGET_COMPANIES,
    userSites,
  });
  const boards = {
    greenhouse: resolved.greenhouse,
    lever: resolved.lever,
  };
  const targetCompanies = resolved.targetCompanies;

  if (opts.query) {
    queries.push({
      query: opts.query,
      location: opts.location ?? defaultLocation,
      remoteOnly: opts.remoteOnly,
      country,
      datePosted,
      fullTimeOnly,
      targetCompanies,
      boards,
      limit: opts.limit ?? 50,
    });
  } else if (targetRoles.length) {
    targetRoles.forEach((role, i) => {
      queries.push({
        query: role.title,
        location: role.locations[0] ?? defaultLocation,
        remoteOnly: opts.remoteOnly ?? role.remote,
        country,
        datePosted,
        fullTimeOnly,
        // Attach company-targeted JSearch queries to the first role only to
        // stay within free-tier request quotas.
        targetCompanies: i === 0 ? targetCompanies : [],
        boards,
        limit: opts.limit ?? 50,
      });
    });
  } else {
    // Nothing configured; do a generic pass so the UI isn't empty.
    queries.push({
      query: "software engineer",
      location: defaultLocation,
      remoteOnly: opts.remoteOnly,
      country,
      datePosted,
      fullTimeOnly,
      boards,
      limit: opts.limit ?? 30,
    });
  }

  const sources = opts.sources ?? ALL_SOURCE_IDS;
  const minScore = opts.minScore ?? 0;

  // Collect + dedupe across all queries by (source, externalId).
  const dedup = new Map<string, NormalizedJob>();
  const perSourceCount = new Map<string, number>();
  const perSourceError = new Map<string, string>();

  for (const params of queries) {
    const results = await searchAllSources(params, sources);
    for (const r of results) {
      if (r.error) perSourceError.set(r.source, r.error);
      for (const job of r.jobs) {
        const key = `${job.source}:${job.externalId}`;
        if (!dedup.has(key)) {
          dedup.set(key, job);
          perSourceCount.set(
            job.source,
            (perSourceCount.get(job.source) ?? 0) + 1,
          );
        }
      }
    }
  }

  let inserted = 0;
  let updated = 0;
  let skippedStale = 0;
  let skippedVisa = 0;
  let skippedClosed = 0;

  for (const job of dedup.values()) {
    // Recency filter: drop postings older than the window when we know the date.
    if (cutoff && job.postedAt && job.postedAt.getTime() < cutoff.getTime()) {
      skippedStale++;
      continue;
    }

    // Skip postings that are closed, filled, or past their deadline.
    if (detectClosed(`${job.title} ${job.description}`)) {
      skippedClosed++;
      continue;
    }

    const matchScore = scoreJob(job, { targetRoles, skills });
    if (matchScore < minScore) continue;

    const visaRisk = detectVisaRisk(`${job.title} ${job.description}`);
    if (sponsorshipFriendlyOnly && visaRisk !== "none") {
      skippedVisa++;
      continue;
    }

    const existing = await prisma.job.findUnique({
      where: {
        source_externalId: { source: job.source, externalId: job.externalId },
      },
      select: { id: true },
    });

    await prisma.job.upsert({
      where: {
        source_externalId: { source: job.source, externalId: job.externalId },
      },
      create: {
        source: job.source,
        externalId: job.externalId,
        title: job.title,
        company: job.company,
        location: job.location,
        remote: job.remote,
        url: job.url,
        applyUrl: job.applyUrl,
        description: job.description,
        salary: job.salary,
        postedAt: job.postedAt,
        atsPlatform: job.atsPlatform,
        matchScore,
        visaRisk,
      },
      update: {
        // Refresh mutable fields and re-score.
        title: job.title,
        location: job.location,
        remote: job.remote,
        description: job.description,
        salary: job.salary,
        applyUrl: job.applyUrl,
        matchScore,
        visaRisk,
      },
    });
    if (existing) updated++;
    else inserted++;
  }

  return {
    found: dedup.size,
    inserted,
    updated,
    skippedStale,
    skippedVisa,
    skippedClosed,
    perSource: sources.map((s) => ({
      source: s,
      count: perSourceCount.get(s) ?? 0,
      error: perSourceError.get(s),
    })),
  };
}
