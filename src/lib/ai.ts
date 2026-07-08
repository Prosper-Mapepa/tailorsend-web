import OpenAI from "openai";
import { getProjectLinks, withProjectLinks } from "@/lib/project-links";
import { extractUrlsFromText, stripInlineCitations, truncate } from "@/lib/util";
import type {
  Certification,
  Education,
  FormFieldResponse,
  Project,
  WorkExperience,
} from "@/lib/types";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to .env to enable AI tailoring.",
    );
  }
  client ??= new OpenAI({ apiKey });
  return client;
}

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

export interface TailorProfile {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  baseResume: string;
  skills: string[];
  projects?: Project[];
  workExperience?: WorkExperience[];
  education?: Education[];
  certifications?: Certification[];
  visaStatus?: string;
  linkedin?: string;
  github?: string;
  website?: string;
}

export interface TailorInput {
  job: {
    title: string;
    company: string;
    location: string;
    description: string;
  };
  profile: TailorProfile;
  /** ATS keywords extracted from the JD — tailor must weave every fillable one in. */
  targetKeywords?: string[];
}

function projectsBlock(projects?: Project[]): string {
  if (!projects || projects.length === 0) return "(none provided)";
  return projects
    .map((p) => {
      const urls = getProjectLinks(p);
      const links = urls.length ? urls.join(" | ") : "";
      const dates =
        p.startDate || p.endDate
          ? ` (${[p.startDate, p.endDate || "Present"].filter(Boolean).join(" – ")})`
          : "";
      return (
        `- ${p.name}${p.role ? ` (${p.role})` : ""}${dates}: ${p.description}` +
        (p.tech?.length ? ` [tech: ${p.tech.join(", ")}]` : "") +
        (links ? ` <${links}>` : "")
      );
    })
    .join("\n");
}

function workExperienceBlock(experience?: WorkExperience[]): string {
  if (!experience || experience.length === 0) return "(none provided)";
  return experience
    .map((w) => {
      const dates = [w.startDate, w.current ? "Present" : w.endDate]
        .filter(Boolean)
        .join(" – ");
      const bullets =
        w.highlights.length > 0
          ? `\n  ${w.highlights.map((h) => `- ${h}`).join("\n  ")}`
          : "";
      return `- ${w.title} @ ${w.company}${w.location ? ` (${w.location})` : ""}${dates ? ` | ${dates}` : ""}${bullets}`;
    })
    .join("\n");
}

function educationBlock(education?: Education[]): string {
  if (!education || education.length === 0) return "(none provided)";
  return education
    .map((e) => {
      const dates = [e.startDate, e.endDate].filter(Boolean).join(" – ");
      const extras = [e.field, e.gpa ? `GPA ${e.gpa}` : "", e.honors]
        .filter(Boolean)
        .join("; ");
      return `- ${e.degree}${extras ? `, ${extras}` : ""} — ${e.school}${e.location ? ` (${e.location})` : ""}${dates ? ` | ${dates}` : ""}`;
    })
    .join("\n");
}

function certificationsBlock(certs?: Certification[]): string {
  if (!certs || certs.length === 0) return "(none provided)";
  return certs
    .map((c) => `- ${c.name}${c.issuer ? ` (${c.issuer})` : ""}${c.date ? ` — ${c.date}` : ""}`)
    .join("\n");
}

export interface TailorOutput {
  tailoredResume: string;
  coverLetter: string;
  matchNotes: string;
}

