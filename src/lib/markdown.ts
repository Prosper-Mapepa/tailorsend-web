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
  "EDUCATION",
  "CERTIFICATIONS",
  "AWARDS",
  "ACHIEVEMENTS",
  "PUBLICATIONS",
  "VOLUNTEERING",
]);

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
      if (SECTION_TITLES.has(title.toUpperCase()) && title.length <= 40) {
        return `## ${title}`;
      }
      return raw;
    })
    .join("\n");
}

/**
 * Full resume normalization: repair section headings AND ensure the first line
 * (the candidate name) is an H1. Apply ONLY to resumes, never cover letters.
 */
export function normalizeResumeMarkdown(md: string): string {
  const lines = normalizeResumeSections(md).split("\n");
  const firstIdx = lines.findIndex((l) => l.trim() !== "");
  if (firstIdx >= 0) {
    const first = lines[firstIdx].trim();
    if (!first.startsWith("#")) {
      lines[firstIdx] = `# ${first.replace(/\*\*/g, "").trim()}`;
    }
  }
  return normalizeResumeEntries(
    normalizeProjectHeaders(
      normalizeEducationEntries(
        reorderExperienceEntries(
          mergeOrphanRoleDates(
            normalizeProjectParagraphs(
              consolidateProjectSections(
                normalizeSkillsLists(lines.join("\n")),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}

export type ResumeContact = {
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

/** Turn plain LinkedIn / GitHub / Portfolio labels into markdown links from profile. */
export function injectContactLinks(md: string, contact: ResumeContact): string {
  const lines = md.replace(/\r/g, "").split("\n");
  const nameIdx = lines.findIndex((l) => /^#\s/.test(l.trim()));
  if (nameIdx < 0) return md;

  let contactIdx = -1;
  for (let i = nameIdx + 1; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t) continue;
    if (/^##\s/.test(t)) break;
    contactIdx = i;
    break;
  }

  const existing = contactIdx >= 0 ? lines[contactIdx] : "";
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
    contact.email?.trim() ||
    enriched.find((s) => /@/.test(s) && !/\[/.test(s)) ||
    existing.match(/[\w.+-]+@[\w.-]+\.\w+/)?.[0] ||
    "";
  const phone =
    contact.phone?.trim() ||
    enriched.find(
      (s) => /\d{3}/.test(s) && !/\[/.test(s) && !/@/.test(s),
    ) ||
    existing.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/)?.[0] ||
    "";
  const location =
    contact.location?.trim() ||
    enriched.find(
      (s) =>
        !/\[/.test(s) &&
        !/@/.test(s) &&
        !/\d{3}[-.\s]?\d{3}/.test(s) &&
        s.length > 2,
    ) ||
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

  const parts = [email, phone, location, ...linkParts].filter(Boolean);
  const newLine = parts.join(" | ");
  if (!newLine) return md;

  if (contactIdx >= 0) lines[contactIdx] = newLine;
  else lines.splice(nameIdx + 1, 0, newLine);

  return lines.join("\n");
}

/** Normalize + inject verified contact and project links (PDF, preview, API). */
export function prepareResumeMarkdown(
  md: string,
  projects: Project[] = [],
  contact?: ResumeContact,
): string {
  let out = injectProjectLinks(normalizeResumeMarkdown(md), projects, {
    profileGithub: contact?.github,
  });
  if (contact) out = injectContactLinks(out, contact);
  return out;
}

const EXP_SECTIONS =
  /^(WORK EXPERIENCE|EXPERIENCE|PROFESSIONAL EXPERIENCE|EMPLOYMENT|EMPLOYMENT HISTORY)$/i;

const EDUCATION_SECTIONS = /^EDUCATION$/i;

const PROJECT_SECTIONS = /^PROJECTS/i;

const SKILLS_SECTIONS =
  /^(CORE SKILLS|SKILLS|TECHNICAL SKILLS|KEY SKILLS)$/i;

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
      if (!inProjects || !trimmed || /^[-*]/.test(trimmed)) return raw;
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
  aws: "AWS",
  gcp: "GCP",
  iam: "IAM",
  rbac: "RBAC",
  sql: "SQL",
  nosql: "NoSQL",
  rest: "REST",
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
};

function titleCaseSkill(skill: string): string {
  const trimmed = skill.trim();
  if (!trimmed) return trimmed;

  return trimmed
    .split(/\s+/)
    .map((word) => {
      const key = word.toLowerCase();
      if (SKILL_ACRONYMS[key]) return SKILL_ACRONYMS[key];
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
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function pushSkill(out: string[], skill: string) {
  const formatted = titleCaseSkill(skill);
  if (formatted) out.push(`- ${formatted}`);
}

function boldCompanyLine(line: string): string {
  const trimmed = line.trim();
  if (/^\*\*/.test(trimmed)) return line;
  return `**${stripMd(trimmed)}**`;
}

/** Convert comma-separated skill lines into bullets so PDF columns render correctly. */
function normalizeSkillsLists(md: string): string {
  const lines = md.replace(/\r/g, "").split("\n");
  let inSkills = false;
  const out: string[] = [];

  for (const raw of lines) {
    const trimmed = raw.trim();

    if (/^##\s+/.test(trimmed)) {
      const title = trimmed.replace(/^##\s+/, "").trim();
      inSkills = SKILLS_SECTIONS.test(title);
      out.push(raw);
      continue;
    }

    if (!inSkills || !trimmed) {
      out.push(raw);
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const item = trimmed.replace(/^[-*]\s+/, "");
      if (item.includes(",") && item.split(",").length >= 4) {
        for (const part of item.split(",")) {
          pushSkill(out, part);
        }
      } else {
        pushSkill(out, item);
      }
      continue;
    }

    if (trimmed.includes(",")) {
      for (const part of trimmed.split(",")) {
        pushSkill(out, part);
      }
    } else {
      pushSkill(out, trimmed);
    }
  }

  return out.join("\n");
}

/** Wrap a plain job-title line in bold; italicize the date portion. */
function boldRoleLine(line: string): string {
  const trimmed = line.trim();
  if (/^\*\*/.test(trimmed)) return line;

  const paren = trimmed.match(/^(.+?)\s+(\([^)]+\))\s*$/);
  if (paren && DATE_IN_PARENS.test(paren[2])) {
    return `**${paren[1].trim()}** *${paren[2]}*`;
  }

  const emDash = trimmed.match(/^(.+?)\s+[—–-]\s+(.+)$/);
  if (emDash && DATE_RANGE.test(emDash[2])) {
    return `**${emDash[1].trim()}** *(${emDash[2].trim()})*`;
  }

  if (DATE_IN_PARENS.test(trimmed)) {
    const idx = trimmed.lastIndexOf("(");
    return `**${trimmed.slice(0, idx).trim()}** *${trimmed.slice(idx)}*`;
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

// A skills list with at least this many items renders in multiple columns.
const MULTI_COLUMN_THRESHOLD = 8;

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
    !/^##\s+(work experience|projects|core skills|experience)/m.test(md)
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

/** Resume-specific Markdown → HTML (headings, lists, bold/italic, links). */
function mdToResumeHtml(md: string): string {
  const lines = md.replace(/\r/g, "").split("\n");
  const html: string[] = [];
  let inList = false;
  let listItems: string[] = [];
  let listIsSkills = false;
  let section = "";
  /** First body line after H1 is the contact bar. */
  let expectContactLine = false;
  /** In experience: idle → after company line, expecting job title. */
  let expPhase: "idle" | "after-company" = "idle";

  const closeList = () => {
    if (!inList) return;
    let cls = "";
    if (listIsSkills && listItems.length >= MULTI_COLUMN_THRESHOLD) {
      cls = listItems.length >= 14 ? ' class="cols-3"' : ' class="cols-2"';
    }
    html.push(`<ul${cls}>`);
    html.push(...listItems);
    html.push("</ul>");
    inList = false;
    listItems = [];
  };

  const paragraphClass = (line: string): string => {
    const trimmed = line.trim();
    const isBold = /^\*\*/.test(trimmed);
    const plain = stripMd(trimmed);
    const inExperience = EXP_SECTIONS.test(section);
    const inProjects = PROJECT_SECTIONS.test(section);
    const inEducation = EDUCATION_SECTIONS.test(section);

    if (inProjects && (isBold || /\[.+?\]\(.+?\)/.test(trimmed))) {
      return "entry-project";
    }

    if (inEducation) {
      if (isBold) {
        if (
          DEGREE_KEYWORDS.test(plain) ||
          /\(Graduation|Expected|GPA/i.test(plain)
        ) {
          return "entry-degree";
        }
        return "entry-school";
      }
    }

    if (inExperience) {
      if (isBold) {
        if (expPhase === "after-company") {
          expPhase = "idle";
          return "entry-role";
        }
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
        expPhase = "after-company";
        html.push(`<p class="entry-company">${inline(heading)}</p>`);
      } else {
        expPhase = "idle";
        section = heading.trim();
        listIsSkills = /\bskills?\b/i.test(heading);
        expectContactLine = level === 1;
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
      let cls = paragraphClass(line);
      if (expectContactLine && !cls) {
        cls = "contact-line";
        expectContactLine = false;
      } else if (expectContactLine) {
        expectContactLine = false;
      }
      html.push(
        `<p${cls ? ` class="${cls}"` : ""}>${inline(line)}</p>`,
      );
    }
  }
  closeList();
  return html.join("\n");
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

const DOCUMENT_BASE_CSS = `
  @page { margin: 0.55in 0.6in; }
  * { box-sizing: border-box; }
  body {
    font-family: Calibri, "Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif;
    color: #000;
    line-height: 1.38;
    margin: 0;
    padding: 0;
    font-size: 10.5px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  a {
    color: #000;
    text-decoration: underline;
    text-underline-offset: 2px;
    font-weight: inherit;
  }
`;

const RESUME_PRINT_CSS = `
  ${DOCUMENT_BASE_CSS}
  h1 {
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 0.02em;
    text-transform: none;
    margin: 0 0 2px;
    line-height: 1.2;
    color: #000;
  }
  p.contact-line {
    margin: 0 0 9px;
    padding-bottom: 0;
    border-bottom: none;
    font-size: 9.5px;
    color: #1a1a1a;
    line-height: 1.45;
  }
  p.contact-line a { text-decoration: underline; color: #000; }
  h2 {
    font-size: 10.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    border-bottom: 0.5px solid #9ca3af;
    padding-bottom: 2px;
    margin: 11px 0 5px;
    color: #000;
    break-after: avoid;
    page-break-after: avoid;
  }
  h3 { font-size: 10.5px; margin: 8px 0 2px; font-weight: 700; color: #000; }
  p { margin: 1px 0; font-size: 10.5px; color: #000; }
  p.entry-company,
  p.entry-school {
    margin: 9px 0 0;
    font-size: 10.5px;
    font-weight: 700;
    color: #000;
    break-after: avoid;
    page-break-after: avoid;
  }
  p.entry-company + p.entry-role,
  p.entry-school + p.entry-degree {
    margin-top: 0;
  }
  p.entry-role,
  p.entry-degree {
    margin: 0 0 3px;
    font-size: 10.5px;
    font-weight: 700;
    color: #000;
    font-style: normal;
    break-after: avoid;
    page-break-after: avoid;
  }
  p.entry-role strong,
  p.entry-degree strong { font-weight: 700; }
  p.entry-role em,
  p.entry-degree em { font-weight: 400; font-style: italic; color: #333; }
  p.entry-project {
    margin: 8px 0 1px;
    font-size: 10.5px;
    font-weight: 700;
    color: #000;
    break-after: avoid;
    page-break-after: avoid;
  }
  p.entry-project strong { font-weight: 700; color: #000; text-decoration: none; }
  p.entry-project a { font-weight: 700; color: #000; text-decoration: underline; }
  h2 + p.entry-company,
  h2 + p.entry-school,
  h2 + p.entry-project { margin-top: 2px; }
  p.entry { margin: 8px 0 1px; font-size: 10.5px; font-weight: 700; color: #000; }
  h2 + p.entry, h3 + p.entry { margin-top: 2px; }
  ul { margin: 2px 0 4px; padding-left: 14px; }
  li { font-size: 10.5px; margin: 1px 0; line-height: 1.32; color: #000; }
  ul.cols-2 { column-count: 2; column-gap: 20px; }
  ul.cols-3 { column-count: 3; column-gap: 14px; }
  ul.cols-2 li, ul.cols-3 li { break-inside: avoid; -webkit-column-break-inside: avoid; }
  p.entry-project, p.entry-company, p.entry-role, p.entry-school, p.entry-degree, p.entry { text-decoration: none; }
  p.entry-company + ul,
  p.entry-role + ul,
  p.entry-project + ul,
  p.entry-degree + ul {
    break-inside: avoid;
    page-break-inside: avoid;
  }
`;

const COVER_LETTER_CSS = `
  ${DOCUMENT_BASE_CSS}
  body.cover-letter { font-size: 11px; line-height: 1.45; }
  .cl-page {
    min-height: 9in;
    display: flex;
    flex-direction: column;
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
  .cl-bodies { flex: 1 1 auto; }
  .cl-body {
    margin: 0 0 12px;
    line-height: 1.45;
    text-align: justify;
  }
  .cl-footer { margin-top: auto; padding-top: 0.3in; }
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

/** Wrap rendered resume markdown in a print-optimized HTML document. */
export function resumeDocumentHtml(md: string, title: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(
    title,
  )}</title>
<style>${RESUME_PRINT_CSS}</style></head><body>${mdToHtml(normalizeResumeMarkdown(md), { kind: "resume" })}</body></html>`;
}
