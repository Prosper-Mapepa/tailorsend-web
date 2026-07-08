import OpenAI from "openai";
import { truncate } from "@/lib/util";

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set.");
  return new OpenAI({ apiKey });
}

export interface RubricItem {
  /** Exact ATS keyword or phrase from the job description. */
  term: string;
  /** required = must-have; preferred = nice-to-have. */
  priority: "required" | "preferred";
  /**
   * If true, the candidate cannot truthfully claim this from their background
   * (e.g. "10 years nuclear energy experience") — excluded from the score
   * denominator so tailoring isn't penalized for gaps it can't fix.
   */
  unfillable?: boolean;
}

export interface JobRubric {
  items: RubricItem[];
}

export interface MatchScore {
  score: number;
  matched: string[];
  missing: string[];
  /** Requirements that can't be added without fabricating — shown separately. */
  unfillable: string[];
  summary: string;
}

/** Extract ATS-scorable keywords/phrases from a job description. */
export async function extractJobRubric(job: {
  title: string;
  company: string;
  description: string;
}): Promise<JobRubric> {
  const openai = getClient();
  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.1,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "job_rubric",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  term: { type: "string" },
                  priority: { type: "string", enum: ["required", "preferred"] },
                  unfillable: { type: "boolean" },
                },
                required: ["term", "priority", "unfillable"],
              },
            },
          },
          required: ["items"],
        },
      },
    },
    messages: [
      {
        role: "system",
        content: `Extract 18-28 ATS-scorable keywords/phrases from this job posting.
Include: technologies, tools, frameworks, methodologies, certifications, role-specific skills, and key responsibilities stated in the JD.
Use the JD's exact wording where possible (e.g. "secure SDLC" not "security development lifecycle").
Mark unfillable=true ONLY for requirements that demand prior employment in a specific industry the JD names (e.g. "energy sector experience", "nuclear plant operations") — things a software engineer cannot truthfully claim without that background.
Do NOT mark standard tech skills as unfillable.`,
      },
      {
        role: "user",
        content: `Title: ${job.title}\nCompany: ${job.company}\n\n${truncate(
          job.description,
          6000,
        )}`,
      },
    ],
  });
  const parsed = JSON.parse(
    completion.choices[0]?.message?.content ?? '{"items":[]}',
  ) as JobRubric;
  return { items: parsed.items ?? [] };
}

/** Normalize text for fuzzy keyword matching. */
function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9+#.\s-]/g, " ").replace(/\s+/g, " ");
}

const ALIASES: Record<string, string[]> = {
  javascript: ["js", "javascript", "ecmascript"],
  typescript: ["ts", "typescript"],
  kubernetes: ["kubernetes", "k8s"],
  "amazon web services": ["aws", "amazon web services"],
  "continuous integration": ["ci/cd", "ci cd", "continuous integration"],
  "application security": ["appsec", "application security"],
  "threat modeling": ["threat model", "threat modeling"],
  "secure sdlc": ["secure sdlc", "sdlc", "secure development"],
};

function termMatches(resumeNorm: string, term: string): boolean {
  const t = norm(term);
  if (!t) return false;
  if (resumeNorm.includes(t)) return true;

  // Check aliases
  for (const [key, variants] of Object.entries(ALIASES)) {
    if (t.includes(key) || key.includes(t)) {
      if (variants.some((v) => resumeNorm.includes(norm(v)))) return true;
    }
  }

  // Multi-word: all significant words present nearby
  const words = t.split(" ").filter((w) => w.length > 2);
  if (words.length > 1) {
    return words.every((w) => resumeNorm.includes(w));
  }
  return false;
}

/**
 * Score a resume against a fixed rubric. Uses deterministic keyword matching
 * so before/after scores are consistent and comparable.
 */