const SYSTEM_PROMPT = `You are a top-tier technical recruiter and professional resume writer who helps candidates land high-paying roles at competitive US companies.

Your job: tailor the candidate's existing resume and write a cover letter for ONE specific job, optimized to pass ATS screening and impress a human reviewer in 10 seconds.

Hard rules (never break):
- NEVER invent experience, employers, job titles, degrees, dates, certifications, or metrics that are not present in the candidate's base resume/projects. You may rephrase, reorder, quantify ONLY using numbers already provided, and emphasize what is already there.
- PRESERVE EXACTLY the job titles, company names, employment dates, and locations from the base resume. Reproduce each role's title verbatim — do NOT rename, "upgrade", merge, split, or re-level any title (e.g. do not change "Software Engineer II" to "Senior Software Engineer", or "Slate Technolutions CRM Analyst" to "CRM Assistant"). Keep every role and its exact dates. You may only rewrite the bullet points under each role.
- If the candidate lacks a quantified result, write a strong qualitative bullet instead of fabricating a number.

Resume best practices to apply:
- Start with a compact header containing the candidate's name and, on one line, their contact details INCLUDING their LinkedIn URL and portfolio/website URL when provided. Always include those links if present.
- Lead with a concise professional summary (2-3 lines) targeted at this exact role.
- Use a "Core Skills" section as a bullet list (one skill per line) that mirrors the keywords/technologies in the job description (only skills the candidate actually has) so it passes ATS keyword matching and renders in multi-column layout.
- Convert responsibilities into achievement-oriented bullets using strong action verbs and the format: Action + what you built/did + tools + impact.
- Keep formatting clean Markdown with clear section headers (Summary, Core Skills, Experience, Projects, Education). Mirror the job's exact terminology where truthful.
- Do NOT use horizontal rules or separator lines (no "---", "***", or "___"). Use section headings only.

ORDERING (critical):
- Include EVERY role from the base resume's Work Experience — never omit, merge, or skip a role, even if it seems less relevant to this job. The candidate's most recent role MUST be the first Experience entry.
- List EVERYTHING strictly in reverse-chronological order by date: most recent first. This applies to Experience, Projects, and Education. Do NOT reorder by relevance — order by date only.
- Each Experience entry uses EXACTLY this three-line pattern:
  **Company — Location**
  **Job Title** *(Month Year – Month Year)*
  - achievement bullets (never paragraph text)
- Include dates for every role/project/degree when available.

PROJECTS (critical):
- Select the 3-5 projects MOST relevant to this role from the candidate's project list (security/infra projects rank highest for security roles). Order them most recent first. Omit the least relevant ones to keep the resume to two pages.
- EVERY project MUST use this exact pattern (consistent layout):
  **[Project Name](web-url)** | [App Store](url) | [Play Store](url) — *(Month Year – Month Year)*
  - achievement bullet
  - achievement bullet
  Include only link types that are actually provided (omit Web / App Store / Play Store if not listed). If no web URL, use **Project Name** instead of a linked name. Dates go at the end in italics after an em dash. NEVER use paragraph blocks for project descriptions — always bullets. NEVER invent placeholder URLs.
- Include the tech stack and the impact/outcome in the bullets.

COMPLETENESS (goal: maximize interview odds):
- Be comprehensive and use the full space available. Include all relevant employment, projects, and education — do not omit real experience that supports this role.
- Make every bullet specific and results-oriented; pull in concrete technologies and scope. Use the candidate's real numbers where present; otherwise write strong qualitative impact (never fabricate metrics).
- Cover the job's key requirements explicitly so a recruiter sees an obvious match.

ATS KEYWORD TARGETING (critical — goal: 100% keyword coverage):
- When a target keyword list is provided, you MUST weave EVERY listed keyword into the resume using the JD's exact phrasing. Place them in Core Skills, the summary, and experience/project bullets where truthful.
- Reframe transferable experience to align with the role: e.g. secure cloud systems → critical infrastructure; fintech compliance → regulated industry; high-availability systems → mission-critical operations. Never claim industry employment you don't have — instead highlight analogous technical outcomes.
- Mirror the job title's seniority and domain language in the summary and most recent role bullets.

LENGTH: Aim for a dense, well-organized TWO pages. Prefer two full, information-rich pages over a sparse one page; do not exceed two pages. Trim only the least-relevant older bullets if it would spill onto a third page.

Work authorization:
- Do NOT add a "Work Authorization" section or any visa/sponsorship line to the resume. Keep all visa/work-authorization considerations out of the resume itself; mention them only in matchNotes.

Cover letter:
- Use this exact Markdown structure (blank lines between blocks):
  **Full Name**
  email | phone | city, state | [LinkedIn](url) | [Portfolio](url)

  Month Day, Year

  Hiring Team
  Company Name
  City, State (omit if unknown — never use bracket placeholders)

  Dear Hiring Team,

  [Paragraph 1 — role + hook]

  [Paragraph 2 — relevant experience]

  [Paragraph 3 — company fit]

  [Optional short paragraph 4]

  Sincerely,

  Full Name
- 3-4 concise body paragraphs; professional tone; no generic filler or [placeholder] brackets.

matchNotes:
- Briefly assess fit, list the strongest matching keywords, and honestly flag gaps or visa considerations the candidate should be aware of.

Respond with strict JSON matching the provided schema.`;

export async function tailorApplication(
  input: TailorInput,
): Promise<TailorOutput> {
  const openai = getClient();

  const userPrompt = `# Job
Title: ${input.job.title}
Company: ${input.job.company}
Location: ${input.job.location}

## Job description
${truncate(input.job.description, 6000)}

# Candidate
Name: ${input.profile.fullName}
Email: ${input.profile.email}
Phone: ${input.profile.phone}
Location: ${input.profile.location}
LinkedIn: ${input.profile.linkedin ?? ""}
GitHub: ${input.profile.github ?? ""}
Website: ${input.profile.website ?? ""}
Work authorization: ${input.profile.visaStatus || "not specified"}
Skills: ${input.profile.skills.join(", ")}

## Candidate summary
${input.profile.summary}

## Work experience (structured)
${workExperienceBlock(input.profile.workExperience)}

## Education (structured)
${educationBlock(input.profile.education)}

## Certifications
${certificationsBlock(input.profile.certifications)}

## Candidate projects
${projectsBlock(input.profile.projects)}

## Candidate base resume
${truncate(input.profile.baseResume, 8000)}

${
  input.targetKeywords?.length
    ? `## ATS keywords you MUST include (use exact phrasing in Skills, Summary, and bullets)\n${input.targetKeywords.map((k) => `- ${k}`).join("\n")}\n`
    : ""
}
# Task
1. Produce a tailored version of the resume (Markdown) optimized for this specific job, using ONLY information already present above (including projects).
2. Write a tailored cover letter addressed to the ${input.job.company} hiring team.
3. Provide honest match notes (fit + gaps + visa considerations).`;

  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.4,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "tailored_application",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            tailoredResume: { type: "string" },
            coverLetter: { type: "string" },
            matchNotes: { type: "string" },
          },
          required: ["tailoredResume", "coverLetter", "matchNotes"],
        },
      },
    },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
  });

  const content = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content) as TailorOutput;
  return {
    tailoredResume: parsed.tailoredResume ?? "",
    coverLetter: parsed.coverLetter ?? "",
    matchNotes: parsed.matchNotes ?? "",
  };
}

/**
 * Surgical second pass: weave any still-missing ATS keywords into the tailored
 * resume without changing structure or fabricating experience.
 */
export async function enhanceTailoredResume(input: {
  resume: string;
  missingKeywords: string[];
  job: TailorInput["job"];
  profile: TailorProfile;
}): Promise<string> {
  if (!input.missingKeywords.length) return input.resume;
  const openai = getClient();
  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "You edit an already-tailored resume to include specific missing ATS keywords. Add them naturally into Core Skills, the summary, or existing bullets. NEVER invent employers, dates, or experience. NEVER add a Work Authorization section. Return the full updated resume in Markdown only — no commentary.",
      },
      {
        role: "user",
        content: `Job: ${input.job.title} at ${input.job.company}

