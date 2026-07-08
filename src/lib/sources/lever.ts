import type { NormalizedJob, SearchParams, SourceResult } from "@/lib/types";
import { jobMatchesQuery, looksRemote, truncate } from "@/lib/util";

// Lever exposes a public postings API per company:
//   https://api.lever.co/v0/postings/{company}?mode=json
// `company` is the slug, e.g. "netflix", "spotify".

interface LeverJob {
  id: string;
  text: string; // title
  hostedUrl: string;
  applyUrl: string;
  createdAt?: number;
  categories?: { location?: string; team?: string; commitment?: string };
  descriptionPlain?: string;
  description?: string;
}

async function fetchPostings(company: string): Promise<LeverJob[]> {
  const res = await fetch(
    `https://api.lever.co/v0/postings/${encodeURIComponent(
      company,
    )}?mode=json`,
    { headers: { Accept: "application/json" }, next: { revalidate: 0 } },
  );
  if (!res.ok) throw new Error(`lever ${company}: HTTP ${res.status}`);
  return (await res.json()) as LeverJob[];
}

export async function search(params: SearchParams): Promise<SourceResult> {
  const companies = params.boards?.lever ?? [];
  if (companies.length === 0) {
    return { source: "lever", jobs: [] };
  }

  const jobs: NormalizedJob[] = [];
  const errors: string[] = [];

  await Promise.all(
    companies.map(async (company) => {
      try {
        const postings = await fetchPostings(company);
        for (const j of postings) {
          const title = j.text ?? "";
          if (!jobMatchesQuery(title, params.query)) continue;

          const location = j.categories?.location ?? "";
          const description = j.descriptionPlain ?? "";
          const remote = looksRemote(title, location, description);
          if (params.remoteOnly && !remote) continue;

          jobs.push({
            source: "lever",
            externalId: `${company}:${j.id}`,
            title,
            company,
            location,
            remote,
            url: j.hostedUrl,
            applyUrl: j.applyUrl || j.hostedUrl,
            description: truncate(description),
            salary: "",
            postedAt: j.createdAt ? new Date(j.createdAt) : null,
            atsPlatform: "lever",
          });
        }
      } catch (err) {
        errors.push((err as Error).message);
      }
    }),
  );

  const limited = params.limit ? jobs.slice(0, params.limit) : jobs;
  return {
    source: "lever",
    jobs: limited,
    error: errors.length ? errors.join("; ") : undefined,
  };
}
