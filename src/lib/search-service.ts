import { prisma } from "@/lib/db";
import { upsertCompanyFromJob } from "@/lib/company";
import { mergeSearchBoards } from "@/lib/job-boards";
import { scoreJobDetailed } from "@/lib/match";
import { ALL_SOURCE_IDS, searchAllSources, type SourceId } from "@/lib/sources";
import type {
  DatePosted,
  JobBoardSite,
  NormalizedJob,
  SearchParams,
  TargetRole,
  WorkExperience,
} from "@/lib/types";
import { detectClosed, safeJson } from "@/lib/util";
import type { JobVisaAnalysis } from "@/lib/visa-analyze";
import { analyzeJobVisaFull } from "@/lib/visa-pipeline";

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
  /** Run LLM visa analysis (default true when API key present). */
  useLlmVisa?: boolean;
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
  if (
    opts.userId &&
    !targetRoles.some((r) => r.title?.trim())
  ) {
    throw new Error(
      "Add at least one target role on your profile before scanning.",
    );
  }
  const skills = safeJson<string[]>(profile?.skills, []);
  const workExperience = safeJson<WorkExperience[]>(
    profile?.workExperience,
    [],
  );
  const userSites = safeJson<JobBoardSite[]>(profile?.jobBoards, []);
  const needsSponsorship = Boolean(profile?.needsSponsorship);

  const sponsorshipFriendlyOnly =
    opts.sponsorshipFriendlyOnly ?? needsSponsorship;

  const country = opts.country ?? "us";
  const datePosted: DatePosted = opts.datePosted ?? "month";
  const fullTimeOnly = opts.fullTimeOnly ?? false;
  const cutoff = recencyCutoff(datePosted);
  const defaultLocation = opts.remoteOnly ? undefined : "United States";
  const useLlm =
    opts.useLlmVisa ?? Boolean(process.env.OPENAI_API_KEY?.trim());

  const queries: SearchParams[] = [];

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
        targetCompanies: i === 0 ? targetCompanies : [],
        boards,
        limit: opts.limit ?? 50,
      });
    });
  } else {
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
    if (cutoff && job.postedAt && job.postedAt.getTime() < cutoff.getTime()) {
      skippedStale++;
      continue;
    }

    if (detectClosed(`${job.title} ${job.description}`)) {
      skippedClosed++;
      continue;
    }

    const existing = await prisma.job.findUnique({
      where: {
        source_externalId: { source: job.source, externalId: job.externalId },
      },
      select: {
        id: true,
        visaAnalysis: true,
        companyId: true,
      },
    });

    const previous = existing
      ? safeJson<JobVisaAnalysis | null>(existing.visaAnalysis, null)
      : null;

    const visa = await analyzeJobVisaFull({
      title: job.title,
      description: job.description,
      remote: job.remote,
      previous,
      useLlm,
    });

    if (sponsorshipFriendlyOnly && visa.visaRisk !== "none") {
      skippedVisa++;
      continue;
    }

    const company = await upsertCompanyFromJob({
      companyName: job.company,
      jobUrl: job.url || job.applyUrl,
      analysis: visa.analysis,
    });

    // Re-score with company signals for a richer visa score.
    const visaWithCompany = await analyzeJobVisaFull({
      title: job.title,
      description: job.description,
      remote: job.remote,
      previous: visa.analysis,
      useLlm: false,
      company: company.signals,
    });

    const breakdown = scoreJobDetailed(
      { ...job, visaScore: visaWithCompany.visaScore },
      { targetRoles, skills, workExperience, needsSponsorship },
      visaWithCompany.analysis,
    );

    if (breakdown.overall < minScore) continue;

    await prisma.job.upsert({
      where: {
        source_externalId: { source: job.source, externalId: job.externalId },
      },
      create: {
        source: job.source,
        externalId: job.externalId,
        title: job.title,
        company: job.company,
        companyId: company.id,
        location: job.location,
        remote: job.remote || visaWithCompany.analysis.remote,
        url: job.url,
        applyUrl: job.applyUrl,
        description: job.description,
        salary: job.salary,
        postedAt: job.postedAt,
        atsPlatform: job.atsPlatform,
        matchScore: breakdown.overall,
        matchBreakdown: JSON.stringify(breakdown),
        visaRisk: visaWithCompany.visaRisk,
        visaAnalysis: JSON.stringify({
          ...visaWithCompany.analysis,
          reasons: visaWithCompany.reasons,
        }),
        visaScore: visaWithCompany.visaScore,
      },
      update: {
        title: job.title,
        company: job.company,
        companyId: company.id,
        location: job.location,
        remote: job.remote || visaWithCompany.analysis.remote,
        description: job.description,
        salary: job.salary,
        applyUrl: job.applyUrl,
        matchScore: breakdown.overall,
        matchBreakdown: JSON.stringify(breakdown),
        visaRisk: visaWithCompany.visaRisk,
        visaAnalysis: JSON.stringify({
          ...visaWithCompany.analysis,
          reasons: visaWithCompany.reasons,
        }),
        visaScore: visaWithCompany.visaScore,
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
