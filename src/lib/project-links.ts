import type { Project } from "@/lib/types";

/** Aliases used to match project names in resume lines. */
const PROJECT_ALIASES: Record<string, string[]> = {
  "Attend-IQ": ["attend iq", "attend-iq", "attendiq"],
  "TalentHub / VeriTalent": [
    "talenthub",
    "veritalent",
    "cmu talenthub",
    "veritalent app",
    "talenthub rebranded to veritalent",
    "talenthub rebranded",
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

function isGitHubUrl(url: string) {
  return /github\.com/i.test(url);
}

function isGitHubRepoUrl(url: string) {
  return /github\.com\/[^/]+\/[^/]+/i.test(url);
}

function normalizeUrlPath(url: string): string {
  return url
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/$/, "")
    .toLowerCase();
}

/** True when URL is a GitHub profile (not a specific repo). */
export function isGitHubProfileUrl(
  url: string,
  profileGithub?: string,
): boolean {
  if (!isGitHubUrl(url) || isGitHubRepoUrl(url)) return false;
  if (profileGithub) {
    const profilePath = normalizeUrlPath(profileGithub);
    const urlPath = normalizeUrlPath(url);
    if (urlPath === profilePath || urlPath.startsWith(`${profilePath}/`)) {
      return !isGitHubRepoUrl(url);
    }
  }
  return /^github\.com\/[A-Za-z0-9._-]+\/?$/i.test(normalizeUrlPath(url));
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
 * Best URL to attach to a project title in the resume.
 * Prefers live demos / websites, then repo URLs — never the candidate's GitHub profile.
 */
export function getPrimaryProjectWebLink(
  project: Project,
  opts?: { profileGithub?: string },
): string {
  const profileGithub = opts?.profileGithub;
  const webLinks = getProjectLinks(project).filter(
    (u) => !isAppStoreUrl(u) && !isPlayStoreUrl(u),
  );

  const liveSite = webLinks.find(
    (u) => !isGitHubUrl(u) && !isGitHubProfileUrl(u, profileGithub),
  );
  if (liveSite) return liveSite;

  const repo = webLinks.find(
    (u) => isGitHubRepoUrl(u) && !isGitHubProfileUrl(u, profileGithub),
  );
  if (repo) return repo;

  const other = webLinks.find((u) => !isGitHubProfileUrl(u, profileGithub));
  if (other) return other;

  // No web link — fall back to a single store link so the title still links out.
  const stores = getProjectLinks(project).filter(
    (u) => isAppStoreUrl(u) || isPlayStoreUrl(u),
  );
  return stores[0] ?? "";
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
  const link = getPrimaryProjectWebLink(
    { ...project, links: filled, link: "", appStoreLink, playStoreLink },
  );
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

/** Strip link-label chips (store, GitHub, live demo, etc.) from a header line. */
function stripStoreLinks(line: string): string {
  return line
    .replace(
      /\s*\|\s*\[?(?:App Store|Play Store|GitHub|Live(?:\s*Demo)?|Demo|Website|Site|Source|Repo(?:sitory)?|Code)\]?(?:\([^)]*\))?/gi,
      "",
    )
    .replace(/\s*\|\s*\[[^\]]+\]\([^)]*\)/g, "")
    .replace(/\s*\(\s*(?:\[?(?:App Store|Play Store)\]?(?:\([^)]*\))?\s*\|?\s*)+\)/gi, "")
    .trim();
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

function unlinkProjectHeader(line: string): string {
  const { name, dates } = extractHeaderDates(stripHeaderMarkdown(line));
  let header = `**${name}**`;
  if (dates) header += ` — *(${dates})*`;
  return header;
}

/**
 * Strip ALL links from the PROJECTS section — web, GitHub, and App/Play Store —
 * leaving clean `**Title** — *(dates)*` headers only.
 */
export function injectProjectLinks(
  md: string,
  _projects: Project[],
  _opts?: { profileGithub?: string },
): string {
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
      if (!/^\*\*/.test(trimmed)) return line;

      return unlinkProjectHeader(stripStoreLinks(line));
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
    .map((p) => {
      const primary = getPrimaryProjectWebLink(p);
      const extras = getProjectLinks(p).filter(
        (u) =>
          u !== primary &&
          (isAppStoreUrl(u) || isPlayStoreUrl(u) || isGitHubRepoUrl(u)),
      );
      const parts = [primary, ...extras].filter(Boolean);
      return `- ${p.name}: ${parts.join(" · ") || "(no web URL — leave title unlinked)"}`;
    })
    .join("\n");
}