export function scoreAgainstRubric(
  resume: string,
  rubric: JobRubric,
): MatchScore {
  const resumeNorm = norm(resume);
  const scorable = rubric.items.filter((i) => !i.unfillable);
  const unfillable = rubric.items.filter((i) => i.unfillable).map((i) => i.term);

  const matched: string[] = [];
  const missing: string[] = [];

  for (const item of scorable) {
    if (termMatches(resumeNorm, item.term)) {
      matched.push(item.term);
    } else {
      missing.push(item.term);
    }
  }

  // Weighted: required items count 2x preferred.
  let earned = 0;
  let possible = 0;
  for (const item of scorable) {
    const weight = item.priority === "required" ? 2 : 1;
    possible += weight;
    if (matched.includes(item.term)) earned += weight;
  }

  const score =
    possible > 0 ? Math.round((earned / possible) * 100) : 0;

  const summary =
    score >= 95
      ? "Excellent ATS keyword coverage — resume mirrors the job requirements."
      : score >= 80
        ? "Strong match; a few JD keywords could still be surfaced more clearly."
        : score >= 60
          ? "Moderate match; tailoring should raise keyword coverage significantly."
          : "Low keyword overlap with this posting — tailoring is strongly recommended.";

  return { score, matched, missing, unfillable, summary };
}

/** Keywords the tailor should target (excludes unfillable industry-only gaps). */
export function fillableKeywords(rubric: JobRubric): string[] {
  return rubric.items.filter((i) => !i.unfillable).map((i) => i.term);
}

export interface WorkRole {
  company: string;
  title: string;
  /** The original role text (company, title, bullets) from the base resume. */
  block: string;
}

/**
 * Parse the Work Experience roles from a base resume so we can guarantee the
 * tailored resume keeps every one (the model sometimes drops "less relevant"
 * roles).
 */
export function extractWorkRoles(baseResume: string): WorkRole[] {
  const lines = baseResume.split("\n");
  let start = -1;
  let end = lines.length;
  for (let i = 0; i < lines.length; i++) {
    if (/^work experience\b/i.test(lines[i].trim())) {
      start = i + 1;
      break;
    }
  }
  if (start === -1) return [];
  for (let i = start; i < lines.length; i++) {
    if (/^(projects|skills|education|certifications)\b/i.test(lines[i].trim())) {
      end = i;
      break;
    }
  }

  const section = lines.slice(start, end);
  const blocks: string[][] = [];
  let cur: string[] = [];
  for (const l of section) {
    if (l.trim() === "") {
      if (cur.length) {
        blocks.push(cur);
        cur = [];
      }
    } else {
      cur.push(l);
    }
  }
  if (cur.length) blocks.push(cur);

  const roles: WorkRole[] = [];
  for (const b of blocks) {
    if (b.length < 2) continue;
    const company = b[0].split(/[—–-]/)[0].trim();
    const title = b[1].replace(/\s*\(.*\)\s*$/, "").trim();
    if (!title) continue;
    roles.push({ company, title, block: b.join("\n") });
  }
  return roles;
}

/** Return roles whose exact title is absent from the tailored resume. */
export function findMissingRoles(
  tailoredResume: string,
  roles: WorkRole[],
): WorkRole[] {
  const resumeNorm = norm(tailoredResume);
  return roles.filter((r) => !resumeNorm.includes(norm(r.title)));
}

/**
 * Last-resort: append still-missing keywords to Core Skills so ATS coverage
 * reaches 100%. Only adds terms not already present.
 */
export function patchMissingKeywords(
  resume: string,
  missing: string[],
): string {
  const stillMissing = missing.filter((k) => !termMatches(norm(resume), k));
  if (!stillMissing.length) return resume;

  const bullets = stillMissing.map((k) => `- ${k}`).join("\n");
  if (/##\s*Core Skills/i.test(resume)) {
    return resume.replace(
      /(##\s*Core Skills[^\n]*\n)/i,
      `$1${bullets}\n`,
    );
  }
  // Insert before Experience if present, else append.
  if (/##\s*Experience/i.test(resume)) {
    return resume.replace(
      /(##\s*Experience)/i,
      `## Core Skills\n${bullets}\n\n$1`,
    );
  }
  return `${resume.trim()}\n\n## Core Skills\n${bullets}\n`;
}
