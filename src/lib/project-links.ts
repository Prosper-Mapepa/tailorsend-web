import type { Project } from "@/lib/types";

/** Aliases used to match project names in resume lines. */
const PROJECT_ALIASES: Record<string, string[]> = {
  "Attend-IQ": ["attend iq", "attend-iq", "attendiq"],
  "TalentHub / VeriTalent": [
    "talenthub",
    "veritalent",
    "cmu talenthub",
    "veritalent app",
  ],
  "Multi-Currency Remittance System / xGatePay": [
    "xgatepay",
    "xgate pay",
    "multi-currency remittance",
  ],
  Corners: ["corners web", "acorners"],
  Alatoul: ["alatoul web"],
  "Medical Reporting & Shift Scheduling / ELMS": ["elms", "medical reporting"],
  "Mapepa Innovation LLC": ["mapepa innovation", "mapepallc"],
  "Great Lakes Drought Index": ["great lakes drought", "drought index"],
};

function isAppStoreUrl(url: string) {
  return /apps\.apple\.com|itunes\.apple\.com/i.test(url);
}

function isPlayStoreUrl(url: string) {
  return /play\.google\.com/i.test(url);
}

function isJunkLink(url: string) {
  return (
    /app\s*store|play\s*store/i.test(url) && !/^https?:\/\/\S+\.\S+/i.test(url)
  );
}

/** All non-empty project URLs (links[] + legacy fields), deduped. */
export function getProjectLinks(project: Project): string[] {
  const raw = [
    ...(project.links ?? []),
    project.link,
    project.appStoreLink,
    project.playStoreLink,
  ];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of raw) {
    const t = (u ?? "").trim();
    if (!t || isJunkLink(t)) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

/**
 * Set unlabeled links on a project and keep legacy fields in sync
 * so resume injection / AI prompts still know web vs store URLs.
 * Empty strings are kept in `links` so the editor can show blank rows.
 */
export function withProjectLinks(project: Project, links: string[]): Project {
  const ordered = links.map((l) => l.trim());
  const filled = ordered.filter((l) => l && !isJunkLink(l));
  const appStoreLink = filled.find(isAppStoreUrl) ?? "";
  const playStoreLink = filled.find(isPlayStoreUrl) ?? "";
  const link =
    filled.find((u) => !isAppStoreUrl(u) && !isPlayStoreUrl(u)) ?? "";
  return {
    ...project,
    links: ordered,
    link,
    appStoreLink: appStoreLink || undefined,
    playStoreLink: playStoreLink || undefined,
  };
}

/** Portfolio / app-store links merged when profile projects omit them. */
export const DEFAULT_PROJECT_LINKS: Partial<
  Pick<Project, "name" | "link" | "appStoreLink" | "playStoreLink" | "links">
>[] = [
  {
    name: "Mapepa Innovation LLC",
    link: "https://mapepallc.netlify.app",
  },
  {
    name: "Great Lakes Drought Index",
    link: "https://drought-index-aqua.netlify.app",
  },
  {
    name: "Attend-IQ",
    link: "https://attend-iq.netlify.app",
    appStoreLink: "https://apps.apple.com/ca/app/attend-iq/id6756984192",
    playStoreLink:
      "https://play.google.com/store/apps/details?id=com.attendiq.app",
  },
  {
    name: "TalentHub / VeriTalent",
    appStoreLink: "https://apps.apple.com/us/app/cmu-talenthub/id6757563079",
  },
  {
    name: "Multi-Currency Remittance System / xGatePay",
    appStoreLink:
      "https://apps.apple.com/us/app/xgatepay-by-growthsense-ltd/id6480584791",
    playStoreLink:
      "https://play.google.com/store/apps/details?id=com.xGate.Payment",
  },
  {
    name: "Corners",
    link: "https://acorners.netlify.app",
  },
  {
    name: "Alatoul",
    link: "https://alatoul.netlify.app",
  },
  {
    name: "Medical Reporting & Shift Scheduling / ELMS",
    link: "https://elmscare.co.uk/",
    appStoreLink: "https://apps.apple.com/us/app/elms-app/id6448575766",
    playStoreLink:
      "https://play.google.com/store/apps/details?id=com.recruit.elms",
  },
];

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ");
}

function tokens(s: string): string[] {
  return norm(s).split(" ").filter((t) => t.length > 2);
}

/** True when a line likely refers to this project (fuzzy name match). */
export function lineMatchesProject(line: string, project: Project): boolean {
  const lineNorm = norm(line);
  const names = [project.name, ...(PROJECT_ALIASES[project.name] ?? [])];
  for (const name of names) {
    const toks = tokens(name);
    if (toks.length > 0 && toks.every((t) => lineNorm.includes(t))) return true;
  }
  const distinctive = tokens(project.name).filter((t) => t.length > 5);
  return distinctive.some((t) => lineNorm.includes(t));
}

/**
 * Fill known web/App Store/Play Store URLs onto matching projects.
 * When `addMissing` is false, only enrich projects already present (resume import).
 */
export function applyKnownProjectLinks(
  projects: Project[],
  opts: { addMissing?: boolean } = {},
): Project[] {
  const addMissing = opts.addMissing ?? true;
  const merged = projects.map((p) => withProjectLinks(p, getProjectLinks(p)));
  for (const def of DEFAULT_PROJECT_LINKS) {
    if (!def.name) continue;
    const defName = def.name;
    const idx = merged.findIndex(
      (p) =>
        norm(p.name) === norm(defName) ||
        lineMatchesProject(p.name, { ...p, name: defName }) ||
        lineMatchesProject(defName, p),
    );
    const defLinks = [
      def.link,
      def.appStoreLink,
      def.playStoreLink,
      ...(def.links ?? []),
    ].filter(Boolean) as string[];

    if (idx >= 0) {
      merged[idx] = withProjectLinks(merged[idx], [
        ...getProjectLinks(merged[idx]),
        ...defLinks,
      ]);
    } else if (addMissing) {
      merged.push(
        withProjectLinks(
          {
            name: defName,
            role: "",
            description: "",
            link: "",
            tech: [],
          },
          defLinks,
        ),
      );
    }
  }
  return merged;
}

