import type { JobVisaAnalysis, TriState } from "@/lib/visa-analyze";
import { visaRiskFromAnalysis } from "@/lib/visa-analyze";
import type { VisaRisk } from "@/lib/types";

export interface VisaScoreResult {
  score: number;
  reasons: string[];
  risk: VisaRisk;
}

export interface CompanyVisaSignals {
  optFriendly: TriState;
  stemOptFriendly: TriState;
  eVerify: TriState;
  h1bSponsor: TriState;
  greenCardSponsor: TriState;
  internationalHiring: "high" | "medium" | "low" | "unknown";
  citizenshipRequired: boolean;
  securityClearanceRequired: boolean;
}

function triBoost(v: TriState, yes: number, unknown: number, no: number): number {
  if (v === "yes") return yes;
  if (v === "no") return no;
  return unknown;
}

/** Job-level F-1 compatibility score 0–100 with human-readable reasons. */
export function scoreJobVisa(
  analysis: JobVisaAnalysis,
  company?: Partial<CompanyVisaSignals> | null,
): VisaScoreResult {
  let score = 55;
  const reasons: string[] = [];
  const risk = visaRiskFromAnalysis(analysis);

  if (analysis.securityClearance) {
    return {
      score: 5,
      reasons: ["Security clearance required"],
      risk,
    };
  }
  if (analysis.citizenshipRequired || analysis.greenCardRequired) {
    return {
      score: 8,
      reasons: [
        analysis.citizenshipRequired
          ? "U.S. citizenship / PR required"
          : "Green card required",
      ],
      risk,
    };
  }
  if (analysis.visaSponsorship === false) {
    return {
      score: 12,
      reasons: ["Posting refuses visa sponsorship"],
      risk,
    };
  }

  reasons.push("No citizenship restriction");
  reasons.push("No security clearance");
  score += 12;

  if (analysis.visaSponsorship === true) {
    score += 18;
    reasons.push("Visa sponsorship mentioned");
  }
  if (analysis.optFriendly === true) {
    score += 12;
    reasons.push("Accepts OPT");
  } else if (analysis.optFriendly === null && company?.optFriendly === "yes") {
    score += 8;
    reasons.push("Company OPT friendly");
  }
  if (analysis.stemOptFriendly === true || company?.stemOptFriendly === "yes") {
    score += 8;
    reasons.push("STEM OPT friendly");
  }
  if (analysis.mentionsH1b || company?.h1bSponsor === "yes") {
    score += 10;
    reasons.push("Sponsors H-1B");
  } else if (company?.h1bSponsor === "unknown") {
    score += 2;
  }
  if (analysis.mentionsEVerify || company?.eVerify === "yes") {
    score += 6;
    reasons.push("Uses E-Verify");
  }
  if (company?.greenCardSponsor === "yes") {
    score += 6;
    reasons.push("Green card sponsorship history");
  }
  if (company?.internationalHiring === "high") {
    score += 5;
    reasons.push("Strong international hiring");
  } else if (company?.internationalHiring === "medium") {
    score += 2;
  }

  if (analysis.internship || analysis.entryLevel) {
    score += 4;
    reasons.push(analysis.internship ? "Internship / co-op" : "Entry-level friendly");
  }
  if (analysis.experienceYears != null && analysis.experienceYears >= 7) {
    score -= 8;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, reasons: reasons.slice(0, 8), risk };
}

/** Company-level visa confidence from profile fields. */
export function scoreCompanyVisa(c: CompanyVisaSignals): number {
  if (c.securityClearanceRequired || c.citizenshipRequired) return 10;

  let score = 40;
  score += triBoost(c.optFriendly, 15, 4, -20);
  score += triBoost(c.stemOptFriendly, 10, 2, -5);
  score += triBoost(c.h1bSponsor, 18, 4, -15);
  score += triBoost(c.greenCardSponsor, 8, 2, -5);
  score += triBoost(c.eVerify, 8, 2, 0);
  if (c.internationalHiring === "high") score += 10;
  else if (c.internationalHiring === "medium") score += 5;
  else if (c.internationalHiring === "low") score -= 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

/** Merge JD-derived signals into company tri-states without inventing Yes from silence. */
export function promoteTriState(
  current: TriState,
  signal: boolean | null,
): TriState {
  if (signal === true) return "yes";
  if (signal === false && current !== "yes") return "no";
  return current;
}