Missing keywords to add (use exact phrasing):
${input.missingKeywords.map((k) => `- ${k}`).join("\n")}

Candidate skills: ${input.profile.skills.join(", ")}

Current tailored resume:
${truncate(input.resume, 9000)}

Return the complete updated resume.`,
      },
    ],
  });
  return completion.choices[0]?.message?.content?.trim() || input.resume;
}

/**
 * Re-insert work-experience roles the tailor dropped, in the correct
 * reverse-chronological position. Keeps exact title/company/dates.
 */
export async function repairMissingRoles(input: {
  resume: string;
  missingRoles: { company: string; title: string; block: string }[];
  job: TailorInput["job"];
}): Promise<string> {
  if (!input.missingRoles.length) return input.resume;
  const openai = getClient();
  const blocks = input.missingRoles
    .map(
      (r) =>
        `### Role to restore\n- Company (exact): ${r.company}\n- Title (exact): ${r.title}\n- Render the header EXACTLY as: **${r.company}** — ${r.title}\n- Original content:\n${r.block}`,
    )
    .join("\n\n");
  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "You are fixing a tailored resume that is MISSING one or more real work-experience roles. Insert every missing role into the Experience section in the correct reverse-chronological position (by date). Use the EXACT company, title, and dates given — render each header as \"**Company** — Title\" using the provided values verbatim; never re-split a multi-word title into the company field. You may lightly rephrase bullets to fit the target job, but never fabricate. Return the COMPLETE updated resume in Markdown only — no commentary.",
      },
      {
        role: "user",
        content: `Target job: ${input.job.title} at ${input.job.company}

Missing role(s) to restore:
${blocks}

Current tailored resume:
${truncate(input.resume, 9000)}

Return the complete resume with all roles present, most recent first.`,
      },
    ],
  });
  return completion.choices[0]?.message?.content?.trim() || input.resume;
}

/**
 * Generate a high-impact master resume (Markdown) optimized for landing a
 * high-paying US role, personalized from the candidate's existing data.
 * Uses only provided facts; leaves clearly-marked placeholders where info is
 * missing so the user can fill them in.
 */
export async function generateResumeOutline(input: {
  profile: TailorProfile;
  targetTitles: string[];
}): Promise<string> {
  const openai = getClient();
  const { profile, targetTitles } = input;

  const system = `You are an elite resume writer for high-paying tech/business roles in the US.
Produce a complete, ready-to-edit master resume in clean Markdown that would impress recruiters and pass ATS.

Rules:
- Use ONLY facts the candidate provides. Where a detail is missing but important, insert a clearly bracketed placeholder like [Add metric: e.g. "reduced load time 40%"] so the user knows to fill it.
- Structure: Header (name + contact + LinkedIn/GitHub/portfolio URLs), Professional Summary, Core Skills (grouped, ATS-friendly), Experience (achievement bullets: Action + impact + tools), Projects, Education. Do NOT include a Work Authorization or visa/sponsorship line.
- Make bullets quantified and outcome-driven; never fabricate real numbers (use placeholders instead).
- Target the listed role(s). Keep it tight and senior-sounding.`;

  const user = `Target role(s): ${targetTitles.join(", ") || "high-paying tech role"}

Candidate:
Name: ${profile.fullName}
Email: ${profile.email}
Phone: ${profile.phone}
Location: ${profile.location}
LinkedIn: ${profile.linkedin ?? ""}
GitHub: ${profile.github ?? ""}
Website: ${profile.website ?? ""}
Work authorization: ${profile.visaStatus || "not specified"}
Skills: ${profile.skills.join(", ")}

Summary provided:
${profile.summary || "(none)"}

Work experience:
${workExperienceBlock(profile.workExperience)}

Education:
${educationBlock(profile.education)}

Certifications:
${certificationsBlock(profile.certifications)}

Projects:
${projectsBlock(profile.projects)}

Existing resume text (may be empty):
${truncate(profile.baseResume, 6000) || "(none)"}

Write the full master resume now.`;

  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.5,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  return completion.choices[0]?.message?.content?.trim() ?? "";
}

