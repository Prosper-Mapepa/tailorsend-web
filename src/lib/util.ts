/** Strip HTML tags and decode the most common entities to plain text. */
export function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|br|tr)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Truncate long text to keep token usage and storage reasonable. */
export function truncate(text: string, max = 8000): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + "\n…[truncated]";
}

/** Best-effort detection of whether a posting is remote from free text. */
export function looksRemote(...fields: string[]): boolean {
  const t = fields.join(" ").toLowerCase();
  return /\b(remote|work from home|wfh|distributed|anywhere)\b/.test(t);
}

// Generic words that appear in countless unrelated postings. We don't let a
// match on these alone qualify a job, otherwise "engineer" pulls in everything.
const GENERIC_TERMS = new Set([
  "engineer",
  "engineering",
  "developer",
  "development",
  "analyst",
  "manager",
  "management",
  "senior",
  "junior",
  "staff",
  "lead",
  "principal",
  "specialist",
  "architect",
  "consultant",
  "associate",
  "intern",
  "internship",
  "full",
  "part",
  "time",
  "software",
  "remote",
  "the",
  "and",
  "for",
  "usa",
]);

/** Split a query into all terms and the meaningful (non-generic) subset. */
export function queryTerms(query: string): {
  all: string[];
  meaningful: string[];
} {
  const all = query
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter((t) => t.length > 1);
  const meaningful = all.filter((t) => t.length > 2 && !GENERIC_TERMS.has(t));
  return { all, meaningful };
}

/**
 * Decide whether a job (represented by `haystack`, usually its title and tags)
 * is relevant to the query. Requires ALL meaningful (non-generic) terms to be
 * present so a role like "Cloud Security Engineer" keeps "security" mandatory
 * and doesn't match a generic "Cloud Engineer". Falls back to any term for
 * purely generic queries like "software engineer".
 */
export function jobMatchesQuery(haystack: string, query: string): boolean {
  const h = haystack.toLowerCase();
  const { all, meaningful } = queryTerms(query);
  if (meaningful.length > 0) {
    return meaningful.every((t) => h.includes(t));
  }
  if (all.length === 0) return true;
  return all.some((t) => h.includes(t));
}

// Phrases that indicate a posting is closed, filled, or no longer accepting
// applications. Used to keep dead listings out of the results.
const CLOSED_PHRASES = [
  "no longer accepting applications",
  "no longer accepting application",
  "we are no longer accepting",
  "this position has been filled",
  "position has been filled",
  "position is filled",
  "role has been filled",
  "this job is closed",
  "this role is closed",
  "applications are closed",
  "application is closed",
  "application deadline has passed",
  "posting has expired",
  "this posting has closed",
  "this position is closed",
  "no longer available",
  "this job is no longer available",
  "position is no longer available",
  "we have filled this",
  "vacancy is closed",
];

/**
 * Detect whether a posting (from its title + description) appears to be closed,
 * filled, or past its application deadline.
 */
export function detectClosed(text: string): boolean {
  const t = (text || "").toLowerCase();
  return CLOSED_PHRASES.some((p) => t.includes(p));
}

/**
 * Replace Markdown links that point at placeholder/fake URLs with just their
 * text (e.g. "[Project](https://link)" -> "Project"). Guards against the model
 * inventing dummy hrefs when no real URL exists.
 */
export function sanitizePlaceholderLinks(md: string): string {
  const placeholder =
    /\[([^\]]+)\]\((?:https?:\/\/link\b[^)]*|https?:\/\/(?:www\.)?example\.[^)]*|#|link|url|your-link[^)]*)\)/gi;
  return md.replace(placeholder, "$1");
}

/** Parse a JSON string field, returning a fallback on error. */
export function safeJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/** Pull URLs embedded in markdown or plain text. */
export function extractUrlsFromText(text: string): string[] {
  if (!text) return [];
  const urls: string[] = [];
  const markdown = /\[[^\]]*\]\((https?:\/\/[^)]+)\)/gi;
  let match: RegExpExecArray | null;
  while ((match = markdown.exec(text))) urls.push(match[1]);
  const plain = /https?:\/\/[^\s)\]]+/gi;
  while ((match = plain.exec(text))) {
    urls.push(match[0].replace(/[.,;]+$/g, ""));
  }
  // PDF extractors often drop the scheme: linkedin.com/in/foo, github.com/bar
  const bareHost =
    /(?:^|[\s(|])((?:www\.)?(?:linkedin\.com\/in\/|github\.com\/)[A-Za-z0-9._%/-]+)/gi;
  while ((match = bareHost.exec(text))) {
    urls.push(match[1].replace(/[.,;]+$/g, ""));
  }
  return urls;
}

/** Remove inline markdown links and parenthetical citations from prose. */
export function stripInlineCitations(text: string): string {
  if (!text) return "";
  return text
    .replace(/\s*\(\[[^\]]*\]\([^)]+\)\)/g, "")
    .replace(/\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\s*\(https?:\/\/[^)]+\)/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
}

/** Short label for a source URL (hostname without www). */
export function sourceHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return url;
  }
}
