import type { NormalizedJob, TargetRole, WorkExperience } from "@/lib/types";
import type { JobVisaAnalysis } from "@/lib/visa-analyze";

export interface MatchInput {
  targetRoles: TargetRole[];
  skills: string[];
  workExperience?: WorkExperience[];
  /** When true, visa weight is emphasized for F-1 seekers. */
  needsSponsorship?: boolean;
}

export interface MatchBreakdown {
  skills: number;
  experience: number;
  visa: number;
  salary: number;
  location: number;
  overall: number;
}

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "senior",
  "junior",
  "staff",
  "lead",
  "engineer",
  "developer",
  "manager",
]);

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter((t) => t.length > 1);
}

function yearsFromExperience(exp: WorkExperience[] | undefined): number {
  if (!exp?.length) return 0;
  let months = 0;
  for (const e of exp) {
    const start = Date.parse(e.startDate) || 0;
    const end = e.current
      ? Date.now()
      : Date.parse(e.endDate) || Date.now();
    if (start && end > start) months += (end - start) / (30 * 24 * 3600 * 1000);
  }
  return months / 12;
}

function parseSalaryMid(salary: string): number | null {
  if (!salary.trim()) return null;
  const nums = [...salary.replace(/,/g, "").matchAll(/(\d{2,3})\s*[kK]\b|(\d{5,7})/g)].map(
    (m) => {
      if (m[1]) return Number(m[1]) * 1000;
      return Number(m[2]);
    },
  );
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/**
 * Ranking formula (plan):
 * 40% skills · 20% experience · 20% visa · 10% salary · 10% location
 */
export function scoreJobDetailed(
  job: NormalizedJob & { visaScore?: number },
  input: MatchInput,
  analysis?: JobVisaAnalysis | null,
): MatchBreakdown {
  const { targetRoles, skills, workExperience, needsSponsorship } = input;
  const jobTitleTokens = new Set(tokens(job.title));
  const jobText = `${job.title} ${job.description}`.toLowerCase();

  let titleScore = 0;
  let locationBonus = 0;
  let minSalaryWanted = 0;

  for (const role of targetRoles) {
    const roleTokens = tokens(role.title).filter((t) => !STOPWORDS.has(t));
    if (roleTokens.length) {
      const hits = roleTokens.filter((t) => jobTitleTokens.has(t)).length;
      titleScore = Math.max(titleScore, hits / roleTokens.length);
    }
    const kw = role.keywords.map((k) => k.toLowerCase());
    if (kw.length) {
      const kwHits = kw.filter((k) => jobText.includes(k)).length;
      titleScore = Math.max(
        titleScore,
        0.5 * titleScore + 0.5 * (kwHits / kw.length),
      );
    }
    if (role.remote && job.remote) locationBonus = Math.max(locationBonus, 1);
    for (const loc of role.locations) {
      if (loc && job.location.toLowerCase().includes(loc.toLowerCase())) {
        locationBonus = Math.max(locationBonus, 1);
      }
      if (loc.toLowerCase() === "remote" && job.remote) locationBonus = 1;
    }
    if (role.minSalary) minSalaryWanted = Math.max(minSalaryWanted, role.minSalary);
  }

  const skillList = skills.map((s) => s.toLowerCase()).filter(Boolean);
  const skillHits = skillList.filter((s) => jobText.includes(s)).length;
  const skillCoverage = skillList.length ? skillHits / skillList.length : 0;
  const skillsScore = Math.round(
    Math.min(1, 0.55 * titleScore + 0.45 * skillCoverage) * 100,
  );

  const yearsHave = yearsFromExperience(workExperience);
  const yearsWant = analysis?.experienceYears ?? null;
  let experienceScore = 70;
  if (yearsWant == null) {
    experienceScore = analysis?.entryLevel || analysis?.internship ? 85 : 65;
  } else if (yearsHave >= yearsWant) {
    experienceScore = 95;
  } else if (yearsHave >= yearsWant - 1) {
    experienceScore = 75;
  } else if (yearsHave >= yearsWant - 2) {
    experienceScore = 55;
  } else {
    experienceScore = 30;
  }
  if (analysis?.entryLevel && yearsHave <= 2) experienceScore = Math.max(experienceScore, 88);

  const visaRaw = job.visaScore ?? 50;
  // Soft-penalize mid scores for F-1 mode; hard blockers already low from scorer.
  let visaScore = visaRaw;
  if (needsSponsorship && visaRaw >= 40 && visaRaw < 70) {
    visaScore = Math.round(visaRaw * 0.92);
  }

  const mid = parseSalaryMid(job.salary);
  let salaryScore = 50;
  if (!minSalaryWanted) {
    salaryScore = mid ? 70 : 50;
  } else if (mid == null) {
    salaryScore = 45;
  } else if (mid >= minSalaryWanted) {
    salaryScore = 95;
  } else if (mid >= minSalaryWanted * 0.85) {
    salaryScore = 70;
  } else {
    salaryScore = 35;
  }

  const locationScore = Math.round(locationBonus * 100);
  const overall = Math.round(
    0.4 * skillsScore +
      0.2 * experienceScore +
      0.2 * visaScore +
      0.1 * salaryScore +
      0.1 * locationScore,
  );

  return {
    skills: skillsScore,
    experience: experienceScore,
    visa: visaScore,
    salary: salaryScore,
    location: locationScore,
    overall: Math.max(0, Math.min(100, overall)),
  };
}

/** Heuristic 0-100 relevance score (overall from detailed breakdown). */
export function scoreJob(
  job: NormalizedJob & { visaScore?: number },
  input: MatchInput,
  analysis?: JobVisaAnalysis | null,
): number {
  return scoreJobDetailed(job, input, analysis).overall;
}