/** Reformat raw resume text into clean, ATS-friendly Markdown for PDF export. */
export async function formatUploadedResume(
  resumeText: string,
  context?: {
    projects?: Project[];
    linkedin?: string;
    website?: string;
  },
): Promise<string> {
  const openai = getClient();
  const { projectLinksBlock } = await import("@/lib/project-links");

  const system = `You are an expert resume formatter. Convert the candidate's resume text into clean, professional Markdown suitable for a 2-page PDF.

Hard rules (never break):
- NEVER invent experience, employers, job titles, degrees, dates, certifications, metrics, or links. Use ONLY what appears in the source text OR in the verified project-link list below.
- PRESERVE EXACTLY job titles, company names, employment dates, and locations from the source. Do not rename or re-level titles.
- Include ALL roles and projects from the source in reverse-chronological order.
- Do NOT include work authorization, visa, or sponsorship lines.
- Do NOT use horizontal rules (---). Do NOT wrap the output in code fences.
- For projects that match the verified link list, use this EXACT header pattern:
  **[Project Name](web-url)** | [App Store](url) | [Play Store](url) — *(Month Year – Month Year)*
  Include ONLY the link types provided. If no web URL, use **Project Name** (not linked). Dates in italics at the end. NEVER use placeholder URLs.

Structure (use these exact section headings as ## headings):
# FULL NAME (first line)
Contact line: email | phone | location | [LinkedIn](url) | [Portfolio](url) when present
## SUMMARY (or PROFESSIONAL SUMMARY if that's what the source uses)
## CORE SKILLS — bullet list; if 12+ skills, keep as one list (columns are applied at render time)
## EDUCATION
## WORK EXPERIENCE — each role MUST follow:
  **Company — Location**
  **Job Title** *(Month Year – Month Year)*
  - achievement bullets (never paragraph text)
## PROJECTS — each project MUST follow:
  **[Project Name](web-url)** | [App Store](url) | [Play Store](url) — *(dates)*
  - achievement bullets (never paragraph text; convert descriptions to bullets)
## SKILLS or other sections — only if they exist in the source

Polish bullets for clarity but do not fabricate numbers. Keep the document tight (2 pages max when printed).`;

  const linkSection = context?.projects?.length
    ? `\n\nVerified project links (use for matching projects — do not invent others):\n${projectLinksBlock(context.projects)}`
    : "";

  const contactHint =
    context?.linkedin || context?.website
      ? `\n\nVerified contact links:\nLinkedIn: ${context.linkedin ?? ""}\nPortfolio: ${context.website ?? ""}`
      : "";

  const user = `Source resume text (format this — do not add content that is not here):

${truncate(resumeText, 12000)}${linkSection}${contactHint}`;

  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  return completion.choices[0]?.message?.content?.trim() ?? "";
}

export interface BuildIdea {
  title: string;
  description: string;
  tech: string[];
  impact: string;
}

export interface CompanyEdge {
  /** Recent, specific findings about the company (priorities, news, challenges). */
  research: string[];
  /** The valuable gap the candidate is well-positioned to help fix. */
  gap: string;
  /** Concrete portfolio projects to build to stand out for THIS role. */
  build: BuildIdea[];
  /** A short positioning pitch for the cover letter / interview. */
  pitch: string;
  /** Source URLs used in the research. */
  sources: string[];
  /** True when produced from live web search vs. model knowledge only. */
  liveResearch: boolean;
}

/** Strip inline citations from prose and consolidate URLs into sources. */
export function normalizeCompanyEdge(edge: Partial<CompanyEdge>): CompanyEdge {
  const base: CompanyEdge = {
    research: edge.research ?? [],
    gap: edge.gap ?? "",
    build: edge.build ?? [],
    pitch: edge.pitch ?? "",
    sources: edge.sources ?? [],
    liveResearch: edge.liveResearch ?? false,
  };

  const extraSources = [
    ...base.research.flatMap(extractUrlsFromText),
    ...extractUrlsFromText(base.gap),
    ...extractUrlsFromText(base.pitch),
    ...base.build.flatMap((b) => [
      ...extractUrlsFromText(b.description),
      ...extractUrlsFromText(b.impact),
    ]),
  ];
  const sources = [...new Set([...base.sources, ...extraSources])];

  return {
    ...base,
    research: base.research.map(stripInlineCitations).filter(Boolean),
    gap: stripInlineCitations(base.gap),
    pitch: stripInlineCitations(base.pitch),
    build: base.build.map((b) => ({
      ...b,
      description: stripInlineCitations(b.description),
      impact: stripInlineCitations(b.impact),
    })),
    sources,
  };
}

/** Strip ```json fences and parse, tolerating extra prose around the JSON. */
function parseLooseJson<T>(raw: string, fallback: T): T {
  if (!raw) return fallback;
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start !== -1 && end !== -1) s = s.slice(start, end + 1);
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

