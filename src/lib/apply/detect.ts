import type { AtsPlatform } from "@/lib/types";

/** Domains that redirect or gate apply links and often block automation. */
const AGGREGATOR_HOSTS = [
  "appcast.io",
  "click.appcast",
  "womenforhire.com",
  "indeed.com",
  "ziprecruiter.com",
  "glassdoor.com",
  "linkedin.com",
];

const AUTH_GATED_PLATFORMS: AtsPlatform[] = ["workday", "external"];

/** Detect the ATS platform powering an application URL. */
export function detectAts(url: string): AtsPlatform {
  const u = url.toLowerCase();
  if (u.includes("greenhouse.io") || u.includes("grnh.se")) return "greenhouse";
  if (u.includes("lever.co")) return "lever";
  if (u.includes("ashbyhq.com")) return "ashby";
  if (u.includes("myworkdayjobs.com") || u.includes("workday")) return "workday";
  return "unknown";
}

export type AutofillUrlRisk = "low" | "medium" | "high";

/** How likely auto-fill is to work for this apply URL. */
export function autofillUrlRisk(url: string): AutofillUrlRisk {
  const u = url.toLowerCase();
  if (AGGREGATOR_HOSTS.some((h) => u.includes(h))) return "high";
  const platform = detectAts(url);
  if (platform === "greenhouse" || platform === "lever" || platform === "ashby")
    return "low";
  if (platform === "workday") return "high";
  return "medium";
}

/**
 * True when the apply flow needs sign-in or blocks automation — auto-fill must
 * not be offered.
 */
export function requiresAuthentication(
  applyUrl: string,
  atsPlatform?: string,
): boolean {
  if (autofillUrlRisk(applyUrl) === "high") return true;
  const platform = (atsPlatform || detectAts(applyUrl)) as AtsPlatform;
  return AUTH_GATED_PLATFORMS.includes(platform);
}

/** Whether TailorSend can auto-fill the application form for this job. */
export function supportsAutofill(
  applyUrl: string,
  atsPlatform?: string,
): boolean {
  return !requiresAuthentication(applyUrl, atsPlatform);
}

/** Message shown when auto-fill and open-browser actions are disabled. */
export function manualApplyNotice(
  applyUrl: string,
  atsPlatform?: string,
): string {
  const platform = (atsPlatform || detectAts(applyUrl)) as AtsPlatform;
  const u = applyUrl.toLowerCase();

  if (platform === "workday" || u.includes("workday")) {
    return (
      "This job uses Workday, which requires an account before you can apply. " +
      "Auto-fill is not available. Open the posting via View posting, sign in on " +
      "the company site, and copy your tailored resume and cover letter from above."
    );
  }

  if (u.includes("appcast.io") || u.includes("click.appcast")) {
    return (
      "This apply link goes through a gated redirect (Appcast) that blocks " +
      "automated browsers. Auto-fill is not available. Use View posting to apply " +
      "in your normal browser and copy your tailored documents from above."
    );
  }

  if (platform === "external") {
    return (
      "This job was found via a job board or aggregator that requires sign-in " +
      "before applying. Auto-fill is not available. Use View posting to open the " +
      "listing in your browser and copy your tailored resume and cover letter from above."
    );
  }

  return (
    "This application requires signing in on the employer site before you can " +
    "apply. Auto-fill is not available. Use View posting to apply manually and " +
    "copy your tailored resume and cover letter from above."
  );
}

/** User-facing warning when the apply URL is likely to block automation. */
export function autofillUrlWarning(url: string): string | null {
  if (requiresAuthentication(url)) return null;
  const u = url.toLowerCase();
  if (u.includes("appcast.io") || u.includes("click.appcast")) {
    return (
      "This link goes through Appcast, which often blocks automated browsers " +
      '(shows "Access is temporarily restricted"). Use Open apply page in Safari or ' +
      "Chrome instead, or prioritize Greenhouse/Lever jobs for auto-fill."
    );
  }
  const risk = autofillUrlRisk(url);
  if (risk === "high") {
    return (
      "This job uses a redirect or login-gated portal that may block auto-fill. " +
      "If the automated browser is blocked, open the apply page in your normal browser " +
      "and paste your tailored resume and cover letter manually."
    );
  }
  return null;
}

/**
 * Rough confidence that we can reliably auto-fill this platform. Used to warn
 * the user when a site is likely to need manual handling.
 */
export function autofillConfidence(platform: AtsPlatform): "high" | "medium" | "low" {
  switch (platform) {
    case "greenhouse":
    case "lever":
    case "ashby":
      return "high";
    case "workday":
      return "low"; // multi-step, account-gated
    default:
      return "medium";
  }
}

/** Apply URLs that commonly use multi-page wizards (Save & Continue). */
export function isLikelyMultiStepApply(url: string): boolean {
  const u = url.toLowerCase();
  return (
    u.includes("dropbox.jobs") ||
    u.includes("myworkdayjobs.com") ||
    u.includes("smartrecruiters.com") ||
    u.includes("icims.com") ||
    u.includes("taleo.net") ||
    u.includes("ultipro.com")
  );
}

/** Short hint for multi-step application flows in the UI. */
export function multiStepApplyHint(url: string): string {
  return (
    "This application has multiple steps. Auto-fill fills each page and clicks " +
    '"Save & Continue" automatically. If it stops before the end, click "Continue Autofill" ' +
    "to pick up where it left off. Review each step in the browser before final submit."
  );
}