/** Merge profile projects with known default links (profile values win). */
export function mergeProjectLinks(projects: Project[]): Project[] {
  return applyKnownProjectLinks(projects, { addMissing: true });
}

function buildLinkSuffix(project: Project): string {
  const parts: string[] = [];
  for (const url of getProjectLinks(project)) {
    if (isAppStoreUrl(url)) parts.push(`[App Store](${url})`);
    else if (isPlayStoreUrl(url)) parts.push(`[Play Store](${url})`);
  }
  return parts.length ? ` | ${parts.join(" | ")}` : "";
}

function stripHeaderMarkdown(line: string): string {
  return line
    .replace(/^\*\*|\*\*$/g, "")
    .replace(/\*\*\[(.+?)\]\(.+?\)\*\*/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/\s*\|\s*App Store\s*(\|\s*Play Store)?/gi, "")
    .replace(/\(\s*App Store\s*(\|\s*Play Store)?\s*\)/gi, "")
    .replace(/\s*—\s*\*?\(?[^)]*\)?\*?\s*$/g, "")
    .trim();
}

function extractHeaderDates(text: string): { name: string; dates: string } {
  const t = text.trim();
  const paren = t.match(/^(.+?)\s+\(([^)]+)\)\s*$/);
  if (paren && /\d{4}|Present/i.test(paren[2])) {
    return { name: paren[1].trim(), dates: paren[2].trim() };
  }
  const em = t.match(/^(.+?)\s+[—–-]\s+(.+)$/);
  if (em && /\d{4}|Present/i.test(em[2])) {
    return { name: em[1].trim(), dates: em[2].trim() };
  }
  return { name: t, dates: "" };
}

function hasStoreLinks(line: string): boolean {
  return /apps\.apple\.com|play\.google\.com|\[App Store\]|\[Play Store\]/i.test(
    line,
  );
}

/** Rebuild a project header in the standard layout with links and dates. */
function formatProjectHeader(line: string, project: Project): string {
  const links = getProjectLinks(project);
  const web =
    links.find((u) => !isAppStoreUrl(u) && !isPlayStoreUrl(u))?.trim() ?? "";
  const suffix = buildLinkSuffix(project);
  if (!web && !suffix) return line;

  const { name, dates } = extractHeaderDates(stripHeaderMarkdown(line));
  const display = name || project.name;

  let header = web ? `**[${display}](${web})**` : `**${display}**`;
  header += suffix;
  if (dates) header += ` — *(${dates})*`;
  return header;
}

/** Add markdown links to a single project header line. */
function enrichProjectLine(line: string, project: Project): string {
  if (!lineMatchesProject(line, project)) return line;
  if (/^\s*[-*]/.test(line)) return line;
  if (hasStoreLinks(line) && /\*\*\[/.test(line)) return line;
  return formatProjectHeader(line, project);
}

/** Normalize dates on a project header to " — *(dates)*" at the end. */
function normalizeProjectHeaderDates(line: string): string {
  if (/—\s*\*\([^)]+\)\*/.test(line)) return line;
  const trimmed = line.trim();
  if (!/^\*\*/.test(trimmed)) return line;

  const storeMatch = trimmed.match(/(\s*\|\s*(?:\[[^\]]+\]\([^)]+\)\s*)+)/);
  const storePart = storeMatch?.[1] ?? "";
  const withoutStore = storePart
    ? trimmed.slice(0, trimmed.indexOf(storePart))
    : trimmed;

  const plain = stripHeaderMarkdown(withoutStore);
  const { name, dates } = extractHeaderDates(plain);
  if (!dates) return line;

  const webLink = withoutStore.match(/\*\*\[(.+?)\]\((.+?)\)\*\*/);
  const namePart = webLink
    ? `**[${webLink[1]}](${webLink[2]})**`
    : `**${name}**`;

  return `${namePart}${storePart} — *(${dates})*`;
}

/** Inject real project links into the PROJECTS section of a resume. */
export function injectProjectLinks(md: string, projects: Project[]): string {
  const withLinks = mergeProjectLinks(projects).filter(
    (p) => getProjectLinks(p).length > 0,
  );
  if (!withLinks.length) return md;

  const lines = md.split("\n");
  let inProjects = false;

  return lines
    .map((line) => {
      const trimmed = line.trim();
      if (/^##\s+PROJECTS/i.test(trimmed)) {
        inProjects = true;
        return line;
      }
      if (/^##\s+/.test(trimmed) && inProjects) inProjects = false;
      if (!inProjects) return line;
      if (/^\s*[-*]/.test(trimmed)) return line;

      let result = line;
      if (/^\*\*/.test(trimmed)) {
        result = normalizeProjectHeaderDates(result);
        for (const p of withLinks) {
          result = enrichProjectLine(result, p);
        }
      }
      return result;
    })
    .join("\n");
}

/** Human-readable link block for AI prompts. */
export function projectLinksBlock(projects: Project[]): string {
  const merged = mergeProjectLinks(projects).filter(
    (p) => getProjectLinks(p).length > 0,
  );
  if (!merged.length) return "(no project links on file)";
  return merged
    .map((p) => `- ${p.name}: ${getProjectLinks(p).join(" · ")}`)
    .join("\n");
}
