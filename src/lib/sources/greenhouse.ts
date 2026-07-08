import type { NormalizedJob, SearchParams, SourceResult } from "@/lib/types";
import { jobMatchesQuery, looksRemote, stripHtml, truncate } from "@/lib/util";

// Greenhouse exposes a free public job board API per company:
//   https://boards-api.greenhouse.io/v1/boards/{board}/jobs?content=true
// `board` is the company slug, e.g. "stripe", "airbnb", "figma".

interface GhJob {
  id: number;
  title: string;
  absolute_url: string;
  updated_at: string;
  location?: { name?: string };
  content?: string; // HTML-encoded
}

async function fetchBoard(board: string): Promise<GhJob[]> {
  const res = await fetch(
    `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(
      board,
    )}/jobs?content=true`,
    { headers: { Accept: "application/json" }, next: { revalidate: 0 } },
  );
  if (!res.ok) throw new Error(`greenhouse ${board}: HTTP ${res.status}`);
  const data = (await res.json()) as { jobs?: GhJob[] };
  return data.jobs ?? [];
}

export async function search(params: SearchParams): Promise<SourceResult> {
  const boards = params.boards?.greenhouse ?? [];
  if (boards.length === 0) {
    return { source: "greenhouse", jobs: [] };
  }

  const jobs: NormalizedJob[] = [];
  const errors: string[] = [];

  await Promise.all(
    boards.map(async (board) => {
      try {
        const ghJobs = await fetchBoard(board);
        for (const j of ghJobs) {
          const title = j.title ?? "";
          if (!jobMatchesQuery(title, params.query)) continue;

          const description = stripHtml(j.content ?? "");
          const location = j.location?.name ?? "";
          const remote = looksRemote(title, location, description);
          if (params.remoteOnly && !remote) continue;

          jobs.push({
            source: "greenhouse",
            externalId: `${board}:${j.id}`,
            title,
            company: board,
            location,
            remote,
            url: j.absolute_url,
            applyUrl: j.absolute_url,
            description: truncate(description),
            salary: "",
            postedAt: j.updated_at ? new Date(j.updated_at) : null,
            atsPlatform: "greenhouse",
          });
        }
      } catch (err) {
        errors.push((err as Error).message);
      }
    }),
  );

  const limited = params.limit ? jobs.slice(0, params.limit) : jobs;
  return {
    source: "greenhouse",
    jobs: limited,
    error: errors.length ? errors.join("; ") : undefined,
  };
}