const EDGE_INSTRUCTION = `You are a career strategist helping a candidate stand out for ONE specific role at ONE company.
Research the company's CURRENT situation: recent news, product launches, funding, security incidents, hiring signals, strategic priorities, and known pain points relevant to the role.
Then identify a concrete, valuable GAP the candidate could help fix — grounded in the candidate's actual skills — and recommend 1-3 specific, impressive things they should BUILD (a portfolio project, tool, prototype, or analysis) that would directly demonstrate they can close that gap for this employer.

Return ONLY a JSON object with this exact shape (no extra prose):
{
  "research": ["specific recent finding about the company (with year/quarter if known) — plain prose only, no URLs or citations"],
  "gap": "one clear, valuable gap this candidate can help close, tied to their skills",
  "build": [
    { "title": "project name", "description": "what to build and how it maps to the company/role", "tech": ["..."], "impact": "why it makes the candidate stand out" }
  ],
  "pitch": "2-3 sentence positioning the candidate can use in a cover letter or interview",
  "sources": ["https://..."]
}
Be specific and realistic. Prefer recent facts; if you are unsure something is current, phrase it cautiously. Never invent fake URLs.
Do NOT embed links, markdown citations, or parenthetical source references in research, gap, pitch, description, or impact fields — put every URL only in sources.`;

/**
 * Research a company for a specific role and propose a valuable gap to fix plus
 * concrete things the candidate should build. Tries live web search; falls back
 * to model knowledge if the web tool is unavailable.
 */
export async function researchCompanyEdge(input: {
  job: { title: string; company: string; location?: string; description: string };
  candidate: { summary: string; skills: string[] };
}): Promise<CompanyEdge> {
  const openai = getClient();
  const prompt = `# Company
${input.job.company}

# Role
${input.job.title}${input.job.location ? ` (${input.job.location})` : ""}

# Job description (for context)
${truncate(input.job.description, 3500)}

# Candidate (tailor the gap & build ideas to these real skills)
Summary: ${input.candidate.summary}
Skills: ${input.candidate.skills.join(", ")}

Research ${input.job.company} and produce the JSON described.`;

  const empty: CompanyEdge = {
    research: [],
    gap: "",
    build: [],
    pitch: "",
    sources: [],
    liveResearch: false,
  };

  // Attempt 1: live web search via the Responses API.
  try {
    const res = await openai.responses.create({
      model: MODEL,
      tools: [{ type: "web_search_preview" }],
      instructions: EDGE_INSTRUCTION,
      input: prompt,
    });
    const parsed = parseLooseJson<Partial<CompanyEdge>>(res.output_text, {});
    if (parsed.gap || (parsed.build && parsed.build.length)) {
      return normalizeCompanyEdge({ ...empty, ...parsed, liveResearch: true });
    }
  } catch {
    // Web tool may be unavailable for the model/account — fall back below.
  }

  // Attempt 2: model knowledge only (no live data).
  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.5,
      messages: [
        { role: "system", content: EDGE_INSTRUCTION },
        { role: "user", content: prompt },
      ],
    });
    const parsed = parseLooseJson<Partial<CompanyEdge>>(
      completion.choices[0]?.message?.content ?? "",
      {},
    );
    return normalizeCompanyEdge({ ...empty, ...parsed, liveResearch: false });
  } catch {
    return empty;
  }
}

/**
 * Weave selected "build" ideas into the resume and cover letter truthfully —
 * as current/in-progress initiatives, never as fabricated completed work.
 */
export async function incorporateBuildIdeas(input: {
  resume: string;
  coverLetter: string;
  ideas: BuildIdea[];
  job: { title: string; company: string };
}): Promise<{ resume: string; coverLetter: string }> {
  if (!input.ideas.length) {
    return { resume: input.resume, coverLetter: input.coverLetter };
  }
  const openai = getClient();

  const ideasBlock = input.ideas
    .map(
      (b, i) =>
        `${i + 1}. ${b.title}\n   What: ${b.description}\n   Tech: ${(b.tech ?? []).join(", ")}\n   Why it matters: ${b.impact}`,
    )
    .join("\n");

  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.3,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "incorporated_docs",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            resume: { type: "string" },
            coverLetter: { type: "string" },
          },
          required: ["resume", "coverLetter"],
        },
      },
    },
    messages: [
      {
        role: "system",
        content: `You update a resume and cover letter to incorporate selected portfolio projects the candidate is BUILDING to stand out for a specific role.

Truthfulness (critical):
- These are initiatives the candidate is building/proposing — NOT completed work. Present them honestly. In the resume, label them so they read as current/ongoing (e.g. add an "In progress" or "Building" marker, or place under a "Selected Initiatives" / "Projects" section). NEVER fabricate completed metrics, launch dates, users, or outcomes.
- Keep ALL existing experience exactly: do not change job titles, companies, dates, or remove roles.

Resume:
- Add each selected initiative concisely under the Projects section (create one before Education if it doesn't exist), most impactful first. Include the tech stack. Keep bullets tight.

Cover letter:
- Weave in 1-2 specific sentences positioning these initiatives as things the candidate is building to address ${input.job.company}'s needs — forward-looking value, not claims of finished work.

Return strict JSON with the full updated "resume" and "coverLetter" in Markdown.`,
      },
      {
        role: "user",
        content: `Target role: ${input.job.title} at ${input.job.company}

Selected initiatives to incorporate:
${ideasBlock}

Current resume:
${truncate(input.resume, 8000)}

Current cover letter:
${truncate(input.coverLetter, 4000)}

Return the updated resume and cover letter.`,
      },
    ],
  });

  const parsed = parseLooseJson<{ resume?: string; coverLetter?: string }>(
    completion.choices[0]?.message?.content ?? "",
    {},
  );
  return {
    resume: parsed.resume?.trim() || input.resume,
    coverLetter: parsed.coverLetter?.trim() || input.coverLetter,
  };
}

