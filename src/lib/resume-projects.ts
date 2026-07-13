import {
  applyKnownProjectLinks,
  DEFAULT_PROJECT_LINKS,
  lineMatchesProject,
} from "@/lib/project-links";
import type { Project } from "@/lib/types";

const projectStub = (name: string): Project => ({
  name,
  role: "",
  description: "",
  link: "",
  tech: [],
});

/**
 * Enrich the user's own profile projects with verified links WITHOUT pulling in
 * any built-in default projects the user hasn't saved.
 */
function ownProjectsWithLinks(projects: Project[]): Project[] {
  return applyKnownProjectLinks(projects, { addMissing: false });
}

interface ProjectBlock {
  headerLine: string;
  bullets: string[];
}

function stripProjectHeader(line: string): string {
  return line
    .replace(/^\*\*|\*\*$/g, "")
    .replace(/\*\*\[(.+?)\]\(.+?\)\*\*/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/\s*\|\s*(?:\[[^\]]+\]\([^)]+\)\s*)+/g, "")
    .replace(/\s*—\s*\*?\([^)]*\)\*?\s*$/g, "")
    .trim();
}

function formatProjectDates(project: Project): string {
  if (!project.startDate && !project.endDate) return "";
  return [project.startDate, project.endDate || "Present"]
    .filter(Boolean)
    .join(" – ");
}

/** Markdown header + bullets for one profile project (no links). */
export function formatProfileProjectEntry(project: Project): string {
  const merged = ownProjectsWithLinks([project])[0] ?? project;

  const dates = formatProjectDates(merged);
  let header = `**${merged.name}**`;
  if (dates) header += ` — *(${dates})*`;

  const bullets: string[] = [];
  if (merged.description?.trim()) {
    bullets.push(`- ${merged.description.trim()}`);
  }
  if (merged.tech?.length) {
    bullets.push(`- Built with ${merged.tech.join(", ")}.`);
  }
  if (!bullets.length) {
    bullets.push(`- ${merged.name}${merged.role ? ` — ${merged.role}` : ""}.`);
  }

  return [header, ...bullets].join("\n");
}

export function extractProjectBlocks(md: string): ProjectBlock[] {
  const lines = md.replace(/\r/g, "").split("\n");
  let inProjects = false;
  const blocks: ProjectBlock[] = [];
  let current: ProjectBlock | null = null;

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (/^##\s+PROJECTS/i.test(trimmed)) {
      inProjects = true;
      continue;
    }
    if (/^##\s+/.test(trimmed) && inProjects) break;
    if (!inProjects) continue;

    if (/^[-*]\s+/.test(trimmed)) {
      if (current) current.bullets.push(raw);
      continue;
    }

    if (!trimmed) continue;

    if (current) blocks.push(current);
    current = { headerLine: raw, bullets: [] };
  }

  if (current) blocks.push(current);
  return blocks;
}

export function resumeContainsProject(md: string, project: Project): boolean {
  return extractProjectBlocks(md).some((block) =>
    lineMatchesProject(block.headerLine, project),
  );
}

function blocksMatch(a: ProjectBlock, b: ProjectBlock): boolean {
  const na = stripProjectHeader(a.headerLine).toLowerCase();
  const nb = stripProjectHeader(b.headerLine).toLowerCase();
  if (na === nb) return true;
  const stub = (name: string): Project => ({
    name,
    role: "",
    description: "",
    link: "",
    tech: [],
  });
  return (
    lineMatchesProject(a.headerLine, stub(nb)) ||
    lineMatchesProject(b.headerLine, stub(na))
  );
}

function appendToProjectsSection(md: string, text: string): string {
  const lines = md.replace(/\r/g, "").split("\n");
  let insertAt = lines.length;
  let inProjects = false;

  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (/^##\s+PROJECTS/i.test(t)) {
      inProjects = true;
      continue;
    }
    if (inProjects && /^##\s+/.test(t)) {
      insertAt = i;
      break;
    }
  }

  lines.splice(insertAt, 0, "", text, "");
  return lines.join("\n");
}

function blockToMarkdown(block: ProjectBlock): string {
  return [block.headerLine, ...block.bullets].join("\n");
}

/** Trailing "(dates/status)" — tolerates an internal em-dash date range. */
const TRAILING_STATUS = /\s*[—–-]?\s*\*?\(([^)]+)\)\*?\s*$/;

function isDateOrStatus(text: string): boolean {
  return /\d{4}|present|in progress|building|ongoing|planned/i.test(text);
}

/** Pull a trailing date/status off a project header, keeping the internal range. */
function extractTrailingStatus(plain: string): { rest: string; status: string } {
  const m = plain.match(TRAILING_STATUS);
  if (m && isDateOrStatus(m[1] ?? "")) {
    return {
      rest: plain.slice(0, m.index).trim(),
      status: m[1].trim(),
    };
  }
  return { rest: plain, status: "" };
}

