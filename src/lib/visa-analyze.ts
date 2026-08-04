import { createHash } from "node:crypto";
import type { VisaRisk } from "@/lib/types";
import { detectVisaRisk } from "@/lib/visa";

export type TriState = "yes" | "no" | "unknown";
export type InternationalHiring = "high" | "medium" | "low" | "unknown";

export type JobVisaEvidence = { field: string; quote: string };

/** Structured F-1 / visa analysis for a single job posting. */
export interface JobVisaAnalysis {
  citizenshipRequired: boolean;
  greenCardRequired: boolean;
  securityClearance: boolean;
  visaSponsorship: boolean | null;
  optFriendly: boolean | null;
  stemOptFriendly: boolean | null;
  mentionsH1b: boolean;
  mentionsEad: boolean;
  mentionsEVerify: boolean;
  remote: boolean;
  hybrid: boolean;
  onsite: boolean;
  experienceYears: number | null;
  degreeRequired: string | null;
  internship: boolean;
  entryLevel: boolean;
  categories: string[];
  evidence: JobVisaEvidence[];
  contentHash: string;
  analyzedAt: string;
  source: "llm" | "heuristic";
}

export interface VisaScoreResult {
  score: number;
  reasons: string[];
  risk: VisaRisk;
}

const OPT_YES = [
  "opt eligible",
  "opt candidates",
  "accepts opt",
  "open to opt",
  "f-1",
  "f1 student",
  "optional practical training",
];

const STEM_OPT_YES = [
  "stem opt",
  "stem extension",
  "stem-opt",
];

const SPONSOR_YES = [
  "will sponsor",
  "visa sponsorship available",
  "sponsorship available",
  "sponsors h-1b",
  "sponsors h1b",
  "h-1b sponsorship",
  "h1b sponsorship",
  "provide sponsorship",
  "open to sponsorship",
];

const H1B_MENTION = ["h-1b", "h1b", "h1-b"];
const EAD_MENTION = ["ead", "employment authorization document"];
const EVERIFY_MENTION = ["e-verify", "everify", "e verify"];

const HYBRID = ["hybrid", "partially remote", "flexible location"];
const ONSITE = ["on-site", "onsite", "in-office", "in office"];
const INTERNSHIP = ["intern", "internship", "co-op", "coop"];
const ENTRY = [
  "entry level",
  "entry-level",
  "new grad",
  "new graduate",
  "junior",
  "0-2 years",
  "0–2 years",
];

function includesAny(text: string, phrases: string[]): boolean {
  return phrases.some((p) => text.includes(p));
}

function findQuote(text: string, phrases: string[]): string | undefined {
  for (const p of phrases) {
    const i = text.indexOf(p);
    if (i >= 0) {
      const start = Math.max(0, i - 20);
      const end = Math.min(text.length, i + p.length + 40);
      return text.slice(start, end).replace(/\s+/g, " ").trim();
    }
  }
  return undefined;
}

export function hashJobContent(title: string, description: string): string {
  return createHash("sha256")
    .update(`${title}\n${description}`)
    .digest("hex")
    .slice(0, 24);
}

