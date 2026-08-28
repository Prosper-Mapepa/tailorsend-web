// Minimal, dependency-free Markdown → HTML for rendering resumes/cover letters
// into clean printable documents.

import type { Project } from "@/lib/types";
import { injectProjectLinks } from "@/lib/project-links";
import {
  boldProjectHeaderLine,
  consolidateProjectSections,
  normalizeProjectParagraphs,
} from "@/lib/resume-projects";

// Canonical resume section titles. Used to repair headings when a model pass
// flattens "## SUMMARY" into plain "SUMMARY" (which loses all styling).
const SECTION_TITLES = new Set([
  "SUMMARY",
  "PROFESSIONAL SUMMARY",
  "OBJECTIVE",
  "PROFILE",
  "CORE SKILLS",
  "SKILLS",
  "TECHNICAL SKILLS",
  "KEY SKILLS",
  "SKILLS AND CERTIFICATIONS",
  "CORE SECURITY COMPETENCIES",
  "EXPERIENCE",
  "WORK EXPERIENCE",
  "PROFESSIONAL EXPERIENCE",
  "EMPLOYMENT",
  "EMPLOYMENT HISTORY",
  "PROJECTS",
  "PROJECT EXPERIENCE",
  "SELECTED PROJECTS",
  "SELECTED INITIATIVES",
  "INITIATIVES",
  "SECURITY ENGINEERING PROJECTS",
  "EDUCATION",
  "CERTIFICATIONS",
  "AWARDS",
  "ACHIEVEMENTS",
  "PUBLICATIONS",
  "VOLUNTEERING",
  "LEADERSHIP",
  "LEADERSHIP & AFFILIATIONS",
  "AFFILIATIONS",
]);

function isExperienceTitle(title: string): boolean {
  return /^(WORK EXPERIENCE|EXPERIENCE|PROFESSIONAL EXPERIENCE|EMPLOYMENT|EMPLOYMENT HISTORY)(\s*\([^)]*\))?$/i.test(
    title.trim(),
  );
}

function isSkillsTitle(title: string): boolean {
  return /^(CORE SKILLS|SKILLS|TECHNICAL SKILLS|KEY SKILLS|SKILLS AND CERTIFICATIONS|CORE SECURITY COMPETENCIES)$/i.test(
    title.trim(),
  );
}

function isProjectsTitle(title: string): boolean {
  return /^(PROJECTS|PROJECT EXPERIENCE|SELECTED PROJECTS|SELECTED INITIATIVES|INITIATIVES|SECURITY ENGINEERING PROJECTS)$/i.test(
    title.trim(),
  );
}

function isLeadershipTitle(title: string): boolean {
  return /^(LEADERSHIP|LEADERSHIP\s*&\s*AFFILIATIONS|AFFILIATIONS)$/i.test(
    title.trim(),
  );
}

function isKnownSectionTitle(title: string): boolean {
  const t = title.toUpperCase().trim();
  if (SECTION_TITLES.has(t)) return true;
  return (
    isExperienceTitle(t) ||
    isSkillsTitle(t) ||
    isProjectsTitle(t) ||
    isLeadershipTitle(t)
  );
}

