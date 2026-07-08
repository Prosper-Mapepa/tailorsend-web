import type { VisaRisk } from "@/lib/types";

// Phrases that signal a job is unlikely to work for an F1 student who will
// need sponsorship (now or after OPT). Ordered by severity.
const CLEARANCE = [
  "security clearance",
  "active clearance",
  "ts/sci",
  "top secret",
  "secret clearance",
  "polygraph",
];

const CITIZENSHIP = [
  "u.s. citizen",
  "us citizen",
  "united states citizen",
  "must be a citizen",
  "citizenship required",
  "green card holder",
  "permanent resident only",
  "itar",
];

const NO_SPONSORSHIP = [
  "no sponsorship",
  "not provide sponsorship",
  "unable to sponsor",
  "cannot sponsor",
  "will not sponsor",
  "do not sponsor",
  "without sponsorship",
  "no visa sponsorship",
  "not able to sponsor",
  "sponsorship is not available",
  "not eligible for sponsorship",
  "authorized to work in the united states without",
  "without the need for",
];

/**
 * Detect a visa/work-authorization signal from a job description.
 * Returns "none" when no blocking language is found.
 */
export function detectVisaRisk(text: string): VisaRisk {
  const t = (text || "").toLowerCase();
  if (CLEARANCE.some((p) => t.includes(p))) return "clearance";
  if (CITIZENSHIP.some((p) => t.includes(p))) return "citizenship";
  if (NO_SPONSORSHIP.some((p) => t.includes(p))) return "no_sponsorship";
  return "none";
}

const LABELS: Record<VisaRisk, string> = {
  none: "Sponsorship-friendly",
  no_sponsorship: "No sponsorship",
  citizenship: "Citizen/PR only",
  clearance: "Clearance required",
};

export function visaRiskLabel(risk: VisaRisk): string {
  return LABELS[risk] ?? risk;
}
