/**
 * Resolve an employer domain for logo lookups from company name + job URL.
 * Prefers ATS path slugs (Greenhouse/Lever/Ashby) over the ATS host itself.
 */

/** When board slug ≠ public domain. */
const DOMAIN_ALIASES: Record<string, string> = {
  lifeatspotify: "spotify.com",
  spotify: "spotify.com",
  google: "google.com",
  goog: "google.com",
  meta: "meta.com",
  facebook: "meta.com",
  amazon: "amazon.com",
  aws: "amazon.com",
  microsoft: "microsoft.com",
  apple: "apple.com",
  netflix: "netflix.com",
  uber: "uber.com",
  airbnb: "airbnb.com",
  stripe: "stripe.com",
  figma: "figma.com",
  notion: "notion.so",
  openai: "openai.com",
  anthropic: "anthropic.com",
  datadog: "datadoghq.com",
  cloudflare: "cloudflare.com",
  shopify: "shopify.com",
  square: "squareup.com",
  block: "block.xyz",
  twitter: "x.com",
  x: "x.com",
  linkedin: "linkedin.com",
  salesforce: "salesforce.com",
  oracle: "oracle.com",
  ibm: "ibm.com",
  intel: "intel.com",
  nvidia: "nvidia.com",
  amd: "amd.com",
  adobe: "adobe.com",
  dropbox: "dropbox.com",
  slack: "slack.com",
  zoom: "zoom.us",
  twilio: "twilio.com",
  redis: "redis.com",
  mongodb: "mongodb.com",
  elastic: "elastic.co",
  hashicorp: "hashicorp.com",
  gitlab: "gitlab.com",
  github: "github.com",
  atlassian: "atlassian.com",
  jpmorgan: "jpmorganchase.com",
  goldmansachs: "goldmansachs.com",
  capitalone: "capitalone.com",
  disney: "disney.com",
  warnerbros: "wbd.com",
  paramount: "paramount.com",
  roblox: "roblox.com",
  discord: "discord.com",
  reddit: "reddit.com",
  pinterest: "pinterest.com",
  snap: "snap.com",
  snapchat: "snap.com",
  tiktok: "tiktok.com",
  bytedance: "bytedance.com",
  coinbase: "coinbase.com",
  rivian: "rivian.com",
  tesla: "tesla.com",
  spacex: "spacex.com",
  palantir: "palantir.com",
  anduril: "anduril.com",
  scale: "scale.com",
  scaleai: "scale.com",
  databricks: "databricks.com",
  snowflake: "snowflake.com",
  samba: "samba.tv",
  sambanova: "sambanova.ai",
};

function applyAlias(slugOrHost: string): string {
  const key = slugOrHost
    .toLowerCase()
    .replace(/^www\./, "")
    .replace(/\.(com|io|co|ai|tv|so|us|org|net)$/i, "")
    .replace(/[^a-z0-9]/g, "");
  return DOMAIN_ALIASES[key] ?? slugOrHost;
}

function slugToDomainGuess(slug: string): string {
  const aliased = applyAlias(slug);
  if (aliased.includes(".")) return aliased;
  const s = slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 48);
  return s ? applyAlias(s) || `${s}.com` : "";
}

function companyNameToDomainGuess(company: string): string {
  const cleaned = company
    .trim()
    .toLowerCase()
    .replace(
      /\b(inc|llc|ltd|corp|corporation|company|co|plc|gmbh|ag|sa|nv)\b\.?/gi,
      "",
    )
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 48);
  if (!cleaned) return "";
  return applyAlias(cleaned) || `${cleaned}.com`;
}

function pathSlug(pathname: string, index = 0): string {
  return pathname.split("/").filter(Boolean)[index] ?? "";
}

/** Extract employer-ish domain from a job posting URL when possible. */
export function domainFromJobUrl(url: string): string | null {
  if (!url.trim()) return null;
  try {
    const u = new URL(url.includes("://") ? url : `https://${url}`);
    const host = u.hostname.replace(/^www\./i, "").toLowerCase();
    const slug0 = pathSlug(u.pathname, 0).toLowerCase();

    if (
      host.includes("greenhouse.io") ||
      host === "grnh.se" ||
      host.endsWith(".grnh.se")
    ) {
      if (slug0 && !["embed", "v1", "api", "jobs"].includes(slug0)) {
        return slugToDomainGuess(slug0);
      }
    }

    if (host.includes("lever.co") && slug0) {
      return slugToDomainGuess(slug0);
    }

    if (host.includes("ashbyhq.com") && slug0) {
      return slugToDomainGuess(slug0);
    }

    if (
      !/(linkedin|indeed|glassdoor|ziprecruiter|remoteok|weworkremotely|jsearch)/i.test(
        host,
      )
    ) {
      const parts = host.split(".");
      if (
        parts.length >= 3 &&
        /^(careers|jobs|job|talent|hiring|boards|lifeat)$/i.test(parts[0]!)
      ) {
        return applyAlias(parts.slice(1).join(".")) || parts.slice(1).join(".");
      }
      if (parts.length >= 2) return applyAlias(host) || host;
    }
  } catch {
    return null;
  }
  return null;
}

export function resolveCompanyDomain(
  company: string,
  url?: string | null,
  applyUrl?: string | null,
): string | null {
  const raw =
    domainFromJobUrl(url ?? "") ||
    domainFromJobUrl(applyUrl ?? "") ||
    (company.trim() ? companyNameToDomainGuess(company) : null) ||
    null;
  if (!raw) return null;
  return applyAlias(raw) || raw;
}

function cleanDomain(domain: string): string {
  return domain.replace(/^https?:\/\//i, "").split("/")[0]!.toLowerCase();
}

/**
 * High-res logo candidates (first that loads wins).
 * Clearbit still serves many logos; Google favicons as last resort.
 */
export function companyLogoCandidates(domain: string): string[] {
  const d = cleanDomain(domain);
  return [
    `https://logo.clearbit.com/${encodeURIComponent(d)}?size=128`,
    `https://unavatar.io/${encodeURIComponent(d)}?fallback=false`,
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(d)}&sz=128`,
  ];
}

export function companyInitials(company: string): string {
  const parts = company
    .trim()
    .split(/[\s._-]+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}
