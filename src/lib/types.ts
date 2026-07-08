// Shared application-level types.

/** A portfolio project shown on the profile and used when tailoring. */
export interface Project {
  name: string;
  /** Your role on the project, e.g. "Solo developer", "Team of 3". */
  role: string;
  description: string;
  /**
   * All project URLs (website, App Store, Play Store, repo, etc.).
   * Preferred over the legacy link / appStoreLink / playStoreLink fields.
   */
  links?: string[];
  /** @deprecated Prefer `links` — primary website / demo / repo URL. */
  link: string;
  /** @deprecated Prefer `links` — iOS App Store URL. */
  appStoreLink?: string;
  /** @deprecated Prefer `links` — Google Play Store URL. */
  playStoreLink?: string;
  /** Technologies used, e.g. ["React", "Postgres"]. */
  tech: string[];
  /** e.g. "Jan 2023" or "2023-01". */
  startDate?: string;
  /** e.g. "Dec 2023", "Present", or empty if ongoing. */
  endDate?: string;
}

/** Paid or internship role from the candidate's work history. */
export interface WorkExperience {
  company: string;
  title: string;
  location: string;
  /** e.g. "Jan 2022" or "2022-01". */
  startDate: string;
  /** e.g. "Dec 2024" or "Present". */
  endDate: string;
  current: boolean;
  /** Impact bullets — one achievement per entry. */
  highlights: string[];
}

/** Degree, bootcamp, or formal training. */
export interface Education {
  school: string;
  degree: string;
  field: string;
  location: string;
  startDate: string;
  endDate: string;
  gpa: string;
  honors: string;
}

/** Professional certification or license. */
export interface Certification {
  name: string;
  issuer: string;
  date: string;
  url?: string;
}

/** Visa/work-authorization signal detected in a job description. */
export type VisaRisk = "none" | "no_sponsorship" | "citizenship" | "clearance";

/** Recency window for searches. */
export type DatePosted = "all" | "today" | "3days" | "week" | "month";

/** A single target role the user wants to apply for. */
export interface TargetRole {
  /** e.g. "Senior Frontend Engineer" */
  title: string;
  /** Preferred locations, e.g. ["Remote", "London", "New York"]. */
  locations: string[];
  /** Whether remote-only results are acceptable. */
  remote: boolean;
  /** Extra keywords that should appear (e.g. ["React", "TypeScript"]). */
  keywords: string[];
  /** Optional minimum salary (annual, in the user's currency). */
  minSalary?: number;
}

/** Normalized job returned by every source adapter before persistence. */
export interface NormalizedJob {
  source: string;
  externalId: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  url: string;
  applyUrl: string;
  description: string;
  salary: string;
  postedAt: Date | null;
  atsPlatform: AtsPlatform;
  /** Visa/work-authorization signal; computed centrally if omitted by adapters. */
  visaRisk?: VisaRisk;
}

export type AtsPlatform =
  | "greenhouse"
  | "lever"
  | "ashby"
  | "workday"
  | "remoteok"
  | "weworkremotely"
  | "external"
  | "unknown";

/** Parameters passed to each source adapter when searching. */
export interface SearchParams {
  /** Free-text query, usually the role title. */
  query: string;
  /** Location filter (best-effort; some sources ignore it). */
  location?: string;
  /** Restrict to remote roles where supported. */
  remoteOnly?: boolean;
  /** 2-letter country code to scope results (default "us"). */
  country?: string;
  /** Only return jobs posted within this window. */
  datePosted?: DatePosted;
  /** Restrict to full-time roles where the source supports it. */
  fullTimeOnly?: boolean;
  /** Bias JSearch toward these employers (e.g. ["Microsoft", "Amazon"]). */
  targetCompanies?: string[];
  /** Specific ATS company boards to scan, e.g. { greenhouse: ["stripe"], lever: ["netflix"] }. */
  boards?: Partial<Record<string, string[]>>;
  /** Max results per source. */
  limit?: number;
}

export interface SourceResult {
  source: string;
  jobs: NormalizedJob[];
  error?: string;
}

/** Structured answers used by the autofiller. */
export interface FormAnswers {
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  website: string;
  resumeText: string;
  coverLetter: string;
  /** Answers to free-form screening questions, keyed by a normalized question label. */
  extra: Record<string, string>;
}

/** A visible application form field with a generated copy-paste answer. */
export interface FormFieldResponse {
  label: string;
  fieldType: string;
  answer: string;
}