function extractExperienceYears(text: string): number | null {
  const m =
    text.match(/(\d+)\+?\s*(?:years?|yrs?)\s+(?:of\s+)?experience/) ||
    text.match(/(\d+)\s*[-–]\s*(\d+)\s*(?:years?|yrs?)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function extractCategories(text: string): string[] {
  const cats: string[] = [];
  if (
    /software engineer|full[- ]?stack|backend|frontend|sre|devops|mobile engineer/.test(
      text,
    )
  ) {
    cats.push("software");
  }
  if (
    /cybersecurity|security engineer|infosec|appsec|soc analyst|penetration/.test(
      text,
    )
  ) {
    cats.push("cybersecurity");
  }
  if (
    /\bai\b|machine learning|ml engineer|deep learning|llm|nlp engineer/.test(
      text,
    )
  ) {
    cats.push("ai");
  }
  return cats;
}

/**
 * Fast phrase-based visa analysis (no LLM).
 * Positive company signals only when the JD is explicit — silence stays null/unknown.
 */
export function analyzeJobVisaHeuristic(
  title: string,
  description: string,
  remoteFlag = false,
): JobVisaAnalysis {
  const raw = `${title}\n${description}`;
  const t = raw.toLowerCase();
  const risk = detectVisaRisk(raw);
  const evidence: JobVisaEvidence[] = [];

  const citizenshipRequired =
    risk === "citizenship" ||
    /u\.?s\.? citizen|must be a citizen|citizenship required|green card holder|permanent resident only/.test(
      t,
    );
  const greenCardRequired =
    /green card (required|only)|permanent resident (required|only)|uscis/.test(t) &&
    citizenshipRequired;
  const securityClearance = risk === "clearance";

  const sponsorNo = risk === "no_sponsorship";
  const sponsorYes = includesAny(t, SPONSOR_YES);
  const optYes = includesAny(t, OPT_YES);
  const stemYes = includesAny(t, STEM_OPT_YES);

  if (citizenshipRequired) {
    const q = findQuote(t, ["u.s. citizen", "us citizen", "citizenship required"]);
    if (q) evidence.push({ field: "citizenshipRequired", quote: q });
  }
  if (securityClearance) {
    const q = findQuote(t, ["security clearance", "ts/sci", "top secret"]);
    if (q) evidence.push({ field: "securityClearance", quote: q });
  }
  if (sponsorYes) {
    const q = findQuote(t, SPONSOR_YES);
    if (q) evidence.push({ field: "visaSponsorship", quote: q });
  }
  if (optYes) {
    const q = findQuote(t, OPT_YES);
    if (q) evidence.push({ field: "optFriendly", quote: q });
  }

  const hybrid = includesAny(t, HYBRID);
  const onsite = includesAny(t, ONSITE) && !remoteFlag;
  const remote = remoteFlag || /\bremote\b/.test(t);

  return {
    citizenshipRequired,
    greenCardRequired: Boolean(greenCardRequired),
    securityClearance,
    visaSponsorship: sponsorNo ? false : sponsorYes ? true : null,
    optFriendly: sponsorNo ? false : optYes ? true : null,
    stemOptFriendly: sponsorNo ? false : stemYes ? true : null,
    mentionsH1b: includesAny(t, H1B_MENTION),
    mentionsEad: includesAny(t, EAD_MENTION),
    mentionsEVerify: includesAny(t, EVERIFY_MENTION),
    remote,
    hybrid,
    onsite: onsite && !remote,
    experienceYears: extractExperienceYears(t),
    degreeRequired: /bachelor|master|phd|degree required|bs\/ms|b\.s\.|m\.s\./.test(t)
      ? "degree"
      : null,
    internship: includesAny(t, INTERNSHIP),
    entryLevel: includesAny(t, ENTRY),
    categories: extractCategories(t),
    evidence,
    contentHash: hashJobContent(title, description),
    analyzedAt: new Date().toISOString(),
    source: "heuristic",
  };
}

/** Hard negatives from heuristics always win over softer LLM guesses. */
export function mergeVisaAnalysis(
  heuristic: JobVisaAnalysis,
  llm: Partial<JobVisaAnalysis> | null,
): JobVisaAnalysis {
  if (!llm) return heuristic;
  const merged: JobVisaAnalysis = {
    ...heuristic,
    ...llm,
    citizenshipRequired:
      heuristic.citizenshipRequired || Boolean(llm.citizenshipRequired),
    greenCardRequired:
      heuristic.greenCardRequired || Boolean(llm.greenCardRequired),
    securityClearance:
      heuristic.securityClearance || Boolean(llm.securityClearance),
    evidence: [...heuristic.evidence, ...(llm.evidence ?? [])].slice(0, 12),
    categories: Array.from(
      new Set([...(heuristic.categories ?? []), ...(llm.categories ?? [])]),
    ),
    contentHash: heuristic.contentHash,
    analyzedAt: new Date().toISOString(),
    source: "llm",
  };

  if (heuristic.visaSponsorship === false) merged.visaSponsorship = false;
  if (heuristic.optFriendly === false) merged.optFriendly = false;
  if (heuristic.stemOptFriendly === false) merged.stemOptFriendly = false;

  return merged;
}

export function visaRiskFromAnalysis(a: JobVisaAnalysis): VisaRisk {
  if (a.securityClearance) return "clearance";
  if (a.citizenshipRequired || a.greenCardRequired) return "citizenship";
  if (a.visaSponsorship === false) return "no_sponsorship";
  return "none";
}