/** Split a one-line project paragraph (colon- or dash-separated) into header + bullets. */
export function splitProjectParagraph(line: string): string | null {
  let plain = stripProjectHeader(line);
  if (!plain || plain.length < 50) return null;

  // Drop bogus link wrappers — title-only if label was the whole paragraph
  plain = plain.replace(/^https?:\/\/\S+\s*/i, "").trim();

  const { rest, status } = extractTrailingStatus(plain);
  plain = rest;

  // Prefer the earliest sensible title separator: colon or a spaced em-dash.
  let sepIdx = -1;
  let sepLen = 0;

  const colonIdx = plain.indexOf(": ");
  if (colonIdx >= 0 && colonIdx <= 70) {
    sepIdx = colonIdx;
    sepLen = 1;
  }

  const dashMatch = plain.match(/\s+[—–]\s+|\s+-\s+/);
  const dashIdx = dashMatch?.index ?? -1;
  if (dashIdx >= 0 && dashIdx <= 70 && (sepIdx < 0 || dashIdx < sepIdx)) {
    sepIdx = dashIdx;
    sepLen = dashMatch![0].length;
  }

  if (sepIdx < 0) return null;

  const title = plain.slice(0, sepIdx).trim();
  let body = plain.slice(sepIdx + sepLen).trim();

  if (!title || title.length > 90 || body.length < 15) return null;
  if (!/[a-z]/.test(body)) return null;

  const bullets: string[] = [];
  const techMatch = body.match(/\bTech(?:nologies)?\s*:\s*(.+)$/i);
  if (techMatch) {
    body = body
      .slice(0, techMatch.index)
      .trim()
      .replace(/[—–-]\s*$/, "")
      .trim();
    const tech = techMatch[1].trim().replace(/\.$/, "");
    if (tech) bullets.push(`- Built with ${tech}.`);
  }

  if (body) {
    const desc = body.replace(/\s+/g, " ").trim();
    bullets.unshift(`- ${desc.endsWith(".") ? desc : `${desc}.`}`);
  }

  if (!bullets.length) return null;

  let header = `**${title}**`;
  if (status) header += ` — *(${status})*`;

  return [header, ...bullets].join("\n");
}

/**
 * Format a project header line consistently: bold title with NO links, then a
 * trailing " — *(dates)*". All links (web, GitHub, App/Play Store) are stripped.
 * Handles internal em-dash date ranges so "Pipeline *(May 2026 – Present)*"
 * never gets split mid-date.
 */
export function boldProjectHeaderLine(line: string): string {
  const trimmed = line.trim();
  if (/^\s*[-*]\s/.test(trimmed)) return line;
  if (!trimmed) return line;

  const { rest, status } = extractTrailingStatus(trimmed);
  let head = rest;

  // Drop any trailing link-label suffix ("| [App Store](url) | ...", "| GitHub").
  const pipeIdx = head.indexOf(" | ");
  if (pipeIdx >= 0) {
    const suffix = head.slice(pipeIdx).trim();
    if (/\[[^\]]+\]\([^)]+\)|App Store|Play Store|GitHub/i.test(suffix)) {
      head = head.slice(0, pipeIdx).trim();
    }
  }

  // Unwrap any markdown link to plain text and drop the URL entirely.
  head = head.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");

  // Don't bold an entire unsplit paragraph.
  const titlePlain = head.replace(/^\*+|\*+$/g, "").replace(/\*\*/g, "").trim();
  if (titlePlain.length > 80) return line;
  if (!titlePlain) return line;

  let result = `**${titlePlain}**`;
  if (status) result += ` — *(${status})*`;
  return result;
}

/** Fix project lines that cram title + description into one bold/link block. */
export function normalizeProjectParagraphs(md: string): string {
  const lines = md.replace(/\r/g, "").split("\n");
  let inProjects = false;
  const out: string[] = [];

  for (const raw of lines) {
    const trimmed = raw.trim();

    if (/^##\s+PROJECTS/i.test(trimmed)) {
      inProjects = true;
      out.push(raw);
      continue;
    }
    if (/^##\s+/.test(trimmed) && inProjects) {
      inProjects = false;
      out.push(raw);
      continue;
    }
    if (!inProjects || !trimmed || /^[-*]/.test(trimmed)) {
      out.push(raw);
      continue;
    }

    const split = splitProjectParagraph(raw);
    if (split) {
      out.push(...split.split("\n"));
      continue;
    }

    // Unwrap markdown links whose label is an entire paragraph
    const linked = trimmed.match(/^\*\*\[(.+)\]\(([^)]+)\)\*\*(.*)$/);
    if (linked && linked[1].length > 50) {
      const retry = splitProjectParagraph(linked[1]);
      if (retry) {
        out.push(...retry.split("\n"));
        continue;
      }
      out.push(`**${linked[1].split(/\s+[—–-]\s+/)[0].trim()}**${linked[3] ?? ""}`);
      continue;
    }

    out.push(raw);
  }

  return out.join("\n");
}