function headingText(line: string): string {
  return line
    .replace(/^#{1,6}\s*/, "")
    .replace(/\*\*/g, "")
    .replace(/[:#*]+$/, "")
    .trim();
}

/**
 * Convert standalone lines that are known resume section titles into proper
 * "## Heading" Markdown. Safe for cover letters (they don't contain such
 * standalone lines). Idempotent.
 */
export function normalizeResumeSections(md: string): string {
  return md
    .replace(/\r/g, "")
    .split("\n")
    .map((raw) => {
      const line = raw.trim();
      if (!line || /^[-*]\s+/.test(line)) return raw;
      const title = headingText(line);
      if (isKnownSectionTitle(title) && title.length <= 60) {
        return `## ${title}`;
      }
      return raw;
    })
    .join("\n");
}

/**
 * Strip leading/trailing ``` / ```markdown fences the model sometimes wraps
 * around the whole resume — including the bad persisted form `# ```markdown`.
 * Idempotent.
 */
export function stripMarkdownFences(md: string): string {
  let s = md.replace(/^\uFEFF/, "").replace(/\r/g, "").trim();
  const wrapped = s.match(
    /^```(?:markdown|md|text)?\s*\n([\s\S]*?)\n```\s*$/i,
  );
  if (wrapped) return wrapped[1].trim();

  // Opening fence, optionally already promoted to H1 from an earlier bad pass.
  s = s.replace(/^#?\s*```(?:markdown|md|text)?\s*\n?/i, "");
  s = s.replace(/\n#?\s*```\s*$/i, "");

  // Drop any remaining fence-only lines (with or without a leading #).
  s = s
    .split("\n")
    .filter((l) => !/^\s*#?\s*```/.test(l.trim()))
    .join("\n");

  return s.trim();
}

function looksLikePersonName(line: string): boolean {
  const t = line.replace(/^#\s*/, "").replace(/\*\*/g, "").trim();
  if (!t || /@|\||\d{3}|https?:/i.test(t)) return false;
  if (/linkedin|github|portfolio/i.test(t)) return false;
  const words = t.split(/\s+/);
  return (
    words.length >= 2 &&
    words.length <= 6 &&
    words.every((w) => /^[A-Za-z][A-Za-z.'’-]*$/.test(w))
  );
}

/**
 * Canonical section order:
 * Professional Summary → Technical Skills → Professional Experience →
 * Projects → Leadership & Affiliations → Education → rest.
 */
export function reorderResumeSections(md: string): string {
  const lines = md.replace(/\r/g, "").split("\n");
  const preamble: string[] = [];
  type Section = { title: string; lines: string[]; index: number };
  const sections: Section[] = [];
  let current: Section | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^##\s+/.test(trimmed)) {
      current = {
        title: trimmed.replace(/^##\s+/, "").replace(/[:#*]+$/, "").trim(),
        lines: [line],
        index: sections.length,
      };
      sections.push(current);
    } else if (current) {
      current.lines.push(line);
    } else {
      preamble.push(line);
    }
  }

  if (sections.length < 2) return md;

  const rankOf = (title: string): number => {
    const t = title.toUpperCase();
    if (/^(PROFESSIONAL SUMMARY|SUMMARY|OBJECTIVE|PROFILE)$/.test(t)) return 0;
    if (isSkillsTitle(t)) return 1;
    if (isExperienceTitle(t)) return 2;
    if (isProjectsTitle(t)) return 3;
    if (isLeadershipTitle(t) || /^VOLUNTEERING$/i.test(t)) return 4;
    if (/^EDUCATION$/.test(t)) return 5;
    if (/^(ACHIEVEMENTS|AWARDS|CERTIFICATIONS|PUBLICATIONS)$/.test(t)) {
      return 6;
    }
    return 40;
  };

  sections.sort((a, b) => {
    const diff = rankOf(a.title) - rankOf(b.title);
    return diff !== 0 ? diff : a.index - b.index;
  });

  // Trim trailing blanks per section, keep a blank line between sections.
  const body: string[] = [];
  for (const section of sections) {
    while (section.lines.length && section.lines[section.lines.length - 1].trim() === "") {
      section.lines.pop();
    }
    if (body.length) body.push("");
    body.push(...section.lines);
  }

  const head = [...preamble];
  while (head.length && head[head.length - 1].trim() === "") head.pop();
  if (head.length) head.push("");
  return [...head, ...body].join("\n").replace(/\n{3,}/g, "\n\n");
}

const MONTH_INDEX: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

function parseResumeDate(token: string): Date | null {
  const t = token.trim();
  if (/^present$/i.test(t)) return new Date();
  const my = t.match(
    /^(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(\d{4})$/i,
  );
  if (my) {
    const mon = MONTH_INDEX[my[1].slice(0, 3).toLowerCase()];
    if (mon == null) return null;
    return new Date(Number(my[2]), mon, 1);
  }
  if (/^(19|20)\d{2}$/.test(t)) return new Date(Number(t), 0, 1);
  return null;
}

function computeCareerYears(md: string): number | null {
  const lines = md.replace(/\r/g, "").split("\n");
  let inExp = false;
  const chunks: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^##\s+/.test(trimmed)) {
      inExp = isExperienceTitle(trimmed.replace(/^##\s+/, "").trim());
      continue;
    }
    if (inExp) chunks.push(line);
  }
  const text = chunks.join("\n") || md;
  const rangeRe =
    /(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{4}\s*[–—-]\s*(?:Present|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{4}|\d{4})/gi;
  let earliest: Date | null = null;
  let latest: Date | null = null;
  const now = new Date();
  for (const match of text.matchAll(rangeRe)) {
    const parts = match[0].split(/[–—-]/).map((p) => p.trim());
    if (parts.length < 2) continue;
    const start = parseResumeDate(parts[0]);
    const end = /present/i.test(parts[1]) ? now : parseResumeDate(parts[1]);
    if (start && (!earliest || start < earliest)) earliest = start;
    if (end && (!latest || end > latest)) latest = end;
  }
  if (!earliest) {
    const fromSummary = md.match(/(\d+)\+\s*years?/i);
    return fromSummary ? Number(fromSummary[1]) : null;
  }
  const end = latest && latest > now ? latest : latest ?? now;
  const months =
    (end.getFullYear() - earliest.getFullYear()) * 12 +
    (end.getMonth() - earliest.getMonth());
  const years = Math.floor(Math.max(months, 0) / 12);
  return years >= 1 ? years : 1;
}

function experienceYearsSuffix(md: string): string {
  const years = computeCareerYears(md);
  return years != null ? `${years}+ YEARS` : "";
}

/** Map model/source headings onto the default Tailor section titles. */
export function canonicalizeResumeHeadings(md: string): string {
  const years = experienceYearsSuffix(md);
  return md
    .replace(/\r/g, "")
    .split("\n")
    .map((raw) => {
      if (!/^##\s+/.test(raw.trim())) return raw;
      const title = raw
        .trim()
        .replace(/^##\s+/, "")
        .replace(/[:#*]+$/, "")
        .trim();
      const t = title.toUpperCase().replace(/\s*\([^)]*\)\s*$/, "").trim();
      if (/^(PROFESSIONAL SUMMARY|SUMMARY|OBJECTIVE|PROFILE)$/.test(t)) {
        return "## PROFESSIONAL SUMMARY";
      }
      if (isSkillsTitle(t) || isSkillsTitle(title)) {
        return "## TECHNICAL SKILLS";
      }
      if (isExperienceTitle(title) || isExperienceTitle(t)) {
        return years
          ? `## PROFESSIONAL EXPERIENCE (${years})`
          : "## PROFESSIONAL EXPERIENCE";
      }
      if (isProjectsTitle(t) || isProjectsTitle(title)) {
        return "## PROJECTS";
      }
      if (isLeadershipTitle(t) || isLeadershipTitle(title)) {
        return "## LEADERSHIP & AFFILIATIONS";
      }
      if (/^EDUCATION$/i.test(t)) return "## EDUCATION";
      return raw;
    })
    .join("\n");
}

/**
 * Full resume normalization: repair section headings AND ensure the first line
 * (the candidate name) is an H1. Apply ONLY to resumes, never cover letters.
 */
export function normalizeResumeMarkdown(md: string): string {
  const lines = normalizeResumeSections(stripMarkdownFences(md)).split("\n");
  const firstIdx = lines.findIndex((l) => {
    const t = l.trim();
    return t !== "" && !/^\s*#?\s*```/.test(t);
  });
  if (firstIdx >= 0) {
    const first = lines[firstIdx].trim();
    if (/^#\s*```/.test(first)) {
      // Fence wrongly promoted to H1 in an earlier pass — drop it.
      lines[firstIdx] = "";
    } else if (!first.startsWith("#") && looksLikePersonName(first)) {
      lines[firstIdx] = `# ${first.replace(/\*\*/g, "").trim()}`;
    }
  }
  // Drop any leftover fence lines so they never become H1 or body text.
  const cleaned = lines.filter((l) => !/^\s*#?\s*```/.test(l.trim()));
  return normalizeResumeHeader(
    toSplitEntryLayout(
      normalizeResumeEntries(
        normalizeProjectHeaders(
          normalizeEducationEntries(
            reorderExperienceEntries(
              mergeOrphanRoleDates(
                normalizeProjectParagraphs(
                  consolidateProjectSections(
                    normalizeLeadershipEntries(
                      normalizeSkillsLists(
                        reorderResumeSections(
                          canonicalizeResumeHeadings(
                            collapseExcessBlankLines(cleaned.join("\n")),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}

/** Collapse extra vertical whitespace so PDFs stay within two pages. */
function collapseExcessBlankLines(md: string): string {
  return md
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export type ResumeContact = {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  website?: string;
};

function normalizeUrl(url: string): string {
  const t = url.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t.replace(/^\/+/, "")}`;
}

function contactLinkLabel(
  type: "linkedin" | "github" | "portfolio",
  url: string,
): string {
  const u = normalizeUrl(url);
  if (type === "linkedin") return `[LinkedIn](${u})`;
  if (type === "github") return `[GitHub](${u})`;
  return `[Portfolio](${u})`;
}

function enrichContactSegment(seg: string, contact: ResumeContact): string {
  const t = seg.trim();
  if (!t || /\[.+?\]\(.+?\)/.test(t)) return t;

  if (/^linkedin$/i.test(t) && contact.linkedin?.trim()) {
    return contactLinkLabel("linkedin", contact.linkedin);
  }
  if (/^github$/i.test(t) && contact.github?.trim()) {
    return contactLinkLabel("github", contact.github);
  }
  if (/^portfolio$/i.test(t) && contact.website?.trim()) {
    return contactLinkLabel("portfolio", contact.website);
  }

  const li = t.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/[^\s|)]+/i);
  if (li) return contactLinkLabel("linkedin", li[0]);

  const gh = t.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[^\s|)]+/i);
  if (gh) return contactLinkLabel("github", gh[0]);

  return t;
}

function expandLinkLabelSegment(segment: string): string[] {
  const words = segment.trim().split(/\s+/).filter(Boolean);
  if (
    words.length >= 2 &&
    words.every((w) => /^(linkedin|github|portfolio)$/i.test(w))
  ) {
    return words;
  }
  return [segment];
}

function looksLikeContactLine(t: string): boolean {
  const s = t.trim();
  if (!s || /^##\s/.test(s) || s.includes("## ")) return false;
  // A whole resume dumped on one line is not a contact bar.
  if (s.length > 180) return false;
  return (
    /@/.test(s) ||
    /\(?\d{3}\)?[-.\s]?\d{3}/.test(s) ||
    /linkedin|github|portfolio/i.test(s) ||
    /\|/.test(s) ||
    /•/.test(s) ||
    /\[.+?\]\(.+?\)/.test(s)
  );
}

function looksLikeHeadline(t: string): boolean {
  const s = stripMd(t);
  if (!s || /^##\s/.test(t.trim()) || /^[-*]\s/.test(t.trim())) return false;
  if (looksLikeContactLine(s)) return false;
  if (s.length > 70 || /[.!?]$/.test(s)) return false;
  const words = s.split(/\s+/);
  if (words.length < 2 || words.length > 10) return false;
  return looksLikeJobTitle(s);
}

/** Name, then centered job title, then a single contact line. */
export function normalizeResumeHeader(md: string): string {
  const lines = md.replace(/\r/g, "").split("\n");
  const nameIdx = lines.findIndex(
    (l) => /^#\s/.test(l.trim()) && !/^##\s/.test(l.trim()),
  );
  if (nameIdx < 0) return md;

  let sectionStart = lines.findIndex(
    (l, i) => i > nameIdx && /^##\s/.test(l.trim()),
  );
  if (sectionStart < 0) sectionStart = lines.length;

  const preamble = lines.slice(nameIdx + 1, sectionStart);
  const headlines: string[] = [];
  const contactParts: string[] = [];

  for (const raw of preamble) {
    const t = raw.trim();
    if (!t) continue;
    if (looksLikeContactLine(t)) {
      for (const piece of t.split(/\s*[|•]\s*/)) {
        const part = piece.trim();
        if (part) contactParts.push(part);
      }
      continue;
    }
    if (looksLikeHeadline(t) && headlines.length === 0) {
      headlines.push(stripMd(t));
    }
  }

  const seen = new Set<string>();
  const contact = contactParts.filter((p) => {
    const key = p.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const rebuilt = [
    lines[nameIdx],
    ...headlines.slice(0, 1),
    contact.length ? contact.join(" | ") : "",
  ].filter((l, i) => i === 0 || l);

  const rest = lines.slice(sectionStart);
  const out = [...lines.slice(0, nameIdx), ...rebuilt];
  if (rest.length) {
    if (out[out.length - 1]?.trim()) out.push("");
    out.push(...rest);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n");
}

/** Turn plain LinkedIn / GitHub / Portfolio labels into markdown links from profile. */
export function injectContactLinks(md: string, contact: ResumeContact): string {
  const lines = md.replace(/\r/g, "").split("\n");
  const nameIdx = lines.findIndex((l) => /^#\s/.test(l.trim()));
  if (nameIdx < 0) return md;

  // Collect contact lines under the name, skipping a job-title headline.
  const contactIndices: number[] = [];
  let headlineIdx = -1;
  for (let i = nameIdx + 1; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t) continue;
    if (/^##\s/.test(t)) break;
    if (looksLikeHeadline(t)) {
      if (headlineIdx < 0) headlineIdx = i;
      continue;
    }
    if (!looksLikeContactLine(t)) break;
    contactIndices.push(i);
  }

  const existing = contactIndices.map((i) => lines[i]).join(" | ");
  const enriched: string[] = [];

  if (existing) {
    for (const segment of existing.split("|")) {
      for (const piece of expandLinkLabelSegment(segment)) {
        const part = enrichContactSegment(piece.trim(), contact);
        if (part) enriched.push(part);
      }
    }
  }

  const email =
    enriched.find((s) => /@/.test(s) && !/\[/.test(s)) ||
    existing.match(/[\w.+-]+@[\w.-]+\.\w+/)?.[0] ||
    contact.email?.trim() ||
    "";
  const phone =
    enriched.find(
      (s) => /\d{3}/.test(s) && !/\[/.test(s) && !/@/.test(s),
    ) ||
    existing.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/)?.[0] ||
    contact.phone?.trim() ||
    "";
  const location =
    enriched.find(
      (s) =>
        !/\[/.test(s) &&
        !/@/.test(s) &&
        !/\d{3}[-.\s]?\d{3}/.test(s) &&
        s.length > 2,
    ) ||
    contact.location?.trim() ||
    "";

  const linkParts = enriched.filter((s) =>
    /\[(LinkedIn|GitHub|Portfolio)\]/i.test(s),
  );

  if (
    contact.linkedin?.trim() &&
    !linkParts.some((s) => /\[LinkedIn\]/i.test(s))
  ) {
    linkParts.push(contactLinkLabel("linkedin", contact.linkedin));
  }
  if (contact.github?.trim() && !linkParts.some((s) => /\[GitHub\]/i.test(s))) {
    linkParts.push(contactLinkLabel("github", contact.github));
  }
  if (
    contact.website?.trim() &&
    !linkParts.some((s) => /\[Portfolio\]/i.test(s))
  ) {
    linkParts.push(contactLinkLabel("portfolio", contact.website));
  }

  // Dedupe identical segments (case-insensitive) while preserving order.
  const seen = new Set<string>();
  const parts = [phone, email, ...linkParts, location].filter((p) => {
    if (!p) return false;
    const key = p.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const newLine = parts.join(" | ");
  if (!newLine) return md;

  if (contactIndices.length) {
    lines[contactIndices[0]] = newLine;
    for (let i = contactIndices.length - 1; i >= 1; i--) {
      lines.splice(contactIndices[i], 1);
    }
  } else {
    const insertAt = headlineIdx >= 0 ? headlineIdx + 1 : nameIdx + 1;
    lines.splice(insertAt, 0, newLine);
  }

  return normalizeResumeHeader(lines.join("\n"));
}

/** Normalize + inject verified contact and project links (PDF, preview, API). */
export function prepareResumeMarkdown(
  md: string,
  projects: Project[] = [],
  contact?: ResumeContact,
): string {
  let out = normalizeResumeMarkdown(md);

  // Ensure a real H1 name before contact injection (fence cleanup can wipe it).
  const name = contact?.fullName?.trim();
  if (name) {
    const lines = out.split("\n");
    const nameIdx = lines.findIndex((l) => /^#\s/.test(l.trim()));
    if (nameIdx < 0) {
      lines.unshift(`# ${name}`);
      out = lines.join("\n");
    } else if (
      /^#\s*```/.test(lines[nameIdx].trim()) ||
      !looksLikePersonName(lines[nameIdx])
    ) {
      lines[nameIdx] = `# ${name}`;
      out = lines.join("\n");
    }
  }

  out = injectProjectLinks(out, projects, {
    profileGithub: contact?.github,
  });
  if (contact) out = injectContactLinks(out, contact);
  else out = normalizeResumeHeader(out);
  return out;
}

const EXP_SECTIONS =
  /^(WORK EXPERIENCE|EXPERIENCE|PROFESSIONAL EXPERIENCE|EMPLOYMENT|EMPLOYMENT HISTORY)(\s*\([^)]*\))?$/i;

const EDUCATION_SECTIONS = /^EDUCATION$/i;

const PROJECT_SECTIONS =
  /^(PROJECTS|PROJECT EXPERIENCE|SELECTED PROJECTS|SELECTED INITIATIVES|INITIATIVES|SECURITY ENGINEERING PROJECTS)$/i;

const SKILLS_SECTIONS =
  /^(CORE SKILLS|SKILLS|TECHNICAL SKILLS|KEY SKILLS|SKILLS AND CERTIFICATIONS|CORE SECURITY COMPETENCIES)$/i;

const DEGREE_KEYWORDS =
  /\b(MBA|M\.?S\.?|B\.?S\.?|B\.?A\.?|M\.?A\.?|Ph\.?D\.?|Bachelor|Master|Doctor|Associate)\b/i;

const UNIVERSITY_KEYWORDS =
  /\b(University|College|Institute|School|Academy)\b/i;

const DATE_IN_PARENS = /\([^)]*\d{4}[^)]*\)\s*$/;
const DATE_RANGE =
  /(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{4}\s*[–—-]\s*(?:Present|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{4}|\d{4})/i;

const LOCATION_TAIL =
  /,\s*[A-Z]{2}(\s|$)|,\s*(?:United Kingdom|UK|Canada|Australia|Germany|France|India)\b|\b(Remote|USA|United States)\b/i;

const COMPANY_MARKERS =
  /\b(Ltd|LLC|Inc|Corp|Corporation|University|College|Institute|Group|Technologies|Systems)\b/i;

function stripMd(line: string): string {
  return line.replace(/\*\*/g, "").replace(/^#+\s*/, "").trim();
}

function isDatesOnlyLine(line: string): boolean {
  const plain = stripMd(line);
  return /^\([^)]*\d{4}[^)]*\)\s*$/.test(plain);
}

function isEducationSchoolLine(line: string): boolean {
  const plain = stripMd(line);
  const emDash = plain.match(/^(.+?)\s+[—–-]\s+(.+)$/);
  if (emDash) {
    return (
      UNIVERSITY_KEYWORDS.test(emDash[1]) || LOCATION_TAIL.test(emDash[2])
    );
  }
  return UNIVERSITY_KEYWORDS.test(plain);
}

function isEducationDegreeLine(line: string): boolean {
  const plain = stripMd(line);
  return (
    DEGREE_KEYWORDS.test(plain) ||
    /\(Graduation|Expected|GPA|Class of/i.test(plain)
  );
}

function isEducationDetailLine(line: string): boolean {
  const plain = stripMd(line);
  return (
    /leader\s*shape/i.test(plain) ||
    /^relevant coursework:/i.test(plain) ||
    (/^completed\s+/i.test(plain) && plain.length > 30)
  );
}

/** Merge role title + dates when the model splits them across two lines. */
function mergeOrphanRoleDates(md: string): string {
  const lines = md.replace(/\r/g, "").split("\n");
  let section = "";
  const out: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (/^##\s+/.test(trimmed)) {
      section = trimmed.replace(/^##\s+/, "").trim();
      out.push(lines[i]);
      continue;
    }

    if (EXP_SECTIONS.test(section) && trimmed && !/^[-*]/.test(trimmed)) {
      const next = lines[i + 1]?.trim() ?? "";
      if (
        !DATE_IN_PARENS.test(stripMd(trimmed)) &&
        !isCompanyLine(trimmed) &&
        /^\([^)]*\d{4}[^)]*\)\s*$/.test(next)
      ) {
        out.push(`${trimmed} ${next}`);
        i++;
        continue;
      }
    }

    out.push(lines[i]);
  }

  return out.join("\n");
}

/** Bold school/degree lines; split LeaderShape & coursework into bullets. */
function normalizeEducationEntries(md: string): string {
  const lines = md.replace(/\r/g, "").split("\n");
  let inEducation = false;
  const out: string[] = [];

  for (const raw of lines) {
    const trimmed = raw.trim();

    if (/^##\s+/.test(trimmed)) {
      const title = trimmed.replace(/^##\s+/, "").trim();
      inEducation = EDUCATION_SECTIONS.test(title);
      out.push(raw);
      continue;
    }

    if (/^##\s+/.test(trimmed) || (!inEducation && !trimmed)) {
      out.push(raw);
      continue;
    }

    if (!inEducation) {
      out.push(raw);
      continue;
    }

    if (!trimmed) {
      out.push(raw);
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      out.push(raw);
      continue;
    }

    const plain = stripMd(trimmed);

    if (/leader\s*shape/i.test(plain) && /relevant coursework:/i.test(plain)) {
      const courseworkIdx = plain.search(/relevant coursework:/i);
      const leaderPart = plain.slice(0, courseworkIdx).trim();
      const courseworkPart = plain.slice(courseworkIdx).trim();
      if (leaderPart) out.push(`- ${leaderPart}`);
      if (courseworkPart) out.push(`- ${courseworkPart}`);
      continue;
    }

    if (isEducationDetailLine(trimmed)) {
      out.push(`- ${plain}`);
      continue;
    }

    if (isEducationSchoolLine(trimmed)) {
      out.push(boldCompanyLine(raw));
      continue;
    }

    if (isEducationDegreeLine(trimmed)) {
      out.push(boldRoleLine(raw));
      continue;
    }

    out.push(raw);
  }

  return out.join("\n");
}

/** Ensure every project header line is bold with consistent trailing dates. */
function ensureBoldProjectHeader(line: string): string {
  if (/^\s*[-*]\s/.test(line)) return line;
  return boldProjectHeaderLine(line);
}

function normalizeProjectHeaders(md: string): string {
  const lines = md.replace(/\r/g, "").split("\n");
  let inProjects = false;

  return lines
    .map((raw) => {
      const trimmed = raw.trim();
      if (/^##\s+PROJECTS/i.test(trimmed)) {
        inProjects = true;
        return raw;
      }
      if (/^##\s+/.test(trimmed) && inProjects) inProjects = false;
      // Require whitespace after -/* so bold **Title** is not treated as a bullet.
      if (!inProjects || !trimmed || /^[-*]\s/.test(trimmed)) return raw;
      return ensureBoldProjectHeader(raw);
    })
    .join("\n");
}

function isRoleLine(trimmed: string): boolean {
  if (isDatesOnlyLine(trimmed)) return false;
  const plain = stripMd(trimmed);
  if (DATE_IN_PARENS.test(plain)) return true;
  const emDash = plain.match(/^(.+?)\s+[—–-]\s+(.+)$/);
  return Boolean(emDash && DATE_RANGE.test(emDash[2]));
}

function isCompanyLine(trimmed: string): boolean {
  const plain = stripMd(trimmed);
  if (isRoleLine(trimmed)) return false;
  const emDash = plain.match(/^(.+?)\s+[—–-]\s+(.+)$/);
  if (!emDash) return false;
  const tail = emDash[2];
  if (LOCATION_TAIL.test(tail)) return true;
  if (/,\s*[A-Za-z][A-Za-z\s]{2,}$/.test(tail)) return true;
  if (COMPANY_MARKERS.test(emDash[1])) return true;
  if (UNIVERSITY_KEYWORDS.test(emDash[1])) return true;
  return false;
}

function looksLikeJobTitle(line: string): boolean {
  const plain = stripMd(line);
  return (
    /engineer|analyst|developer|manager|architect|consultant|specialist|lead|director|intern|crm|security/i.test(
      plain,
    ) || DATE_IN_PARENS.test(plain)
  );
}

/** Bold the role/org lead-in on leadership bullets. */
function normalizeLeadershipEntries(md: string): string {
  const lines = md.replace(/\r/g, "").split("\n");
  let inLeadership = false;
  return lines
    .map((raw) => {
      const trimmed = raw.trim();
      if (/^##\s+/.test(trimmed)) {
        inLeadership = isLeadershipTitle(
          trimmed.replace(/^##\s+/, "").trim(),
        );
        return raw;
      }
      if (!inLeadership || !/^[-*]\s+/.test(trimmed)) return raw;
      const item = trimmed.replace(/^[-*]\s+/, "");
      if (/^\*\*/.test(item)) return raw;
      const m = item.match(/^(.+?)\s+[—–-]\s+(.+)$/);
      if (!m) return raw;
      const lead = m[1].trim();
      if (!lead || lead.length > 90) return raw;
      return `- **${lead}** — ${m[2].trim()}`;
    })
    .join("\n");
}

/** Move company lines that appear after bullets to directly above the role. */
function reorderExperienceEntries(md: string): string {
  const lines = md.replace(/\r/g, "").split("\n");
  let section = "";
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (/^##\s+/.test(trimmed)) {
      section = trimmed.replace(/^##\s+/, "").trim();
      out.push(line);
      i++;
      continue;
    }

    if (!EXP_SECTIONS.test(section)) {
      out.push(line);
      i++;
      continue;
    }

    if (!trimmed) {
      out.push(line);
      i++;
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      out.push(line);
      i++;
      continue;
    }

    let company: string | null = null;
    let role: string | null = null;
    const bullets: string[] = [];
    let j = i;

    const first = lines[j]?.trim() ?? "";
    if (first && isCompanyLine(first) && !looksLikeJobTitle(first)) {
      company = lines[j];
      j++;
    }

    const roleCandidate = lines[j]?.trim() ?? "";
    if (
      roleCandidate &&
      !/^[-*]/.test(roleCandidate) &&
      !/^##/.test(roleCandidate) &&
      (isRoleLine(roleCandidate) ||
        looksLikeJobTitle(roleCandidate) ||
        /^\*\*/.test(roleCandidate))
    ) {
      role = lines[j];
      j++;
    }

    while (j < lines.length && /^[-*]\s+/.test(lines[j].trim())) {
      bullets.push(lines[j]);
      j++;
    }

    const trailing = lines[j]?.trim() ?? "";
    if (
      trailing &&
      !/^##/.test(trailing) &&
      isCompanyLine(trailing) &&
      !looksLikeJobTitle(trailing)
    ) {
      if (!company) company = lines[j];
      j++;
    }

    if (role || company) {
      if (company) out.push(company);
      if (role) out.push(role);
      out.push(...bullets);
      i = j;
      continue;
    }

    out.push(line);
    i++;
  }

  return out.join("\n");
}

const SKILL_ACRONYMS: Record<string, string> = {
  "ci/cd": "CI/CD",
  sdlc: "SDLC",
  sast: "SAST",
  dast: "DAST",
  api: "API",
  apis: "APIs",
  pki: "PKI",
  tls: "TLS",
  owasp: "OWASP",
  "c++": "C++",
  "c#": "C#",
  javascript: "JavaScript",
  typescript: "TypeScript",
  sonarqube: "SonarQube",
  github: "GitHub",
  aws: "AWS",
  gcp: "GCP",
  iam: "IAM",
  rbac: "RBAC",
  sql: "SQL",
  nosql: "NoSQL",
  rest: "REST",
  "rest apis": "REST APIs",
  graphql: "GraphQL",
  html: "HTML",
  css: "CSS",
  jwt: "JWT",
  oauth: "OAuth",
  saas: "SaaS",
  paas: "PaaS",
  ios: "iOS",
  ml: "ML",
  ai: "AI",
  mysql: "MySQL",
  mongodb: "MongoDB",
  dynamodb: "DynamoDB",
  postgresql: "PostgreSQL",
  postgres: "PostgreSQL",
  ddd: "DDD",
  "domain-driven": "Domain-Driven",
  "domain-driven design": "Domain-Driven Design",
  "domain-driven design (ddd)": "Domain-Driven Design (DDD)",
  kafka: "Kafka",
  redis: "Redis",
  kubernetes: "Kubernetes",
};

function titleCaseSkill(skill: string): string {
  const trimmed = skill.trim();
  if (!trimmed) return trimmed;

  const fullKey = trimmed.toLowerCase();
  if (SKILL_ACRONYMS[fullKey]) return SKILL_ACRONYMS[fullKey];

  return trimmed
    .split(/\s+/)
    .map((word) => {
      const key = word.toLowerCase();
      if (SKILL_ACRONYMS[key]) return SKILL_ACRONYMS[key];
      // Preserve Domain-Driven style hyphenated tokens
      if (word.includes("-")) {
        return word
          .split("-")
          .map((p) => {
            const k = p.toLowerCase();
            return (
              SKILL_ACRONYMS[k] ??
              p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()
            );
          })
          .join("-");
      }
      if (/^[A-Z0-9+/#.]{2,}$/.test(word)) return word;
      if (word.includes("/")) {
        return word
          .split("/")
          .map((p) => {
            const k = p.toLowerCase();
            return SKILL_ACRONYMS[k] ?? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
          })
          .join("/");
      }
      // Keep parenthetical acronyms: (DDD)
      const paren = word.match(/^\((.+)\)$/);
      if (paren) {
        const inner = paren[1];
        const k = inner.toLowerCase();
        return `(${SKILL_ACRONYMS[k] ?? inner.toUpperCase()})`;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

const SKILL_CATEGORY_ORDER = [
  "Programming Languages",
  "Tech Stack",
  "System Design",
  "Cloud and Devops",
  "Data & Messaging",
  "Tools",
  "Certifications",
  "Skills",
] as const;

type SkillCategory = (typeof SKILL_CATEGORY_ORDER)[number];

/** Keyword → category for auto-grouping flat skill lists. */
const SKILL_CATEGORY_RULES: { category: SkillCategory; patterns: RegExp[] }[] = [
  {
    category: "Programming Languages",
    patterns: [
      /^(advanced\s+)?(java|python|javascript|typescript|go|golang|rust|c\+\+|c#|ruby|php|swift|kotlin|scala|r|matlab|bash|shell|sql)$/i,
    ],
  },
  {
    category: "Certifications",
    patterns: [
      /\b(certified|certification|practitioner|associate|professional|cka|ckad|pmp|cissp|comptia|scrum master)\b/i,
    ],
  },
  {
    category: "System Design",
    patterns: [
      /\b(microservice|microservices|domain-driven|ddd|event-driven|design pattern|system design|distributed system|scalability|high availability|architecture)\b/i,
    ],
  },
  {
    category: "Cloud and Devops",
    patterns: [
      /\b(kubernetes|k8s|aws|amazon web services|gcp|google cloud|azure|terraform|jenkins|github actions|gitlab ci|ci\/?cd|docker|devops|ansible|helm|prometheus|grafana|cloudformation|pulumi|lambda|ecs|eks|ec2)\b/i,
      /^(github|gitlab|bitbucket)$/i,
    ],
  },
  {
    category: "Data & Messaging",
    patterns: [
      /\b(mysql|postgres|postgresql|mongodb|dynamodb|redis|cassandra|elasticsearch|kafka|rabbitmq|sqs|pubsub|spark|hadoop|snowflake|bigquery|data warehouse|messaging)\b/i,
    ],
  },
  {
    category: "Tech Stack",
    patterns: [
      /\b(spring|hibernate|react|angular|vue|next\.?js|node\.?js|express|django|flask|fastapi|rails|\.net|rest(\s*apis?)?|graphql|grpc|nestjs|laravel)\b/i,
    ],
  },
];

function categorizeSkill(skill: string): SkillCategory {
  const s = skill.trim();
  if (!s) return "Skills";
  for (const rule of SKILL_CATEGORY_RULES) {
    if (rule.patterns.some((re) => re.test(s))) return rule.category;
  }
  if (/\b(api|framework|library|sdk|orm)\b/i.test(s)) return "Tech Stack";
  return "Tech Stack";
}

function formatSkillCategoryLines(skills: string[]): string[] {
  const buckets = new Map<SkillCategory, string[]>();
  const seen = new Set<string>();

  for (const raw of skills) {
    const skill = titleCaseSkill(raw);
    if (!skill) continue;
    const key = skill.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const cat = categorizeSkill(skill);
    const list = buckets.get(cat) ?? [];
    list.push(skill);
    buckets.set(cat, list);
  }

  // Fold generic "Skills" leftovers into Tech Stack
  const leftovers = buckets.get("Skills");
  if (leftovers?.length) {
    const tech = buckets.get("Tech Stack") ?? [];
    tech.push(...leftovers);
    buckets.set("Tech Stack", tech);
    buckets.delete("Skills");
  }

  const lines: string[] = [];
  for (const cat of SKILL_CATEGORY_ORDER) {
    if (cat === "Skills") continue;
    const items = buckets.get(cat);
    if (!items?.length) continue;
    lines.push(`**${cat}:** ${items.join(", ")}`);
  }
  return lines;
}

function normalizeSkillLabel(label: string): string {
  return label
    .replace(/\*+/g, "")
    .replace(/:+/g, "")
    .trim()
    .replace(/\bdevops\b/i, "Devops");
}

/** Convert comma/bullet skills into category lines: **Label:** a, b, c */
function normalizeSkillsLists(md: string): string {
  const lines = md.replace(/\r/g, "").split("\n");
  let inSkills = false;
  const out: string[] = [];
  const pendingBullets: string[] = [];
  const pendingCategories: { label: string; items: string[] }[] = [];

  const flushBullets = () => {
    if (!pendingBullets.length) return;
    const skills = pendingBullets.map(titleCaseSkill).filter(Boolean);
    pendingBullets.length = 0;
    out.push(...formatSkillCategoryLines(skills));
  };

  const flushCategories = () => {
    if (!pendingCategories.length) return;
    for (const cat of pendingCategories) {
      const label = normalizeSkillLabel(cat.label);
      const body = cat.items.filter(Boolean).join(", ");
      if (label && body) out.push(`**${label}:** ${body}`);
    }
    pendingCategories.length = 0;
  };

  const parseSkillItems = (body: string): string[] =>
    body
      .replace(/^\*+\s*/, "")
      .split(/,\s*/)
      .map((p) =>
        titleCaseSkill(
          p
            .trim()
            .replace(/^:+\s*/, "")
            .replace(/\.\s*$/, "")
            .replace(
              /^(Proficient in|Expertise in|Skilled in|Experienced with|Certified in|Deep knowledge of)\s+/i,
              "",
            ),
        ),
      )
      .filter(Boolean);

  for (const raw of lines) {
    const trimmed = raw.trim();

    if (/^##\s+/.test(trimmed)) {
      flushBullets();
      flushCategories();
      const title = trimmed.replace(/^##\s+/, "").trim();
      inSkills = SKILLS_SECTIONS.test(title);
      if (out.length && out[out.length - 1].trim() !== "") out.push("");
      if (inSkills) {
        out.push("## TECHNICAL SKILLS");
      } else {
        out.push(raw);
      }
      continue;
    }

    if (!inSkills) {
      out.push(raw);
      continue;
    }

    if (!trimmed) {
      flushBullets();
      flushCategories();
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const item = trimmed.replace(/^[-*]\s+/, "").trim();
      const bulletLabeled = item.match(
        /^(?:\*\*)?([^:*]+?)(?:\*\*)?\s*:\s*:?\s*(.+)$/,
      );
      if (
        bulletLabeled &&
        /[A-Za-z]/.test(bulletLabeled[1]) &&
        bulletLabeled[2].trim()
      ) {
        flushBullets();
        pendingCategories.push({
          label: normalizeSkillLabel(bulletLabeled[1]),
          items: parseSkillItems(bulletLabeled[2]),
        });
        continue;
      }
      if (item.includes(",") && item.split(",").length >= 3) {
        for (const part of item.split(",")) {
          const s = titleCaseSkill(part);
          if (s) pendingBullets.push(s);
        }
      } else {
        const s = titleCaseSkill(item);
        if (s) pendingBullets.push(s);
      }
      continue;
    }

    // Category line: **Label:** items (tolerate accidental ::)
    const labeled = trimmed.match(
      /^(?:\*\*)?([^:*]+?)(?:\*\*)?\s*:\s*:?\s*(.+)$/,
    );
    if (labeled) {
      flushBullets();
      const label = normalizeSkillLabel(labeled[1]);
      // Re-categorize generic "Skills:" dumps
      if (/^(skills|technical skills|core skills|key skills)$/i.test(label)) {
        pendingBullets.push(...parseSkillItems(labeled[2]));
        continue;
      }
      pendingCategories.push({
        label,
        items: parseSkillItems(labeled[2]),
      });
      continue;
    }

    if (trimmed.includes(",")) {
      for (const part of trimmed.split(",")) {
        const s = titleCaseSkill(part);
        if (s) pendingBullets.push(s);
      }
    } else {
      pendingBullets.push(titleCaseSkill(trimmed));
    }
  }

  flushBullets();
  flushCategories();
  return out.join("\n");
}

function boldCompanyLine(line: string): string {
  const trimmed = line.trim();
  if (/^\*\*/.test(trimmed)) return line;
  return `**${stripMd(trimmed)}**`;
}

/**
 * Convert stacked/legacy headers into the default Tailor layout:
 *   **Title | Company** | dates | Location
 *   **Project** | dates (or link)
 *   **Degree** | dates | School
 */
export function toSplitEntryLayout(md: string): string {
  const lines = md.replace(/\r/g, "").split("\n");
  let section = "";
  const out: string[] = [];
  let i = 0;

  const splitPipe = (
    line: string,
  ): { left: string; right: string } | null => {
    let depth = 0;
    for (let idx = 0; idx < line.length - 2; idx++) {
      const ch = line[idx];
      if (ch === "[") depth++;
      else if (ch === "]") depth = Math.max(0, depth - 1);
      else if (depth === 0 && line.slice(idx, idx + 3) === " | ") {
        return {
          left: line.slice(0, idx).trim(),
          right: line.slice(idx + 3).trim(),
        };
      }
    }
    return null;
  };

  const looksLikeDates = (s: string): boolean =>
    DATE_RANGE.test(s) ||
    /\b(19|20)\d{2}\b/.test(s) ||
    /present/i.test(s);

  const formatExperienceHeader = (
    title: string,
    company: string,
    dates: string,
    location: string,
  ): string => {
    const left = [title && `**${title}**`, company && `**${company}**`]
      .filter(Boolean)
      .join(" | ");
    const right = [dates, location].filter(Boolean).join(" | ");
    if (!left) return "";
    return right ? `${left} | ${right}` : left;
  };

  const pipeParts = (line: string): string[] => {
    const parts: string[] = [];
    let depth = 0;
    let start = 0;
    for (let idx = 0; idx < line.length; idx++) {
      const ch = line[idx];
      if (ch === "[") depth++;
      else if (ch === "]") depth = Math.max(0, depth - 1);
      else if (depth === 0 && line.slice(idx, idx + 3) === " | ") {
        parts.push(line.slice(start, idx).trim());
        start = idx + 3;
        idx += 2;
      }
    }
    parts.push(line.slice(start).trim());
    return parts.filter(Boolean);
  };

  const isTitleCompanyLine = (line: string): boolean => {
    const parts = pipeParts(line);
    if (parts.length >= 3 && looksLikeJobTitle(stripMd(parts[0]))) return true;
    const sides = splitPipe(stripMd(line));
    if (!sides) return false;
    return (
      sides.left.includes("|") &&
      looksLikeJobTitle(sides.left.split("|")[0] ?? "")
    );
  };

  const isNehaCompanyRow = (line: string): boolean => {
    const sides = splitPipe(line);
    if (!sides) return false;
    const left = stripMd(sides.left);
    if (left.includes("|")) return false;
    return looksLikeDates(stripMd(sides.right)) && !looksLikeJobTitle(left);
  };

  while (i < lines.length) {
    const raw = lines[i];
    const trimmed = raw.trim();

    if (/^##\s+/.test(trimmed)) {
      section = trimmed.replace(/^##\s+/, "").trim();
      out.push(raw);
      i++;
      continue;
    }

    if (!trimmed || /^[-*]\s/.test(trimmed)) {
      out.push(raw);
      i++;
      continue;
    }

    if (EXP_SECTIONS.test(section)) {
      const next = lines[i + 1]?.trim() ?? "";
      if (isTitleCompanyLine(trimmed)) {
        out.push(raw);
        i++;
        continue;
      }

      if (
        isNehaCompanyRow(trimmed) &&
        next &&
        !/^[-*]\s/.test(next) &&
        !/^##/.test(next)
      ) {
        const companySides = splitPipe(trimmed)!;
        const roleSides = splitPipe(next);
        const company = stripMd(companySides.left);
        const dates = stripMd(companySides.right);
        const title = stripMd(roleSides?.left ?? next).replace(/^\*+|\*+$/g, "");
        const location = stripMd(roleSides?.right ?? "");
        const header = formatExperienceHeader(title, company, dates, location);
        if (header) out.push(header);
        i += 2;
        continue;
      }

      const companyLike =
        isCompanyLine(trimmed) ||
        (/^\*\*/.test(trimmed) &&
          !DATE_IN_PARENS.test(stripMd(trimmed)) &&
          !DATE_RANGE.test(stripMd(trimmed)) &&
          !isRoleLine(trimmed));
      const roleLike =
        next &&
        !/^[-*]\s/.test(next) &&
        !/^##/.test(next) &&
        (isRoleLine(next) ||
          looksLikeJobTitle(next) ||
          /^\*\*/.test(next) ||
          (/^\*[^*]/.test(next) && !/^\*\*/.test(next)));

      if (companyLike && roleLike) {
        const { company, location } = parseCompanyLocation(trimmed);
        const { title, dates } = parseRoleDates(next);
        const header = formatExperienceHeader(title, company, dates, location);
        if (header) out.push(header);
        i += 2;
        continue;
      }

      if (isRoleLine(trimmed) || DATE_IN_PARENS.test(stripMd(trimmed))) {
        const { title, dates } = parseRoleDates(trimmed);
        out.push(dates ? `**${title}** | ${dates}` : `**${title}**`);
        i++;
        continue;
      }
    }

    if (EDUCATION_SECTIONS.test(section)) {
      const next = lines[i + 1]?.trim() ?? "";
      const sides = splitPipe(trimmed);
      const leftPlain = stripMd(sides?.left ?? trimmed);
      if (DEGREE_KEYWORDS.test(leftPlain) && sides) {
        out.push(raw);
        i++;
        continue;
      }
      if (
        next &&
        (isEducationDegreeLine(next) || /^\*\*\*/.test(next) || /^\*\*/.test(next)) &&
        (isEducationSchoolLine(trimmed) || /^\*\*/.test(trimmed))
      ) {
        const schoolPlain = stripMd(trimmed);
        const schoolMatch = schoolPlain.match(/^(.+?)\s+[—–-]\s+(.+)$/);
        const schoolFromPipe = sides ? stripMd(sides.left) : "";
        const school = schoolFromPipe || (schoolMatch ? schoolMatch[1].trim() : schoolPlain);
        const locFromSchool = schoolMatch ? schoolMatch[2].trim() : "";
        const { title: degree, dates } = parseRoleDates(next);
        const datePart = dates || (sides && looksLikeDates(stripMd(sides.right)) ? stripMd(sides.right) : locFromSchool);
        const right = [datePart, school].filter(Boolean).join(" | ");
        const deg = degree.replace(/\*/g, "").trim();
        out.push(right ? `**${deg}** | ${right}` : `**${deg}**`);
        i += 2;
        continue;
      }
    }

    if (PROJECT_SECTIONS.test(section) && !/^[-*]/.test(trimmed)) {
      out.push(toProjectSplitLine(trimmed));
      i++;
      continue;
    }

    out.push(raw);
    i++;
  }

  return out.join("\n");
}

function parseCompanyLocation(line: string): {
  company: string;
  location: string;
} {
  const plain = stripMd(line);
  const m = plain.match(/^(.+?)\s+[—–-]\s+(.+)$/);
  if (m) return { company: m[1].trim(), location: m[2].trim() };
  return { company: plain, location: "" };
}

function parseRoleDates(line: string): { title: string; dates: string } {
  const trimmed = line.trim();
  // **Title** *(dates)*  or  **Title** — *(dates)*
  let m = trimmed.match(
    /^\*\*(.+?)\*\*\s*(?:[—–-]\s*)?\*\(?([^)*]+)\)?\*/,
  );
  if (m) {
    return {
      title: m[1].trim(),
      dates: m[2].replace(/^\(|\)$/g, "").trim(),
    };
  }
  // **Title** (dates)
  m = trimmed.match(/^\*\*(.+?)\*\*\s*\(([^)]+)\)\s*$/);
  if (m) {
    return { title: m[1].trim(), dates: m[2].trim() };
  }
  // **Title** | dates (already partial)
  m = trimmed.match(/^\*\*(.+?)\*\*\s*\|\s*(.+)$/);
  if (m) {
    return { title: m[1].trim(), dates: m[2].trim() };
  }
  // *Title* | dates (already partial)
  m = trimmed.match(/^\*(.+?)\*\s*\|\s*(.+)$/);
  if (m) {
    return { title: m[1].trim(), dates: m[2].trim() };
  }
  // Title (dates)
  const plain = stripMd(trimmed);
  const paren = plain.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (paren && /\d{4}|Present/i.test(paren[2])) {
    return { title: paren[1].trim(), dates: paren[2].trim() };
  }
  const dash = plain.match(/^(.+?)\s+[—–-]\s+(.+)$/);
  if (dash && DATE_RANGE.test(dash[2])) {
    return { title: dash[1].trim(), dates: dash[2].trim() };
  }
  return { title: plain.replace(/^\*+|\*+$/g, "").trim(), dates: "" };
}

function toProjectSplitLine(line: string): string {
  const trimmed = line.trim();
  if (/^\*\*[^*]+\*\*\s*\|/.test(trimmed) && !/\]\s*\|/.test(trimmed)) {
    // Already **Name** | right
    return trimmed;
  }

  // Extract first markdown link as the right-side "Github Link" / link
  const linkMatch = trimmed.match(/\[([^\]]+)\]\(([^)]+)\)/);
  const url = linkMatch?.[2] ?? "";
  // Name: from **[Name](url)** or **Name** or [Name](url)
  let name = "";
  const boldLink = trimmed.match(/^\*\*\[([^\]]+)\]\([^)]+\)\*\*/);
  const boldName = trimmed.match(/^\*\*([^*|\]]+?)\*\*/);
  const plainLink = trimmed.match(/^\[([^\]]+)\]\([^)]+\)/);
  if (boldLink) name = boldLink[1].trim();
  else if (boldName) name = boldName[1].replace(/\[|\]/g, "").trim();
  else if (plainLink) name = plainLink[1].trim();
  else name = stripMd(trimmed.split(/[|—–-]/)[0] ?? "").trim();

  // Drop trailing dates from name
  name = name
    .replace(/\s*[—–-]\s*\*?.*$/, "")
    .replace(/\s*\([^)]*\d{4}[^)]*\)\s*$/, "")
    .trim();

  if (url) {
    const label = /github/i.test(url) ? "Github Link" : "Link";
    return `**${name}** | [${label}](${url})`;
  }
  return `**${name}**`;
}

/** Wrap a plain job-title line in bold; italicize the date portion. */
function boldRoleLine(line: string): string {
  const trimmed = line.trim();
  // Re-normalize already-bolded headers so orphan pipes / mixed separators clean up.
  if (/^\*\*/.test(trimmed)) {
    return boldProjectHeaderLine(trimmed);
  }

  const paren = trimmed.match(/^(.+?)\s+(\([^)]+\))\s*$/);
  if (paren && DATE_IN_PARENS.test(paren[2])) {
    const date = paren[2].replace(/^\(|\)$/g, "");
    return `**${paren[1].trim()}** — *(${date})*`;
  }

  const emDash = trimmed.match(/^(.+?)\s+[—–-]\s+(.+)$/);
  if (emDash && DATE_RANGE.test(emDash[2])) {
    return `**${emDash[1].trim()}** — *(${emDash[2].trim()})*`;
  }

  if (DATE_IN_PARENS.test(trimmed)) {
    const idx = trimmed.lastIndexOf("(");
    const date = trimmed.slice(idx).replace(/^\(|\)$/g, "");
    return `**${trimmed.slice(0, idx).trim()}** — *(${date})*`;
  }

  return `**${trimmed}**`;
}

/** Normalize experience titles and project header layout for consistent rendering. */
export function normalizeResumeEntries(md: string): string {
  const lines = md.replace(/\r/g, "").split("\n");
  let section = "";
  let afterCompany = false;

  const out = lines.map((raw) => {
    const trimmed = raw.trim();

    if (/^##\s+/.test(trimmed)) {
      section = trimmed.replace(/^##\s+/, "").trim();
      afterCompany = false;
      return raw;
    }

    if (!trimmed) {
      afterCompany = false;
      return raw;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      afterCompany = false;
      return raw;
    }

    if (EXP_SECTIONS.test(section)) {
      if (isDatesOnlyLine(trimmed)) return raw;

      if (isRoleLine(trimmed)) {
        afterCompany = false;
        return boldRoleLine(raw);
      }
      if (isCompanyLine(trimmed)) {
        afterCompany = true;
        return boldCompanyLine(raw);
      }

      const isBold = /^\*\*/.test(trimmed);
      if (isBold && afterCompany) {
        afterCompany = false;
        return boldRoleLine(raw);
      }
      if (isBold) {
        afterCompany = true;
        return raw;
      }
      if (afterCompany) {
        afterCompany = false;
        return boldRoleLine(raw);
      }
      // Role at same company without repeating company header (stacked titles).
      if (
        !isCompanyLine(trimmed) &&
        !/^[-*]/.test(trimmed) &&
        (DEGREE_KEYWORDS.test(stripMd(trimmed)) === false)
      ) {
        const looksLikeTitle = looksLikeJobTitle(trimmed);
        if (looksLikeTitle) {
          afterCompany = false;
          return boldRoleLine(raw);
        }
      }
    }

    return raw;
  });

  return out.join("\n");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inline(s: string): string {
  let out = escapeHtml(s);
  // Bold markdown links: **[label](url)**
  out = out.replace(
    /\*\*\[(.+?)\]\((.+?)\)\*\*/g,
    '<strong><a href="$2">$1</a></strong>',
  );
  out = out
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Bare URLs → links.
    .replace(
      /(^|[\s|(])((https?:\/\/|www\.)[^\s)|]+)/g,
      (_m, pre, url) =>
        `${pre}<a href="${url.startsWith("http") ? url : `https://${url}`}">${url}</a>`,
    );
  return out;
}

const CLOSING_RE =
  /^(sincerely|best regards|warm regards|respectfully|kind regards|thank you|yours truly),?\.?$/i;

const DATE_LINE_RE =
  /^\[?date\]?$|^(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}$/i;

export type DocumentKind = "resume" | "cover" | "auto";

/** Heuristic: business letter vs. resume markdown. */
export function isCoverLetter(md: string): boolean {
  const t = md.toLowerCase();
  return (
    /dear\s+/.test(t) &&
    !/^##\s+(work experience|projects|core skills|experience|professional summary|technical skills|professional experience)/m.test(md)
  );
}

function headerLineClass(line: string, index: number, lines: string[]): string {
  const t = line.trim();
  if (!t) return "cl-gap";
  if (DATE_LINE_RE.test(t.replace(/[\[\]]/g, ""))) return "cl-date";
  if (
    index === 0 ||
    (index <= 1 && !/@|\|/.test(t) && !DATE_LINE_RE.test(t))
  ) {
    const next = lines[index + 1]?.trim() ?? "";
    if (index === 0 && (/@|\|/.test(next) || /dear\s/i.test(next))) {
      return "cl-sender-name";
    }
  }
  if (/@|\|/.test(t) || /linkedin|portfolio/i.test(t)) return "cl-sender-contact";
  if (/^\[.+\]$/.test(t)) return "cl-muted";
  return "cl-address-line";
}

/** Render a cover letter with semantic blocks for print-quality spacing. */
export function mdToCoverLetterHtml(md: string): string {
  const lines = md.replace(/\r/g, "").split("\n");
  const dearIdx = lines.findIndex((l) => /^dear\s+/i.test(l.trim()));
  if (dearIdx < 0) return mdToResumeHtml(md);

  let closingIdx = -1;
  for (let i = dearIdx + 1; i < lines.length; i++) {
    if (CLOSING_RE.test(lines[i].trim())) {
      closingIdx = i;
      break;
    }
  }

  const html: string[] = ['<div class="cl-page">'];

  const headerLines = lines.slice(0, dearIdx);
  if (headerLines.some((l) => l.trim())) {
    html.push('<div class="cl-header">');
    for (let i = 0; i < headerLines.length; i++) {
      const t = headerLines[i].trim();
      if (!t) {
        html.push('<div class="cl-gap"></div>');
        continue;
      }
      const cls = headerLineClass(t, i, headerLines);
      html.push(`<p class="${cls}">${inline(t)}</p>`);
    }
    html.push("</div>");
  }

  html.push(
    `<p class="cl-salutation">${inline(lines[dearIdx].trim())}</p>`,
  );
  html.push('<div class="cl-bodies">');

  const bodyEnd = closingIdx > 0 ? closingIdx : lines.length;
  for (let i = dearIdx + 1; i < bodyEnd; i++) {
    const t = lines[i].trim();
    if (!t) continue;
    html.push(`<p class="cl-body">${inline(t)}</p>`);
  }
  html.push("</div>");

  if (closingIdx > 0) {
    html.push('<div class="cl-footer">');
    html.push(
      `<p class="cl-closing">${inline(lines[closingIdx].trim())}</p>`,
    );
    let sigIdx = 0;
    for (let i = closingIdx + 1; i < lines.length; i++) {
      const t = lines[i].trim();
      if (!t) continue;
      const cls = sigIdx === 0 ? "cl-signature" : "cl-contact";
      html.push(`<p class="${cls}">${inline(t)}</p>`);
      sigIdx++;
    }
    html.push("</div>");
  }

  html.push("</div>");
  return html.join("\n");
}

/**
 * If a resume was saved without newlines, split headings back out so preview
 * still stacks as a document instead of one contact row.
 */
function restoreResumeNewlines(md: string): string {
  let out = md.replace(/\r/g, "");
  const headingCount = (out.match(/^#{1,3}\s/gm) ?? []).length;
  const newlineCount = (out.match(/\n/g) ?? []).length;
  if (headingCount >= 3 && newlineCount >= headingCount + 3) return out;
  if (!/#{1,3}\s/.test(out)) return out;

  out = out.replace(/[ \t]+(#{1,3}\s+)/g, "\n$1");

  const sectionTitle =
    /^(#{1,3}\s+)(PROFESSIONAL SUMMARY|TECHNICAL SKILLS|CORE SKILLS|KEY SKILLS|SKILLS AND CERTIFICATIONS|CORE SECURITY COMPETENCIES|PROFESSIONAL EXPERIENCE(?:\s*\([^)]*\))?|WORK EXPERIENCE|EXPERIENCE|PROJECTS|SELECTED PROJECTS|LEADERSHIP(?:\s*&\s*AFFILIATIONS)?|EDUCATION)(?=\s+\S)/gim;
  out = out.replace(sectionTitle, "$1$2\n");

  out = out.replace(
    /^(#\s+)([A-Z][A-Z.'-]+(?:\s+[A-Z][A-Z.'-]+){0,3})(?=\s+[A-Za-z0-9])/,
    "$1$2\n",
  );

  return out;
}

/** Resume-specific Markdown → HTML (headings, lists, bold/italic, links). */
function mdToResumeHtml(md: string): string {
  const lines = restoreResumeNewlines(md).replace(/\r/g, "").split("\n");
  const html: string[] = [];
  let inList = false;
  let listItems: string[] = [];
  let section = "";
  /** First body line after H1 is the contact bar. */
  let expectContactLine = false;
  let expectHeadlineOrContact = false;
  /** In experience: idle → after company line, expecting job title. */
  let expPhase: "idle" | "after-company" = "idle";

  const closeList = () => {
    if (!inList) return;
    html.push(`<ul>`);
    html.push(...listItems);
    html.push("</ul>");
    inList = false;
    listItems = [];
  };

  const pushEntryRow = (cls: string, left: string, right: string) => {
    if (right) {
      html.push(
        `<p class="entry-row ${cls}"><span class="entry-left">${inline(left)}</span><span class="entry-right">${inline(right)}</span></p>`,
      );
    } else {
      html.push(`<p class="${cls}">${inline(left)}</p>`);
    }
  };

  const splitSides = (
    line: string,
  ): { left: string; right: string } | null => {
    const parts: string[] = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === "[") depth++;
      else if (ch === "]") depth = Math.max(0, depth - 1);
      else if (depth === 0 && line.slice(i, i + 3) === " | ") {
        parts.push(line.slice(start, i).trim());
        start = i + 3;
        i += 2;
      }
    }
    parts.push(line.slice(start).trim());
    if (parts.length < 2) return null;

    const looksRight = (s: string) =>
      DATE_RANGE.test(stripMd(s)) ||
      /\b(19|20)\d{2}\b/.test(s) ||
      /present/i.test(s) ||
      LOCATION_TAIL.test(stripMd(s));

    if (parts.length >= 4) {
      return {
        left: `${parts[0]} | ${parts[1]}`,
        right: parts.slice(2).join(" | "),
      };
    }
    if (parts.length === 3) {
      if (looksRight(parts[1])) {
        return { left: parts[0], right: `${parts[1]} | ${parts[2]}` };
      }
      return { left: `${parts[0]} | ${parts[1]}`, right: parts[2] };
    }
    return { left: parts[0], right: parts[1] };
  };

  const paragraphClass = (line: string): string => {
    const trimmed = line.trim();
    const isBold = /^\*\*/.test(trimmed);
    const isItalicOnly = /^\*[^*]/.test(trimmed) && !/^\*\*/.test(trimmed);
    const plain = stripMd(trimmed);
    const inExperience = EXP_SECTIONS.test(section);
    const inProjects = PROJECT_SECTIONS.test(section);
    const inEducation = EDUCATION_SECTIONS.test(section);
    const inSkills = SKILLS_SECTIONS.test(section);

    if (inSkills && /:\s*/.test(trimmed)) return "skill-row";

    if (inProjects && (isBold || /\[.+?\]\(.+?\)/.test(trimmed))) {
      return "entry-project";
    }

    if (inEducation) {
      if (/^grade\s*:/i.test(plain)) return "entry-grade";
      if (/^\*\*\*/.test(trimmed)) return "entry-degree";
      if (isBold) return "entry-school";
    }

    if (inExperience) {
      if (isItalicOnly || (expPhase === "after-company" && (isBold || isItalicOnly))) {
        expPhase = "idle";
        return "entry-role";
      }
      if (isBold) {
        expPhase = "after-company";
        return "entry-company";
      }
      if (expPhase === "after-company") {
        expPhase = "idle";
        return "entry-role";
      }
    }

    if (isBold) return "entry";
    return "";
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
      closeList();
      continue;
    }
    if (/^#{1,6}\s/.test(line)) {
      closeList();
      const level = line.match(/^#+/)![0].length;
      const heading = line.replace(/^#+\s+/, "");
      if (level === 3 && EXP_SECTIONS.test(section)) {
        expectContactLine = false;
        expectHeadlineOrContact = false;
        expPhase = "after-company";
        html.push(`<p class="entry-company">${inline(heading)}</p>`);
      } else {
        expPhase = "idle";
        section = heading.trim();
        expectHeadlineOrContact = level === 1;
        expectContactLine = false;
        html.push(`<h${level}>${inline(heading)}</h${level}>`);
      }
    } else if (/^[-*]\s+/.test(line)) {
      expPhase = "idle";
      inList = true;
      listItems.push(`<li>${inline(line.replace(/^[-*]\s+/, ""))}</li>`);
    } else if (line.trim() === "") {
      closeList();
      expPhase = "idle";
    } else {
      closeList();
      const trimmed = line.trim();
      if (expectHeadlineOrContact) {
        expectHeadlineOrContact = false;
        if (looksLikeContactLine(trimmed)) {
          html.push(contactLineHtml(trimmed));
        } else {
          html.push(`<p class="headline">${inline(trimmed)}</p>`);
          expectContactLine = true;
        }
        continue;
      }
      if (expectContactLine) {
        html.push(contactLineHtml(trimmed));
        expectContactLine = false;
        continue;
      }
      const sides = splitSides(trimmed);
      let cls = paragraphClass(trimmed);
      if (
        sides &&
        (cls === "entry-company" ||
          cls === "entry-role" ||
          cls === "entry-school" ||
          cls === "entry-project" ||
          cls === "entry")
      ) {
        pushEntryRow(cls, sides.left, sides.right);
      } else {
        html.push(
          `<p${cls ? ` class="${cls}"` : ""}>${inline(trimmed)}</p>`,
        );
      }
    }
  }
  closeList();
  return html.join("\n");
}

const CONTACT_ICON = {
  phone:
    '<svg class="ci-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.2 1.2.4 2.5.6 3.8.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.6.6 3.8.1.4 0 .8-.3 1.1L6.6 10.8z"/></svg>',
  email:
    '<svg class="ci-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"/></svg>',
  linkedin:
    '<svg class="ci-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6.94 6.5A1.94 1.94 0 1 1 5 4.56 1.94 1.94 0 0 1 6.94 6.5zM5.25 8.75h3.38V19H5.25zm5.63 0h3.24v1.4h.05a3.55 3.55 0 0 1 3.2-1.76c3.42 0 4.05 2.25 4.05 5.18V19h-3.38v-4.66c0-1.11 0-2.54-1.55-2.54s-1.78.1-1.78 2.48V19h-3.38z"/></svg>',
  github:
    '<svg class="ci-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2C6.48 2 2 6.58 2 12.26c0 4.52 2.87 8.35 6.84 9.71.5.1.68-.22.68-.49 0-.24-.01-.87-.01-1.71-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.73 0 0 .84-.27 2.75 1.05A9.2 9.2 0 0 1 12 6.84c.85 0 1.71.12 2.51.35 1.9-1.32 2.74-1.05 2.74-1.05.55 1.42.21 2.47.1 2.73.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.6.69.49A10.03 10.03 0 0 0 22 12.26C22 6.58 17.52 2 12 2z"/></svg>',
  location:
    '<svg class="ci-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"/></svg>',
} as const;

function contactLineHtml(line: string): string {
  const parts = line
    .split(/\s*[|•]\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  const items: string[] = [];
  for (const part of parts) {
    let icon = "";
    let body = inline(part);
    if (/linkedin/i.test(part)) icon = CONTACT_ICON.linkedin;
    else if (/github/i.test(part)) icon = CONTACT_ICON.github;
    else if (/portfolio|website/i.test(part)) icon = CONTACT_ICON.location;
    else if (/@/.test(part)) icon = CONTACT_ICON.email;
    else if (/\d{3}/.test(part) && !/\[/.test(part)) icon = CONTACT_ICON.phone;
    else if (!/\[/.test(part)) icon = CONTACT_ICON.location;
    items.push(
      `<span class="contact-item">${icon}<span class="contact-text">${body}</span></span>`,
    );
  }
  return `<p class="contact-line">${items.join('<span class="contact-sep" aria-hidden="true">·</span>')}</p>`;
}

/** Convert markdown to HTML; auto-detects cover letters unless kind is set. */
export function mdToHtml(
  md: string,
  opts?: { coverLetter?: boolean; kind?: DocumentKind },
): string {
  const asCover =
    opts?.kind === "cover" ||
    (opts?.kind !== "resume" &&
      (opts?.coverLetter === true || isCoverLetter(md)));
  if (asCover) return mdToCoverLetterHtml(md);
  return mdToResumeHtml(md);
}

/** Wrap rendered markdown in a full, print-optimized HTML document. */
export function documentHtml(
  md: string,
  title: string,
  kind: DocumentKind = "auto",
): string {
  const asCover =
    kind === "cover" || (kind === "auto" && isCoverLetter(md));
  if (asCover) return coverLetterDocumentHtml(md, title);
  return resumeDocumentHtml(md, title);
}

const RESUME_FONT_LINK =
  "https://fonts.googleapis.com/css2?family=Carlito:ital,wght@0,400;0,700;1,400;1,700&display=swap";

const DOCUMENT_BASE_CSS = `
  @page { margin: 0.42in 0.5in 0.48in; size: letter; }
  * { box-sizing: border-box; }
  body {
    font-family: Calibri, Carlito, "Segoe UI", sans-serif;
    color: #000000;
    line-height: 1.26;
    margin: 0;
    padding: 0;
    font-size: 11pt;
    font-weight: 400;
    -webkit-font-smoothing: auto;
    -moz-osx-font-smoothing: auto;
    text-rendering: geometricPrecision;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  body, body * {
    color: #000000;
  }
  a {
    text-decoration: underline;
    text-underline-offset: 1px;
    font-weight: inherit;
    color: #000000;
  }
  strong { font-weight: 700; font-family: Carlito, Calibri, "Segoe UI", sans-serif; }
`;

const RESUME_PRINT_CSS = `
  ${DOCUMENT_BASE_CSS}
  h1 {
    font-size: 20pt;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    text-align: center;
    margin: 0 0 2px;
    line-height: 1.15;
  }
  p.headline {
    text-align: center;
    font-size: 12pt;
    font-weight: 700;
    font-family: Carlito, Calibri, "Segoe UI", sans-serif;
    color: #000000;
    margin: 0 0 6px;
    letter-spacing: 0.01em;
  }
  p.headline, p.headline * { color: #000000; }
  p.contact-line {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 2px 0;
    margin: 0 0 12px;
    padding-bottom: 0;
    border-bottom: none;
    font-size: 10.5pt;
    font-weight: 400;
    line-height: 1.35;
    text-align: center;
  }
  p.contact-line a { text-decoration: underline; text-underline-offset: 1px; }
  .contact-item {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    white-space: nowrap;
  }
  .contact-sep {
    display: inline-block;
    margin: 0 8px;
    color: #000000;
  }
  .ci-icon {
    width: 13px;
    height: 13px;
    flex-shrink: 0;
    display: inline-block;
    vertical-align: -1px;
  }
  h2 {
    font-size: 12pt;
    font-weight: 700;
    font-family: Carlito, Calibri, "Segoe UI", sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #000000;
    border-bottom: 1.25px solid #000000;
    padding-bottom: 2px;
    margin: 12px 0 6px;
    break-after: avoid;
    page-break-after: avoid;
  }
  h2, h2 * { color: #000000; }
  h2:first-of-type { margin-top: 4px; }
  h2 + p,
  h2 + ul { margin-top: 4px; }
  h3 { font-size: 11pt; margin: 6px 0 2px; font-weight: 700; }
  p { margin: 0; font-size: 11pt; }
  p.entry-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
    margin: 0;
    font-size: 11pt;
    break-after: avoid;
    page-break-after: avoid;
  }
  p.entry-row .entry-left { flex: 1 1 auto; min-width: 0; }
  p.entry-row .entry-right {
    flex: 0 0 auto;
    text-align: right;
    white-space: nowrap;
    font-weight: 400;
  }
  p.entry-company,
  p.entry-school,
  p.entry-project,
  p.entry {
    margin: 8px 0 0;
    font-size: 11pt;
    font-weight: 700;
    break-after: avoid;
    page-break-after: avoid;
  }
  p.entry-row.entry-company,
  p.entry-row.entry-school,
  p.entry-row.entry-project {
    margin-top: 8px;
    font-weight: 700;
  }
  h2 + p.entry-company,
  h2 + p.entry-school,
  h2 + p.entry-project,
  h2 + p.entry,
  h2 + p.entry-row { margin-top: 4px; }
  p.entry-company + p.entry-role,
  p.entry-school + p.entry-degree,
  p.entry-row.entry-company + p.entry-row.entry-role,
  p.entry-row.entry-school + p.entry-degree {
    margin-top: 0;
    margin-bottom: 0;
  }
  p.entry-role,
  p.entry-degree {
    margin: 0 0 2px;
    font-size: 11pt;
    font-weight: 400;
    font-style: italic;
    break-after: avoid;
    page-break-after: avoid;
  }
  p.entry-row.entry-role {
    font-weight: 400;
    font-style: italic;
    margin: 0 0 2px;
  }
  p.entry-row.entry-role .entry-right { font-style: italic; }
  p.entry-degree { font-weight: 700; font-style: italic; }
  p.entry-grade { margin: 0 0 2px; font-weight: 400; }
  p.skill-row { margin: 2px 0; line-height: 1.35; }
  p.entry-role strong,
  p.entry-degree strong { font-weight: 700; }
  p.entry-role em,
  p.entry-degree em { font-weight: 400; font-style: italic; }
  p.entry-project strong { font-weight: 700; text-decoration: none; }
  p.entry-project a,
  p.entry-row.entry-project a { font-weight: 400; text-decoration: underline; }
  h3 + p.entry { margin-top: 4px; }
  ul {
    margin: 0 0 4px;
    padding-left: 1.35em;
    list-style: disc outside;
    overflow: visible;
  }
  li {
    font-size: 11pt;
    margin: 0 0 2px;
    padding-left: 0.25em;
    line-height: 1.35;
  }
  li { break-inside: avoid; page-break-inside: avoid; }
  p.entry-role + ul,
  p.entry-degree + ul,
  p.entry-project + ul,
  p.entry-company + ul,
  p.entry-row + ul { margin-top: 2px; }
  p.entry-project, p.entry-company, p.entry-role, p.entry-school, p.entry-degree, p.entry, p.entry-row { text-decoration: none; }
  p.entry-company + ul,
  p.entry-role + ul,
  p.entry-project + ul,
  p.entry-degree + ul,
  p.entry-row + ul {
    break-inside: auto;
    page-break-inside: auto;
  }
`;

const COVER_LETTER_CSS = `
  ${DOCUMENT_BASE_CSS}
  body.cover-letter { font-size: 11px; line-height: 1.45; }
  .cl-page {
    display: block;
  }
  .cl-header { margin-bottom: 0.22in; }
  .cl-sender-name {
    font-size: 12px;
    font-weight: 700;
    margin: 0 0 4px;
  }
  .cl-sender-contact {
    font-size: 11px;
    color: #333;
    margin: 0 0 14px;
  }
  .cl-date { margin: 0 0 12px; }
  .cl-address-line { margin: 0 0 2px; }
  .cl-muted { margin: 0 0 2px; color: #555; font-style: italic; }
  .cl-gap { height: 10px; }
  .cl-salutation { margin: 0 0 12px; }
  .cl-bodies { display: block; }
  .cl-body {
    margin: 0 0 12px;
    line-height: 1.45;
    text-align: justify;
  }
  .cl-footer { margin-top: 0.22in; padding-top: 0; }
  .cl-closing { margin: 0 0 12px; }
  .cl-signature { font-weight: 700; margin: 0; }
  .cl-contact { margin: 3px 0 0; font-size: 11px; color: #333; }
`;

export function coverLetterDocumentHtml(md: string, title: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><title>${escapeHtml(
    title,
  )}</title>
<style>${COVER_LETTER_CSS}</style></head><body class="cover-letter">${mdToCoverLetterHtml(md)}</body></html>`;
}

/** Wrap rendered resume markdown in a print-optimized HTML document.
 * Callers should pass already-prepared markdown (prepareResumeMarkdown)
 * so project/contact links are not stripped by a second normalize pass.
 */
export function resumeDocumentHtml(md: string, title: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${RESUME_FONT_LINK}"><title>${escapeHtml(
    title,
  )}</title>
<style>${RESUME_PRINT_CSS}</style></head><body>${mdToHtml(md, { kind: "resume" })}</body></html>`;
}
