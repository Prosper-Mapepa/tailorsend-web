import type { NormalizedJob, SearchParams, SourceResult } from "@/lib/types";
import { detectClosed, truncate } from "@/lib/util";

// JSearch (RapidAPI) aggregates postings from Google for Jobs, which pulls
// from LinkedIn, Indeed, Glassdoor, ZipRecruiter, etc.
//
// Requires a RapidAPI key in RAPIDAPI_KEY subscribed to JSearch (free tier OK).
//   https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
//
// Note: as of 2026 the search endpoint is /search-v2 (the legacy /search path
// returns 404).

interface JSearchJob {
  job_id: string;
  job_title: string;
  employer_name: string;
  job_city?: string;
  job_state?: string;
  job_country?: string;
  job_apply_link: string;
  job_description: string;
  job_posted_at_datetime_utc?: string;
  job_offer_expiration_datetime_utc?: string;
  job_is_remote?: boolean;
  job_min_salary?: number;
  job_max_salary?: number;
  job_salary_string?: string;
  job_publisher?: string;
}

interface JSearchResponse {
  status?: string;
  data?: { jobs?: JSearchJob[] } | JSearchJob[];
  message?: string;
}

function extractJobs(data: JSearchResponse["data"]): JSearchJob[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return data.jobs ?? [];
}

function dateParam(params: SearchParams): string {
  const d = params.datePosted ?? "month";
  if (d === "today" || d === "3days" || d === "week" || d === "month") return d;
  return "all";
}

/** Run a single JSearch query and normalize the results. */
async function fetchQuery(
  key: string,
  query: string,
  params: SearchParams,
): Promise<NormalizedJob[]> {
  const url = new URL("https://jsearch.p.rapidapi.com/search-v2");
  url.searchParams.set("query", query);
  url.searchParams.set("page", "1");
  url.searchParams.set("num_pages", "1");
  url.searchParams.set("country", params.country ?? "us");
  url.searchParams.set("sort_by", "date");
  url.searchParams.set("date_posted", dateParam(params));
  if (params.fullTimeOnly) url.searchParams.set("employment_types", "FULLTIME");
  if (params.remoteOnly) url.searchParams.set("remote_jobs_only", "true");

  const res = await fetch(url.toString(), {
    headers: {
      "X-RapidAPI-Key": key,
      "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
    },
    next: { revalidate: 0 },
  });
  const body = (await res.json()) as JSearchResponse;
  if (!res.ok) throw new Error(body.message ?? `HTTP ${res.status}`);

  const now = Date.now();
  const jobs: NormalizedJob[] = [];
  for (const j of extractJobs(body.data)) {
    // Skip postings already past their application/offer expiration.
    if (j.job_offer_expiration_datetime_utc) {
      const exp = new Date(j.job_offer_expiration_datetime_utc).getTime();
      if (!Number.isNaN(exp) && exp < now) continue;
    }
    // Skip postings whose text says they're closed/filled.
    if (detectClosed(`${j.job_title} ${j.job_description}`)) continue;

    const location =
      [j.job_city, j.job_state, j.job_country].filter(Boolean).join(", ") ||
      (j.job_is_remote ? "Remote" : "");
    const salary =
      j.job_salary_string ||
      (j.job_min_salary && j.job_max_salary
        ? `$${j.job_min_salary.toLocaleString()} - $${j.job_max_salary.toLocaleString()}`
        : "");
    jobs.push({
      source: "jsearch",
      externalId: j.job_id,
      title: j.job_title,
      company: j.employer_name,
      location,
      remote: Boolean(j.job_is_remote),
      url: j.job_apply_link,
      applyUrl: j.job_apply_link,
      description: truncate(j.job_description ?? ""),
      salary,
      postedAt: j.job_posted_at_datetime_utc
        ? new Date(j.job_posted_at_datetime_utc)
        : null,
      atsPlatform: "external",
    });
  }
  return jobs;
}

export async function search(params: SearchParams): Promise<SourceResult> {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) {
    return { source: "jsearch", jobs: [] };
  }

  try {
    const baseQuery =
      [params.query, params.location].filter(Boolean).join(" in ") ||
      "software engineer";

    // Build the set of queries: the base role query plus one targeted query per
    // requested company (capped to keep within free-tier request quotas).
    const queries = [baseQuery];
    for (const company of (params.targetCompanies ?? []).slice(0, 8)) {
      queries.push(`${params.query || "software engineer"} ${company}`);
    }

    const dedup = new Map<string, NormalizedJob>();
    const errors: string[] = [];
    for (const q of queries) {
      try {
        const jobs = await fetchQuery(key, q, params);
        for (const job of jobs) {
          if (!dedup.has(job.externalId)) dedup.set(job.externalId, job);
        }
      } catch (err) {
        errors.push((err as Error).message);
      }
    }

    if (dedup.size === 0 && errors.length) throw new Error(errors[0]);

    const all = [...dedup.values()];
    const limited = params.limit ? all.slice(0, params.limit) : all;
    return {
      source: "jsearch",
      jobs: limited,
      error: errors.length ? errors.join("; ") : undefined,
    };
  } catch (err) {
    return { source: "jsearch", jobs: [], error: (err as Error).message };
  }
}
