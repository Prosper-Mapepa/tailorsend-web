import type { NormalizedJob, SearchParams, SourceResult } from "@/lib/types";
import { jobMatchesQuery, stripHtml, truncate } from "@/lib/util";

// RemoteOK publishes a public JSON feed of all current remote jobs:
//   https://remoteok.com/api
// The first array element is a legal/metadata notice and must be skipped.

interface RoJob {
  id?: string | number;
  slug?: string;
  position?: string;
  company?: string;
  location?: string;
  url?: string;
  apply_url?: string;
  description?: string;
  tags?: string[];
  date?: string;
  salary_min?: number;
  salary_max?: number;
  legal?: string;
}

export async function search(params: SearchParams): Promise<SourceResult> {
  try {
    const res = await fetch("https://remoteok.com/api", {
      headers: { Accept: "application/json", "User-Agent": "job-apply-bot/1.0" },
      next: { revalidate: 0 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as RoJob[];

    const jobs: NormalizedJob[] = [];
    for (const j of data) {
      if (j.legal || !j.position) continue; // skip metadata row
      const title = j.position ?? "";
      // Match on the title only; tags are noisy (many unrelated jobs carry a
      // "security" tag) and would let irrelevant roles through.
      if (!jobMatchesQuery(title, params.query)) continue;

      const salary =
        j.salary_min && j.salary_max
          ? `$${j.salary_min.toLocaleString()} - $${j.salary_max.toLocaleString()}`
          : "";

      jobs.push({
        source: "remoteok",
        externalId: String(j.id ?? j.slug ?? title),
        title,
        company: j.company ?? "",
        location: j.location || "Remote",
        remote: true,
        url: j.url ?? `https://remoteok.com/remote-jobs/${j.slug ?? ""}`,
        applyUrl: j.apply_url ?? j.url ?? "",
        description: truncate(stripHtml(j.description ?? "")),
        salary,
        postedAt: j.date ? new Date(j.date) : null,
        atsPlatform: "remoteok",
      });
    }

    const limited = params.limit ? jobs.slice(0, params.limit) : jobs;
    return { source: "remoteok", jobs: limited };
  } catch (err) {
    return { source: "remoteok", jobs: [], error: (err as Error).message };
  }
}
