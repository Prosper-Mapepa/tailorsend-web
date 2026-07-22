import { prisma } from "@/lib/db";
import { US_STATES } from "@/lib/us-states";
import { getProjectLinks } from "@/lib/project-links";
import type {
  Certification,
  Education,
  FormAnswers,
  JobBoardSite,
  Project,
  TargetRole,
  WorkExperience,
} from "@/lib/types";
import type { ResumeContact } from "@/lib/markdown";
import { safeJson } from "@/lib/util";


function normalizeProjects(raw: Project[]): Project[] {
  return raw.map((p) => {
    const links = getProjectLinks(p);
    const appStore =
      links.find((u) => /apps\.apple\.com|itunes\.apple\.com/i.test(u)) ?? "";
    const playStore =
      links.find((u) => /play\.google\.com/i.test(u)) ?? "";
    const web =
      links.find(
        (u) =>
          !/apps\.apple\.com|itunes\.apple\.com|play\.google\.com/i.test(u) &&
          !/github\.com/i.test(u),
      ) ??
      links.find(
        (u) =>
          !/apps\.apple\.com|itunes\.apple\.com|play\.google\.com/i.test(u) &&
          /github\.com\/[^/]+\/[^/]+/i.test(u),
      ) ??
      "";
    return {
      ...p,
      links,
      link: web || p.link || "",
      appStoreLink: appStore || p.appStoreLink || undefined,
      playStoreLink: playStore || p.playStoreLink || undefined,
    };
  });
}

export interface ProfileView {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  website: string;
  baseResume: string;
  summary: string;
  skills: string[];
  projects: Project[];
  workExperience: WorkExperience[];
  education: Education[];
  certifications: Certification[];
  targetRoles: TargetRole[];
  jobBoards: JobBoardSite[];
  visaStatus: string;
  needsSponsorship: boolean;
  gender: string;
  raceEthnicity: string;
  veteranStatus: string;
  disabilityStatus: string;
  hearAboutSource: string;
  usState: string;
  authorizedToWork: string;
  sponsorshipDetails: string;
}

function toView(row: {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  website: string;
  baseResume: string;
  summary: string;
  skills: string;
  projects: string;
  workExperience: string;
  education: string;
  certifications: string;
  targetRoles: string;
  jobBoards: string;
  visaStatus: string;
  needsSponsorship: boolean;
  gender: string;
  raceEthnicity: string;
  veteranStatus: string;
  disabilityStatus: string;
  hearAboutSource: string;
  usState: string;
  authorizedToWork: string;
  sponsorshipDetails: string;
}): ProfileView {
  return {
    id: row.id,
    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
    location: row.location,
    linkedin: row.linkedin,
    github: row.github,
    website: row.website,
    baseResume: row.baseResume,
    summary: row.summary,
    skills: safeJson<string[]>(row.skills, []),
    projects: normalizeProjects(safeJson<Project[]>(row.projects, [])),
    workExperience: safeJson<WorkExperience[]>(row.workExperience, []),
    education: safeJson<Education[]>(row.education, []),
    certifications: safeJson<Certification[]>(row.certifications, []),
    targetRoles: safeJson<TargetRole[]>(row.targetRoles, []),
    jobBoards: safeJson<JobBoardSite[]>(row.jobBoards, []).filter((s) =>
      Boolean(s?.input?.trim()),
    ),
    visaStatus: row.visaStatus,
    needsSponsorship: row.needsSponsorship,
    gender: row.gender,
    raceEthnicity: row.raceEthnicity,
    veteranStatus: row.veteranStatus,
    disabilityStatus: row.disabilityStatus,
    hearAboutSource: row.hearAboutSource,
    usState: row.usState,
    authorizedToWork: row.authorizedToWork,
    sponsorshipDetails: row.sponsorshipDetails,
  };
}

/** Ensure the user's profile row exists, then return a parsed view. */
export async function getProfile(userId: string): Promise<ProfileView> {
  const row = await prisma.profile.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
  return toView(row);
}

/** Build the structured answers the autofiller uses, given tailored docs. */
export function buildFormAnswers(
  profile: ProfileView,
  tailoredResume: string,
  coverLetter: string,
): FormAnswers {
  const [firstName, ...rest] = profile.fullName.trim().split(/\s+/);
  return {
    fullName: profile.fullName,
    firstName: firstName ?? "",
    lastName: rest.join(" "),
    email: profile.email,
    phone: profile.phone,
    location: profile.location,
    linkedin: profile.linkedin,
    github: profile.github,
    website: profile.website,
    resumeText: tailoredResume || profile.baseResume,
    coverLetter,
    extra: {},
  };
}

function inferUsState(explicit: string, location: string): string {
  if (explicit) return explicit;
  const parts = location.split(",").map((s) => s.trim()).filter(Boolean);
  for (const part of parts) {
    if ((US_STATES as readonly string[]).includes(part)) return part;
  }
  return "";
}

/** Profile fields used by Playwright autofill (documents, heuristics). */
export function buildAutofillProfile(profile: ProfileView) {
  const zipMatch = profile.location.match(/\b\d{5}(-\d{4})?\b/);
  const city =
    profile.location.split(",")[0]?.trim() || profile.location.trim();
  return {
    fullName: profile.fullName,
    baseResume: profile.baseResume,
    needsSponsorship: profile.needsSponsorship,
    visaStatus: profile.visaStatus,
    location: profile.location,
    city,
    zipCode: zipMatch?.[0] ?? "",
    currentCompany: profile.workExperience[0]?.company ?? "",
    gender: profile.gender,
    raceEthnicity: profile.raceEthnicity,
    veteranStatus: profile.veteranStatus,
    disabilityStatus: profile.disabilityStatus,
    hearAboutSource: profile.hearAboutSource,
    usState: inferUsState(profile.usState, profile.location),
    authorizedToWork: profile.authorizedToWork,
    sponsorshipDetails: profile.sponsorshipDetails,
  };
}

export function profileResumeContact(
  profile: Pick<
    ProfileView,
    | "fullName"
    | "email"
    | "phone"
    | "location"
    | "linkedin"
    | "github"
    | "website"
  >,
): ResumeContact {
  return {
    fullName: profile.fullName,
    email: profile.email,
    phone: profile.phone,
    location: profile.location,
    linkedin: profile.linkedin,
    github: profile.github,
    website: profile.website,
  };
}
