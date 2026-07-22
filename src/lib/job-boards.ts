import type { JobBoardSite } from "@/lib/types";

export type ResolvedJobBoards = {
  greenhouse: string[];
  lever: string[];
  /** Company names for JSearch bias (Workday, Ashby, custom careers, plain names). */
  targetCompanies: string[];
};

function uniqueLower(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const v = raw.trim();
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

function parseList(v: string | undefined): string[] {
  return uniqueLower(
    (v ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

/** Normalize user input into a URL or plain company string. */
export function normalizeBoardInput(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

function tryUrl(input: string): URL | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    if (/^https?:\/\//i.test(trimmed)) return new URL(trimmed);
    if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(trimmed) && !/\s/.test(trimmed)) {
      return new URL(`https://${trimmed}`);
    }
  } catch {
    return null;
  }
  return null;
}

function titleCaseSlug(slug: string): string {
  return slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function companyFromHostname(host: string): string {
  const h = host.replace(/^www\./i, "").toLowerCase();
  const parts = h.split(".");
  // careers.microsoft.com → microsoft; jobs.stripe.com → stripe
  if (parts.length >= 3 && /^(careers|jobs|job|talent|hiring)$/i.test(parts[0]!)) {
    return titleCaseSlug(parts[1]!);
  }
  if (parts.length >= 2) return titleCaseSlug(parts[0]!);
  return titleCaseSlug(h);
}

/**
 * Classify a single board entry into Greenhouse/Lever slugs or a JSearch company.
 */
export function classifyBoardInput(input: string): {
  kind: "greenhouse" | "lever" | "company";
  value: string;
  defaultLabel: string;
} | null {
  const normalized = normalizeBoardInput(input);
  if (!normalized) return null;

  const url = tryUrl(normalized);
  if (url) {
    const host = url.hostname.toLowerCase();
    const pathParts = url.pathname.split("/").filter(Boolean);

    if (
      host.includes("greenhouse.io") ||
      host === "grnh.se" ||
      host.endsWith(".grnh.se")
    ) {
      // boards.greenhouse.io/{slug} or job-boards.greenhouse.io/{slug}
      const slug = pathParts[0]?.toLowerCase();
      if (slug && !["embed", "v1", "api"].includes(slug)) {
        return {
          kind: "greenhouse",
          value: slug,
          defaultLabel: titleCaseSlug(slug),
        };
      }
    }

    if (host.includes("lever.co")) {
      // jobs.lever.co/{slug}
      const slug = pathParts[0]?.toLowerCase();
      if (slug) {
        return {
          kind: "lever",
          value: slug,
          defaultLabel: titleCaseSlug(slug),
        };
      }
    }

    if (host.includes("ashbyhq.com")) {
      const slug = pathParts[0];
      if (slug) {
        return {
          kind: "company",
          value: titleCaseSlug(slug),
          defaultLabel: titleCaseSlug(slug),
        };
      }
    }

    return {
      kind: "company",
      value: companyFromHostname(host),
      defaultLabel: companyFromHostname(host),
    };
  }

  // Plain company name or board slug without URL
  if (/^[a-z0-9][a-z0-9_-]{1,60}$/i.test(normalized) && !/\s/.test(normalized)) {
    return {
      kind: "company",
      value: titleCaseSlug(normalized),
      defaultLabel: titleCaseSlug(normalized),
    };
  }

  return {
    kind: "company",
    value: normalized,
    defaultLabel: normalized,
  };
}

export function defaultLabelForInput(input: string): string {
  return classifyBoardInput(input)?.defaultLabel ?? normalizeBoardInput(input);
}

export function resolveJobBoards(
  sites: JobBoardSite[],
): ResolvedJobBoards {
  const greenhouse: string[] = [];
  const lever: string[] = [];
  const targetCompanies: string[] = [];

  for (const site of sites) {
    const classified = classifyBoardInput(site.input);
    if (!classified) continue;
    if (classified.kind === "greenhouse") greenhouse.push(classified.value);
    else if (classified.kind === "lever") lever.push(classified.value);
    else targetCompanies.push(classified.value);
  }

  return {
    greenhouse: uniqueLower(greenhouse),
    lever: uniqueLower(lever),
    targetCompanies: uniqueLower(targetCompanies),
  };
}

/** Merge env defaults with per-user boards (user wins for ordering; both kept). */
export function mergeSearchBoards(opts: {
  envGreenhouse?: string;
  envLever?: string;
  envCompanies?: string;
  userSites?: JobBoardSite[];
}): ResolvedJobBoards {
  const fromUser = resolveJobBoards(opts.userSites ?? []);
  return {
    greenhouse: uniqueLower([
      ...fromUser.greenhouse,
      ...parseList(opts.envGreenhouse),
    ]),
    lever: uniqueLower([...fromUser.lever, ...parseList(opts.envLever)]),
    targetCompanies: uniqueLower([
      ...fromUser.targetCompanies,
      ...parseList(opts.envCompanies),
    ]),
  };
}

export function describeBoardKind(input: string): string {
  const c = classifyBoardInput(input);
  if (!c) return "";
  if (c.kind === "greenhouse") return `Greenhouse · ${c.value}`;
  if (c.kind === "lever") return `Lever · ${c.value}`;
  return `Company search · ${c.value}`;
}
