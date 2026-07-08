import type { ParsedResume } from "@/lib/ai";
import type { Project } from "@/lib/types";
import {
  applyKnownProjectLinks,
  getProjectLinks,
  withProjectLinks,
} from "@/lib/project-links";
import { extractUrlsFromText } from "@/lib/util";

function normalizeUrl(url: string): string {
  const trimmed = url
    .trim()
    .replace(/^<|>$/g, "")
    .replace(/[.,;:)\]>]+$/g, "");
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^(mailto:|tel:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function isLinkedIn(url: string) {
  return /linkedin\.com/i.test(url);
}

function isGitHub(url: string) {
  return /github\.com/i.test(url);
}

function isAppStore(url: string) {
  return /apps\.apple\.com|itunes\.apple\.com/i.test(url);
}

function isPlayStore(url: string) {
  return /play\.google\.com/i.test(url);
}

function isSocialOrMail(url: string) {
  return (
    isLinkedIn(url) ||
    isGitHub(url) ||
    isAppStore(url) ||
    isPlayStore(url) ||
    /^mailto:/i.test(url) ||
    /^tel:/i.test(url)
  );
}

/** Bare contact handles often lose the scheme in PDF text extraction. */
function extractBareSocialUrls(text: string): string[] {
  const found: string[] = [];
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9._%-]+\/?/gi,
    /(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9._%-]+\/?/gi,
    /(?:https?:\/\/)?(?:www\.)?(?:apps\.apple\.com|itunes\.apple\.com)\/[^\s|)\]]+/gi,
    /(?:https?:\/\/)?(?:www\.)?play\.google\.com\/store\/apps\/details\?[^\s|)\]]+/gi,
  ];
  for (const re of patterns) {
    let match: RegExpExecArray | null;
    while ((match = re.exec(text))) {
      found.push(normalizeUrl(match[0]));
    }
  }
  return found;
}

/**
 * Clean project titles like
 * "Attend-IQ | App Store | Play Store" → name + store label flags.
 */
export function sanitizeProjectName(raw: string): {
  name: string;
  mentionsAppStore: boolean;
  mentionsPlayStore: boolean;
} {
  let name = raw.trim();
  let mentionsAppStore = false;
  let mentionsPlayStore = false;

  if (/\|\s*app\s*store/i.test(name) || /\bapp\s*store\b/i.test(name)) {
    mentionsAppStore = true;
  }
  if (/\|\s*play\s*store/i.test(name) || /\bplay\s*store\b/i.test(name)) {
    mentionsPlayStore = true;
  }

  name = name
    .replace(/\s*\|\s*App\s*Store\s*/gi, " ")
    .replace(/\s*\|\s*Play\s*Store\s*/gi, " ")
    .replace(/\s*\(\s*App\s*Store\s*(?:\|\s*)?Play\s*Store\s*\)/gi, " ")
    .replace(/\s*\|\s*Web\s*/gi, " ")
    .replace(/\s*—\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  // "TalentHub Rebranded to VeriTalent" stays; strip trailing store words only
  name = name
    .replace(/\bApp\s*Store\b/gi, "")
    .replace(/\bPlay\s*Store\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return { name: name || raw.trim(), mentionsAppStore, mentionsPlayStore };
}

function classifyUrl(
  url: string,
): "linkedin" | "github" | "appStore" | "playStore" | "web" {
  if (isLinkedIn(url)) return "linkedin";
  if (isGitHub(url)) return "github";
  if (isAppStore(url)) return "appStore";
  if (isPlayStore(url)) return "playStore";
  return "web";
}

/** Collect every URL/handle found in resume text. */
export function collectResumeUrls(rawText: string): string[] {
  const urls = [
    ...extractUrlsFromText(rawText).map(normalizeUrl),
    ...extractBareSocialUrls(rawText),
  ];
  return [...new Set(urls.filter(Boolean))];
}

/** Pull contact links from raw resume text when the model missed them. */
export function enrichParsedResume(
  rawText: string,
  parsed: ParsedResume,
): ParsedResume {
  const urls = collectResumeUrls(rawText);

  const linkedin =
    normalizeUrl(parsed.linkedin) || urls.find(isLinkedIn) || "";
  const github = normalizeUrl(parsed.github) || urls.find(isGitHub) || "";

  const used = new Set([linkedin, github].filter(Boolean));

  // Prefer a personal/portfolio site from the header (netlify, vercel, .me, etc.)
  const website =
    normalizeUrl(parsed.website) ||
    urls.find((u) => {
      if (used.has(u) || isSocialOrMail(u)) return false;
      return /netlify\.app|vercel\.app|github\.io|portfolio|\.me\/|carrd\.co|notion\.site|sites\.google/i.test(
        u,
      );
    }) ||
    urls.find((u) => !used.has(u) && !isSocialOrMail(u)) ||
    "";

  if (website) used.add(website);

  const projects = applyKnownProjectLinks(
    parsed.projects.map((project) =>
      enrichProjectLinks(project, rawText, urls, used),
    ),
    { addMissing: false },
  );

  const certifications = parsed.certifications.map((cert) => ({
    ...cert,
    url:
      normalizeUrl(cert.url ?? "") ||
      urls.find(
        (u) =>
          !used.has(u) &&
          !isSocialOrMail(u) &&
          cert.name &&
          u.toLowerCase().includes(cert.name.toLowerCase().slice(0, 8)),
      ) ||
      cert.url,
  }));

  return {
    ...parsed,
    linkedin,
    github,
    website,
    projects,
    certifications,
  };
}

function enrichProjectLinks(
  project: Project,
  rawText: string,
  urls: string[],
  used: Set<string>,
): Project {
  const { name } = sanitizeProjectName(project.name);
  const nameLower = name.toLowerCase();
  const slug = nameLower.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const distinctive = nameLower
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 3);

  const collected = getProjectLinks(project)
    .map(normalizeUrl)
    .filter(Boolean);

  // Prefer URLs near the project name in the resume text
  const nearby = findUrlsNearProject(rawText, name, distinctive);

  for (const url of [...nearby, ...urls]) {
    if (used.has(url) && !collected.includes(url)) continue;
    const kind = classifyUrl(url);
    if (kind === "linkedin" || kind === "github") continue;

    if (kind === "appStore" || kind === "playStore") {
      if (!collected.includes(url)) collected.push(url);
      continue;
    }

    // web
    const lower = url.toLowerCase();
    const matchesName =
      (slug && lower.includes(slug)) ||
      distinctive.some((t) => lower.includes(t));
    if (
      (matchesName || nearby.includes(url)) &&
      !collected.includes(url)
    ) {
      collected.push(url);
    }
  }

  for (const u of collected) used.add(u);

  return withProjectLinks({ ...project, name }, collected);
}

/** Grab URLs within ~400 chars of a project name mention. */
function findUrlsNearProject(
  text: string,
  name: string,
  tokens: string[],
): string[] {
  const lower = text.toLowerCase();
  const probes = [name.toLowerCase(), ...tokens].filter((t) => t.length > 2);
  const windows: string[] = [];

  for (const probe of probes) {
    let idx = 0;
    while ((idx = lower.indexOf(probe, idx)) !== -1) {
      windows.push(text.slice(Math.max(0, idx - 80), idx + probe.length + 400));
      idx += probe.length;
    }
  }

  const urls: string[] = [];
  for (const window of windows) {
    urls.push(...collectResumeUrls(window));
  }
  return [...new Set(urls)];
}