/**
 * Merge multiple "## PROJECTS" sections into a single one (keeping the first
 * position) and drop duplicate project entries. Makes the layout deterministic
 * no matter how the AI structured its output.
 */
export function consolidateProjectSections(md: string): string {
  const lines = md.replace(/\r/g, "").split("\n");

  const ranges: { start: number; end: number }[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^##\s+PROJECTS\b/i.test(lines[i].trim())) {
      let j = i + 1;
      while (j < lines.length && !/^##\s+/.test(lines[j].trim())) j++;
      ranges.push({ start: i, end: j });
      i = j - 1;
    }
  }

  if (ranges.length <= 1) return md;

  const allBlocks: ProjectBlock[] = [];
  for (const r of ranges) {
    const sectionMd = ["## PROJECTS", ...lines.slice(r.start + 1, r.end)].join(
      "\n",
    );
    allBlocks.push(...extractProjectBlocks(sectionMd));
  }

  const deduped: ProjectBlock[] = [];
  for (const block of allBlocks) {
    const existing = deduped.findIndex((d) => blocksMatch(d, block));
    if (existing >= 0) {
      if (block.bullets.length > deduped[existing].bullets.length) {
        deduped[existing] = block;
      }
    } else {
      deduped.push(block);
    }
  }

  const merged = deduped.map((b) => blockToMarkdown(b)).join("\n\n");

  const result: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const range = ranges.find((r) => i >= r.start && i < r.end);
    if (range) {
      if (range === ranges[0] && i === range.start) {
        result.push("## PROJECTS", "", merged, "");
      }
      continue;
    }
    result.push(lines[i]);
  }

  return result.join("\n");
}

/**
 * Remove built-in default project entries (from DEFAULT_PROJECT_LINKS) that the
 * user has NOT saved in their profile. Projects the user authored themselves
 * (not in the default list) are always kept.
 */
export function pruneUnsavedDefaultProjects(
  md: string,
  projects: Project[],
): string {
  const defaultNames = DEFAULT_PROJECT_LINKS.map((d) => d.name).filter(
    (n): n is string => Boolean(n),
  );
  if (!defaultNames.length) return md;

  const lines = md.replace(/\r/g, "").split("\n");
  const out: string[] = [];
  let inProjects = false;
  let skipping = false;

  for (const raw of lines) {
    const trimmed = raw.trim();

    if (/^##\s+PROJECTS/i.test(trimmed)) {
      inProjects = true;
      skipping = false;
      out.push(raw);
      continue;
    }
    if (/^##\s+/.test(trimmed) && inProjects) {
      inProjects = false;
      skipping = false;
      out.push(raw);
      continue;
    }
    if (!inProjects) {
      out.push(raw);
      continue;
    }

    if (!trimmed || /^[-*]\s+/.test(trimmed)) {
      if (!skipping) out.push(raw);
      continue;
    }

    const inProfile = projects.some((p) => lineMatchesProject(raw, p));
    const isDefault = defaultNames.some((name) =>
      lineMatchesProject(raw, projectStub(name)),
    );
    skipping = isDefault && !inProfile;
    if (!skipping) out.push(raw);
  }

  return out.join("\n");
}

/** Append any profile projects missing from the resume PROJECTS section. */
export function ensureAllProfileProjects(md: string, projects: Project[]): string {
  md = pruneUnsavedDefaultProjects(md, projects);
  const merged = ownProjectsWithLinks(projects);
  const missing = merged.filter((p) => !resumeContainsProject(md, p));
  if (!missing.length) return md;

  const entries = missing.map((p) => formatProfileProjectEntry(p)).join("\n\n");

  if (/^##\s+PROJECTS/im.test(md)) {
    return appendToProjectsSection(md, entries);
  }

  const section = `## PROJECTS\n\n${entries}\n`;
  if (/^##\s+EDUCATION/im.test(md)) {
    return md.replace(/^##\s+EDUCATION/im, `${section}\n## EDUCATION`);
  }
  return `${md.trim()}\n\n${section}`;
}

/**
 * When incorporating gap/build ideas, keep every project block from the
 * original resume — only add new ones, never replace the list.
 */
export function preserveExistingProjects(
  originalMd: string,
  updatedMd: string,
): string {
  const original = extractProjectBlocks(originalMd);
  const updated = extractProjectBlocks(updatedMd);
  if (!original.length) return updatedMd;

  const toRestore = original.filter(
    (ob) => !updated.some((ub) => blocksMatch(ob, ub)),
  );
  if (!toRestore.length) return updatedMd;

  const restored = toRestore.map((b) => blockToMarkdown(b)).join("\n\n");

  if (/^##\s+PROJECTS/im.test(updatedMd)) {
    return appendToProjectsSection(updatedMd, restored);
  }

  const section = `## PROJECTS\n\n${restored}\n`;
  if (/^##\s+EDUCATION/im.test(updatedMd)) {
    return updatedMd.replace(/^##\s+EDUCATION/im, `${section}\n## EDUCATION`);
  }
  return `${updatedMd.trim()}\n\n${section}`;
}