export interface ExtractedJob {
  title: string;
  company: string;
  location: string;
  description: string;
}

/**
 * Extract structured job-posting fields from raw page text and/or screenshots.
 * Uses vision when images are supplied. Returns empty strings for anything not
 * present; never invents details.
 */
export async function extractJobPosting(input: {
  text?: string;
  /** Image data URLs (e.g. "data:image/png;base64,..."). */
  images?: string[];
}): Promise<ExtractedJob> {
  const openai = getClient();

  const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];
  if (input.text?.trim()) {
    userContent.push({
      type: "text",
      text: `Job posting source (extracted from a web page or pasted by the user):\n\n${truncate(
        input.text,
        14000,
      )}`,
    });
  }
  for (const url of input.images ?? []) {
    userContent.push({ type: "image_url", image_url: { url, detail: "auto" } });
  }
  if (userContent.length === 0) {
    throw new Error("No job description content was provided.");
  }
  if (input.images?.length) {
    userContent.push({
      type: "text",
      text: "The image(s) above are screenshots of a job posting. Read all visible text and use it.",
    });
  }

  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.1,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "extracted_job",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string" },
            company: { type: "string" },
            location: { type: "string" },
            description: { type: "string" },
          },
          required: ["title", "company", "location", "description"],
        },
      },
    },
    messages: [
      {
        role: "system",
        content:
          "You extract a job posting into structured fields. Use ONLY information present in the provided text/images; never invent. 'description' must contain the full role description: responsibilities, requirements, qualifications, and any compensation/benefits text, cleaned of navigation/boilerplate. If a field is missing, return an empty string.",
      },
      { role: "user", content: userContent },
    ],
  });

  const parsed = JSON.parse(
    completion.choices[0]?.message?.content ?? "{}",
  ) as Partial<ExtractedJob>;
  return {
    title: parsed.title ?? "",
    company: parsed.company ?? "",
    location: parsed.location ?? "",
    description: parsed.description ?? "",
  };
}

export interface ParsedResume {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  website: string;
  summary: string;
  skills: string[];
  workExperience: WorkExperience[];
  education: Education[];
  certifications: Certification[];
  projects: Project[];
}

const resumeProjectSchema = {
  type: "object" as const,
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    role: { type: "string" },
    description: { type: "string" },
    links: { type: "array", items: { type: "string" } },
    tech: { type: "array", items: { type: "string" } },
    startDate: { type: "string" },
    endDate: { type: "string" },
  },
  required: [
    "name",
    "role",
    "description",
    "links",
    "tech",
    "startDate",
    "endDate",
  ],
};

const workExperienceSchema = {
  type: "object" as const,
  additionalProperties: false,
  properties: {
    company: { type: "string" },
    title: { type: "string" },
    location: { type: "string" },
    startDate: { type: "string" },
    endDate: { type: "string" },
    current: { type: "boolean" },
    highlights: { type: "array", items: { type: "string" } },
  },
  required: [
    "company",
    "title",
    "location",
    "startDate",
    "endDate",
    "current",
    "highlights",
  ],
};

const educationSchema = {
  type: "object" as const,
  additionalProperties: false,
  properties: {
    school: { type: "string" },
    degree: { type: "string" },
    field: { type: "string" },
    location: { type: "string" },
    startDate: { type: "string" },
    endDate: { type: "string" },
    gpa: { type: "string" },
    honors: { type: "string" },
  },
  required: [
    "school",
    "degree",
    "field",
    "location",
    "startDate",
    "endDate",
    "gpa",
    "honors",
  ],
};

const certificationSchema = {
  type: "object" as const,
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    issuer: { type: "string" },
    date: { type: "string" },
    url: { type: "string" },
  },
  required: ["name", "issuer", "date", "url"],
};

/**
 * Parse raw resume text into structured profile fields for autofill.
 * Extracts only what is present; leaves fields empty otherwise.
 */
