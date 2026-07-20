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
  "simplyhired.com",
  "monster.com",
  "careerbuilder.com",
];

/** ATS / career-site hosts where autofill is not reliably supported. */
const UNSUPPORTED_AUTOFILL_HOSTS = [
  "myworkdayjobs.com",
  "workdayjobs.com",
  "icims.com",
  "taleo.net",
  "oraclecloud.com",
  "successfactors.com",
  "ultipro.com",
  "ukg.com",
  "jobvite.com",
  "brassring.com",
  "phenom.com",
  "phenompeople.com",
  "recruiting.adp.com",
  "smartrecruiters.com",
  "bamboohr.com",
  "applytojob.com",
  "dayforcehcm.com",
];

const AUTH_GATED_PLATFORMS: AtsPlatform[] = ["workday", "external"];

function matchesHostList(url: string, hosts: string[]): boolean {
  const u = url.toLowerCase();
  return hosts.some((h) => u.includes(h));
}

/** Detect the ATS platform powering an application URL. */
export function detectAts(url: string): AtsPlatform {
  const u = url.toLowerCase();
  if (u.includes("greenhouse.io") || u.includes("grnh.se")) return "greenhouse";
  if (u.includes("lever.co")) return "lever";
  if (u.includes("ashbyhq.com")) return "ashby";
  if (
    u.includes("myworkdayjobs.com") ||
    u.includes("workdayjobs.com") ||
    u.includes("workday")
  ) {
    return "workday";
  }
  return "unknown";
}

export type AutofillUrlRisk = "low" | "medium" | "high";

/** How likely auto-fill is to work for this apply URL. */
export function autofillUrlRisk(url: string): AutofillUrlRisk {
  const u = url.toLowerCase();
  if (matchesHostList(u, AGGREGATOR_HOSTS)) return "high";
  if (matchesHostList(u, UNSUPPORTED_AUTOFILL_HOSTS)) return "high";
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
  if (!applyUrl.trim()) return false;
  return !requiresAuthentication(applyUrl, atsPlatform);
}

/** Short platform label for status chips in the UI. */
export function autofillPlatformLabel(url: string): string {
  const platform = detectAts(url);
  switch (platform) {
    case "greenhouse":
      return "Greenhouse";
    case "lever":
      return "Lever";
    case "ashby":
      return "Ashby";
    case "workday":
      return "Workday";
    default: {
      const u = url.toLowerCase();
      if (u.includes("linkedin.com")) return "LinkedIn";
      if (u.includes("indeed.com")) return "Indeed";
      if (u.includes("glassdoor.com")) return "Glassdoor";
      if (u.includes("ziprecruiter.com")) return "ZipRecruiter";
      if (u.includes("icims.com")) return "iCIMS";
      if (u.includes("taleo.net") || u.includes("oraclecloud.com"))
        return "Taleo";
      if (u.includes("smartrecruiters.com")) return "SmartRecruiters";
      if (u.includes("phenom")) return "Phenom";
      if (matchesHostList(u, AGGREGATOR_HOSTS)) return "job board";
      return "this site";
    }
  }
}

/**
 * Live notice for a pasted job URL — shown under the Tailor input before submit.
 * Returns null when the field is empty or not yet a URL-like string.
 */
export function jobLinkAutofillNotice(url: string): {
  supported: boolean;
  title: string;
  detail: string;
} | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (!/^https?:\/\//i.test(trimmed) && !trimmed.includes(".")) return null;

  const label = autofillPlatformLabel(trimmed);

  if (supportsAutofill(trimmed)) {
    const platform = detectAts(trimmed);
    if (
      platform === "greenhouse" ||
      platform === "lever" ||
      platform === "ashby"
    ) {
      return {
        supported: true,
        title: `Auto-fill available · ${label}`,
        detail:
          "After you tailor, we can open the apply page and fill fields for you to review.",
      };
    }
    return {
      supported: true,
      title: "Auto-fill may work on this link",
      detail:
        "We'll try after you tailor. If the site blocks automation, use form answers to paste manually.",
    };
  }

  return {
    supported: false,
    title: `Auto-fill not available · ${label}`,
    detail: shortManualApplyHint(trimmed),
  };
}

/** Compact copy for the Tailor URL input (vs full manualApplyNotice). */
function shortManualApplyHint(applyUrl: string): string {
  const platform = detectAts(applyUrl);
  const u = applyUrl.toLowerCase();

  if (platform === "workday" || u.includes("workday")) {
    return "Workday needs a signed-in account. You'll still get a tailored resume, cover letter, and copy-paste form answers.";
  }
  if (u.includes("linkedin.com")) {
    return "LinkedIn blocks automated browsers. Switch to Screenshots or Paste text if the link won't load — tailored docs and form answers still work.";
  }
  if (
    u.includes("indeed.com") ||
    u.includes("glassdoor.com") ||
    u.includes("ziprecruiter.com")
  ) {
    return "Job boards gate apply links. Prefer the company's career-page URL when you can — tailored docs and form answers still work.";
  }
  if (u.includes("icims.com") || u.includes("taleo") || u.includes("phenom")) {
    return "This ATS isn't supported for auto-fill yet. You'll get tailored docs and form answers to paste on the company site.";
  }
  return "This link can't be auto-filled. You'll still get a tailored resume, cover letter, and form answers to apply manually.";
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
export function autofillConfidence(
  platform: AtsPlatform,
): "high" | "medium" | "low" {
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
export function multiStepApplyHint(_url: string): string {
  return (
    "This application has multiple steps. Auto-fill fills each page and clicks " +
    '"Save & Continue" automatically. If it stops before the end, click "Continue Autofill" ' +
    "to pick up where it left off. Review each step in the browser before final submit."
  );
}
