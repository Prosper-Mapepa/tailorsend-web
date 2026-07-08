// Minimal, dependency-free Markdown → HTML for rendering resumes/cover letters
// into clean printable documents.

import type { Project } from "@/lib/types";
import { injectProjectLinks } from "@/lib/project-links";

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
    normalizeSkillsLists(lines.join("\n")),
  );
}

/** Normalize + inject verified project links (server-side PDF / API responses). */
export function prepareResumeMarkdown(md: string, projects: Project[]): string {
  return injectProjectLinks(normalizeResumeMarkdown(md), projects);
}

const EXP_SECTIONS =
  /^(WORK EXPERIENCE|EXPERIENCE|PROFESSIONAL EXPERIENCE|EMPLOYMENT|EMPLOYMENT HISTORY)$/i;

const SKILLS_SECTIONS =
  /^(CORE SKILLS|SKILLS|TECHNICAL SKILLS|KEY SKILLS)$/i;

const DATE_IN_PARENS = /\([^)]*\d{4}[^)]*\)\s*$/;
const DATE_RANGE =
  /(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{4}\s*[–—-]\s*(?:Present|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{4}|\d{4})/i;

const LOCATION_TAIL = /,\s*[A-Z]{2}(\s|$)|\b(Remote|USA|United States)\b/i;

function stripMd(line: string): string {
  return line.replace(/\*\*/g, "").replace(/^#+\s*/, "").trim();
}

function isRoleLine(trimmed: string): boolean {
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
  return LOCATION_TAIL.test(emDash[2]);
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
          const skill = part.trim();
          if (skill) out.push(`- ${skill}`);
        }
      } else {
        out.push(raw);
      }
      continue;
    }

    if (trimmed.includes(",")) {
      for (const part of trimmed.split(",")) {
        const skill = part.trim();
        if (skill) out.push(`- ${skill}`);
      }
    } else {
      out.push(`- ${trimmed}`);
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
    const inExperience = EXP_SECTIONS.test(section);
    const inProjects = /^PROJECTS/i.test(section);

    if (inProjects && isBold) return "entry-project";

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
        expPhase = "after-company";
        html.push(`<p class="entry-company">${inline(heading)}</p>`);
      } else {
        expPhase = "idle";
        section = heading.trim();
        listIsSkills = /\bskills?\b/i.test(heading);
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
      const cls = paragraphClass(line);
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
  @page { margin: 0.5in; }
  * { box-sizing: border-box; }
  body {
    font-family: Georgia, "Times New Roman", serif;
    color: #111;
    line-height: 1.32;
    margin: 0;
    padding: 0;
    font-size: 11px;
  }
  a { color: #111; text-decoration: underline; text-underline-offset: 1px; }
`;

const RESUME_PRINT_CSS = `
  ${DOCUMENT_BASE_CSS}
  h1 { font-size: 19px; margin: 0 0 2px; }
  h1 + p { margin: 0 0 2px; color: #333; }
  h2 { font-size: 12.5px; text-transform: uppercase; letter-spacing: .03em; border-bottom: 1px solid #ccc; padding-bottom: 2px; margin: 13px 0 6px; }
  h3 { font-size: 11.5px; margin: 10px 0 2px; }
  p { margin: 2px 0; font-size: 11px; }
  p.entry-company { margin: 10px 0 0; font-size: 11.5px; font-weight: 700; }
  p.entry-role { margin: 0 0 3px; font-size: 11.5px; font-weight: 700; color: #111; font-style: normal; }
  p.entry-role em { font-weight: 400; font-style: italic; color: #444; }
  p.entry-project { margin: 10px 0 2px; font-size: 11.5px; font-weight: 700; }
  h2 + p.entry-company, h2 + p.entry-project { margin-top: 2px; }
  p.entry { margin: 10px 0 1px; font-size: 11.5px; font-weight: 700; }
  h2 + p.entry, h3 + p.entry { margin-top: 2px; }
  ul { margin: 3px 0 0; padding-left: 16px; }
  li { font-size: 11px; margin: 1.5px 0; }
  ul.cols-2 { column-count: 2; column-gap: 24px; }
  ul.cols-3 { column-count: 3; column-gap: 18px; }
  ul.cols-2 li, ul.cols-3 li { break-inside: avoid; -webkit-column-break-inside: avoid; }
  p.entry-project, p.entry-company, p.entry-role, p.entry { text-decoration: none; }
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