export async function parseResume(resumeText: string): Promise<ParsedResume> {
  const openai = getClient();

  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.1,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "parsed_resume",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            fullName: { type: "string" },
            email: { type: "string" },
            phone: { type: "string" },
            location: { type: "string" },
            linkedin: { type: "string" },
            github: { type: "string" },
            website: { type: "string" },
            summary: { type: "string" },
            skills: { type: "array", items: { type: "string" } },
            workExperience: {
              type: "array",
              items: workExperienceSchema,
            },
            education: {
              type: "array",
              items: educationSchema,
            },
            certifications: {
              type: "array",
              items: certificationSchema,
            },
            projects: {
              type: "array",
              items: resumeProjectSchema,
            },
          },
          required: [
            "fullName",
            "email",
            "phone",
            "location",
            "linkedin",
            "github",
            "website",
            "summary",
            "skills",
            "workExperience",
            "education",
            "certifications",
            "projects",
          ],
        },
      },
    },
    messages: [
      {
        role: "system",
        content:
          "Extract structured fields from a resume. Use only information present in the text; leave a field as an empty string or empty array if it is not present. Do not invent anything.\n\n" +
          "CONTACT (critical — scan the header carefully):\n" +
          "- fullName: the candidate's full name exactly as written in the resume header.\n" +
          "- email, phone, location: from the header/contact block.\n" +
          "- linkedin: full LinkedIn profile URL if present. Accept bare forms like linkedin.com/in/username and return https://linkedin.com/in/username.\n" +
          "- github: full GitHub profile URL if present. Accept bare github.com/username forms.\n" +
          "- website: portfolio / personal site / other non-LinkedIn non-GitHub URL in the header (e.g. netlify.app, vercel.app, .me domains).\n\n" +
          "SECTIONS:\n" +
          "- skills: individual technologies, tools, and competencies.\n" +
          "- workExperience: paid jobs and internships at companies — NOT personal/side projects. Each role needs company, title, location, start/end dates (human-readable like 'Jan 2022'), current=true if ongoing, and highlights as achievement bullets.\n" +
          "- education: degrees, bootcamps, and formal training with school, degree, field of study, dates, GPA, honors.\n" +
          "- certifications: professional certs and licenses, including credential URLs when listed.\n" +
          "- projects: personal, academic, or portfolio projects (not employment).\n" +
          "  * name: project title ONLY — strip trailing ' | App Store | Play Store' or similar link labels from the name.\n" +
          "  * links: array of ALL real URLs for the project (website, App Store, Play Store, repo). Empty array if none. Do not put the words 'App Store' / 'Play Store' into links unless they are actual https URLs.\n" +
          "  * Include role, description, tech, and dates when present.\n\n" +
          "Order work experience, education, and projects reverse-chronologically (most recent first).",
      },
      { role: "user", content: truncate(resumeText, 12000) },
    ],
  });

  const parsed = JSON.parse(
    completion.choices[0]?.message?.content ?? "{}",
  ) as Partial<ParsedResume>;

  return {
    fullName: parsed.fullName ?? "",
    email: parsed.email ?? "",
    phone: parsed.phone ?? "",
    location: parsed.location ?? "",
    linkedin: parsed.linkedin ?? "",
    github: parsed.github ?? "",
    website: parsed.website ?? "",
    summary: parsed.summary ?? "",
    skills: parsed.skills ?? [],
    workExperience: parsed.workExperience ?? [],
    education: parsed.education ?? [],
    certifications: (parsed.certifications ?? []).map((c) => ({
      ...c,
      url: c.url || undefined,
    })),
    projects: (parsed.projects ?? []).map((p) => {
      const rawLinks = [
        ...((p as Project & { links?: string[] }).links ?? []),
        (p as Project).link,
        (p as Project).appStoreLink,
        (p as Project).playStoreLink,
      ].filter(Boolean) as string[];
      return withProjectLinks(
        {
          name: p.name ?? "",
          role: p.role ?? "",
          description: p.description ?? "",
          link: "",
          tech: p.tech ?? [],
          startDate: p.startDate || undefined,
          endDate: p.endDate || undefined,
        },
        rawLinks,
      );
    }),
  };
}

/**
 * Answer a free-form screening question using only the candidate profile.
 * Used by the autofiller when it encounters unknown text inputs.
 */
export async function answerScreeningQuestion(
  question: string,
  profile: TailorInput["profile"],
  job: TailorInput["job"],
): Promise<string> {
  const openai = getClient();
  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content:
          "Answer the job application question concisely and truthfully using only the candidate's background. If the answer is unknown, give a reasonable professional response without fabricating specific facts.",
      },
      {
        role: "user",
        content: `Job: ${job.title} at ${job.company}\nCandidate resume:\n${truncate(
          profile.baseResume,
          4000,
        )}\n\nQuestion: ${question}\n\nAnswer:`,
      },
    ],
  });
  return completion.choices[0]?.message?.content?.trim() ?? "";
}

export interface FormResponsesInput {
  imageDataUrl: string;
  job: {
    title: string;
    company: string;
    location?: string;
    description?: string;
  };
  profile: TailorProfile;
  tailoredResume: string;
  coverLetter: string;
}

/**
 * Read visible application-form fields from a screenshot and draft truthful
 * copy-paste answers from the candidate's tailored materials.
 */
