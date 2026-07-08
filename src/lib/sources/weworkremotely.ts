import type { NormalizedJob, SearchParams, SourceResult } from "@/lib/types";
import { jobMatchesQuery, stripHtml, truncate } from "@/lib/util";

// We Work Remotely publishes per-category RSS feeds, e.g.:
//   https://weworkremotely.com/categories/remote-programming-jobs.rss
// We scan a few broad categories and filter client-side by query.

const FEEDS = [
  "https://weworkremotely.com/categories/remote-programming-jobs.rss",
  "https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss",
  "https://weworkremotely.com/categories/remote-design-jobs.rss",
  "https://weworkremotely.com/categories/remote-product-jobs.rss",
  "https://weworkremotely.com/categories/remote-sales-and-marketing-jobs.rss",
  "https://weworkremotely.com/categories/remote-management-and-finance-jobs.rss",
  "https://weworkremotely.com/categories/all-other-remote-jobs.rss",
];

interface RssItem {
  title: string;
  link: string;
  description: string;
  guid: string;
  region?: string;
  company?: string;
  pubDate?: string;
}

function parseItems(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const blocks = xml.split(/<item>/i).slice(1);
  for (const block of blocks) {
    const get = (tag: string): string => {
      const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
      const m = block.match(re);
      if (!m) return "";
      return m[1]
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
        .trim();
    };
    const title = get("title");
    const link = get("link");
    if (!title || !link) continue;
    items.push({
      title,
      link,
      description: get("description"),
      guid: get("guid") || link,
      region: get("region"),
      company: get("company"),
      pubDate: get("pubDate"),
    });
  }
  return items;
}

export async function search(params: SearchParams): Promise<SourceResult> {
  const jobs: NormalizedJob[] = [];
  const errors: string[] = [];

  await Promise.all(
    FEEDS.map(async (feed) => {
      try {
        const res = await fetch(feed, {
          headers: { "User-Agent": "job-apply-bot/1.0" },
          next: { revalidate: 0 },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const xml = await res.text();
        for (const item of parseItems(xml)) {
          // WWR titles are usually "Company: Job Title".
          const [maybeCompany, ...rest] = item.title.split(":");
          const company =
            item.company || (rest.length ? maybeCompany.trim() : "");
          const title = rest.length ? rest.join(":").trim() : item.title;

          // Match against the title only; descriptions are too noisy and would
          // match unrelated roles that merely mention "security" in passing.
          if (!jobMatchesQuery(item.title, params.query)) continue;

          jobs.push({
            source: "weworkremotely",
            externalId: item.guid,
            title,
            company,
            location: item.region || "Remote",
            remote: true,
            url: item.link,
            applyUrl: item.link,
            description: truncate(stripHtml(item.description)),
            salary: "",
            postedAt: item.pubDate ? new Date(item.pubDate) : null,
            atsPlatform: "external",
          });
        }
      } catch (err) {
        errors.push(`${feed}: ${(err as Error).message}`);
      }
    }),
  );

  const limited = params.limit ? jobs.slice(0, params.limit) : jobs;
  return {
    source: "weworkremotely",
    jobs: limited,
    error: errors.length ? errors.join("; ") : undefined,
  };
}