export async function generateFormResponsesFromScreenshot(
  input: FormResponsesInput,
): Promise<FormFieldResponse[]> {
  const openai = getClient();

  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.25,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "application_form_responses",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            fields: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  label: { type: "string" },
                  fieldType: { type: "string" },
                  answer: { type: "string" },
                },
                required: ["label", "fieldType", "answer"],
              },
            },
          },
          required: ["fields"],
        },
      },
    },
    messages: [
      {
        role: "system",
        content: `You help a job applicant fill out online application forms.

Read the screenshot and list every visible form field, dropdown label, or screening question you can see (including placeholders like "First name", "Why do you want to work here?", "LinkedIn URL", etc.).

For each field, write a concise, professional answer the candidate can copy and paste. Rules:
- Use ONLY facts from the candidate profile, tailored resume, and cover letter below.
- Never invent employers, degrees, dates, or skills not supported by those materials.
- For contact fields (name, email, phone, location, LinkedIn, GitHub, website), use exact values from the profile when available.
- For cover-letter-style prompts, adapt the tailored cover letter — do not exceed ~180 words unless the field clearly needs more.
- For yes/no or dropdown-style questions, answer with the most accurate single phrase (e.g. "Yes", "No", "Authorized to work in the US with sponsorship required").
- For file-upload fields, answer with: "Upload the tailored resume PDF from TailorSend" (or cover letter if appropriate).
- If the screenshot shows only a job posting with no application form, return an empty fields array.
- fieldType is one of: text, email, phone, textarea, select, checkbox, radio, file, url, other.`,
      },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: input.imageDataUrl, detail: "high" },
          },
          {
            type: "text",
            text: `Job: ${input.job.title} at ${input.job.company}${input.job.location ? ` (${input.job.location})` : ""}

Candidate profile:
Name: ${input.profile.fullName}
Email: ${input.profile.email}
Phone: ${input.profile.phone}
Location: ${input.profile.location}
LinkedIn: ${input.profile.linkedin}
GitHub: ${input.profile.github}
Website: ${input.profile.website}
Visa: ${input.profile.visaStatus || "not specified"}

Tailored resume:
${truncate(input.tailoredResume, 6000)}

Cover letter:
${truncate(input.coverLetter, 3000)}

${input.job.description ? `Job description excerpt:\n${truncate(input.job.description, 2000)}` : ""}

List each visible form field in the screenshot and provide the best copy-paste answer.`,
          },
        ],
      },
    ],
  });

  const parsed = JSON.parse(
    completion.choices[0]?.message?.content ?? '{"fields":[]}',
  ) as { fields?: FormFieldResponse[] };

  return (parsed.fields ?? []).filter((f) => f.label.trim() && f.answer.trim());
}

export interface CommonFormResponsesInput {
  job: {
    title: string;
    company: string;
    location?: string;
    description?: string;
  };
  profile: TailorProfile;
  tailoredResume: string;
  coverLetter: string;
}

/**
 * Draft copy-paste answers for typical application questions when no form
 * screenshot is available (e.g. manual-apply jobs).
 */
export async function generateCommonFormResponses(
  input: CommonFormResponsesInput,
): Promise<FormFieldResponse[]> {
  const openai = getClient();

  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.25,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "common_application_form_responses",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            fields: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  label: { type: "string" },
                  fieldType: { type: "string" },
                  answer: { type: "string" },
                },
                required: ["label", "fieldType", "answer"],
              },
            },
          },
          required: ["fields"],
        },
      },
    },
    messages: [
      {
        role: "system",
        content: `You help a job applicant prepare copy-paste answers for online job applications.

Given a job posting and the candidate's tailored materials, produce answers for the most common application fields and screening questions they are likely to encounter — even without seeing the actual form.

Include where relevant:
- Contact: full name, email, phone, location, LinkedIn, GitHub, website
- Work authorization / visa / sponsorship (use profile visa status truthfully)
- Years of relevant experience
- Highest degree and field
- Why this company / why this role
- Summary or "tell us about yourself"
- Key skills match / relevant experience highlights
- Salary expectations (if unknown, suggest "Open to discussion based on total compensation")
- Willingness to relocate / remote work preference
- Earliest start date (reasonable default: 2 weeks notice)
- Referral source (suggest "Company careers site" or "Job board")
- EEO/diversity optional fields: suggest "Prefer not to answer" or "Decline to self-identify" where appropriate
- File uploads: "Upload the tailored resume PDF from TailorSend" or cover letter as appropriate

Rules:
- Use ONLY facts from the candidate profile, tailored resume, and cover letter.
- Never invent employers, degrees, dates, or skills not supported by those materials.
- Tailor "why this company/role" to the specific job and company.
- fieldType is one of: text, email, phone, textarea, select, checkbox, radio, file, url, other.
- Aim for 12–20 useful fields.`,
      },
      {
        role: "user",
        content: `Job: ${input.job.title} at ${input.job.company}${input.job.location ? ` (${input.job.location})` : ""}

${input.job.description ? `Job description:\n${truncate(input.job.description, 6000)}` : ""}

Candidate profile:
Name: ${input.profile.fullName}
Email: ${input.profile.email}
Phone: ${input.profile.phone}
Location: ${input.profile.location}
LinkedIn: ${input.profile.linkedin}
GitHub: ${input.profile.github}
Website: ${input.profile.website}
Visa: ${input.profile.visaStatus || "not specified"}

Tailored resume:
${truncate(input.tailoredResume, 6000)}

Cover letter:
${truncate(input.coverLetter, 3000)}

List common application fields and provide the best copy-paste answer for each.`,
      },
    ],
  });

  const parsed = JSON.parse(
    completion.choices[0]?.message?.content ?? '{"fields":[]}',
  ) as { fields?: FormFieldResponse[] };

  return (parsed.fields ?? []).filter((f) => f.label.trim() && f.answer.trim());
}
