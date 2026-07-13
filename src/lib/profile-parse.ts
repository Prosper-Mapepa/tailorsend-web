import { parseResume } from "@/lib/ai";
import { prisma } from "@/lib/db";
import { getProfile } from "@/lib/profile";
import { enrichParsedResume } from "@/lib/resume-import";

export type ProfileImportStats = {
  workExperience: number;
  education: number;
  projects: number;
  certifications: number;
  skills: number;
  hasLinkedIn: boolean;
  hasGitHub: boolean;
  hasWebsite: boolean;
};

/** Pull obvious email/phone from the resume header without calling AI. */
export function quickExtractContact(text: string): {
  email: string;
  phone: string;
} {
  const header = text.slice(0, 900);
  const email =
    header.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0]?.toLowerCase() ?? "";
  const phone =
    header.match(/(?:\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/)
      ?.[0]
      ?.trim() ?? "";
  return { email, phone };
}

export function importStats(parsed: Awaited<ReturnType<typeof parseResume>>): ProfileImportStats {
  return {
    workExperience: parsed.workExperience.length,
    education: parsed.education.length,
    projects: parsed.projects.length,
    certifications: parsed.certifications.length,
    skills: parsed.skills.length,
    hasLinkedIn: Boolean(parsed.linkedin),
    hasGitHub: Boolean(parsed.github),
    hasWebsite: Boolean(parsed.website),
  };
}

/** Run AI parse on resume text and persist structured profile fields. */
export async function parseAndSaveProfile(
  userId: string,
  text: string,
): Promise<{ profile: Awaited<ReturnType<typeof getProfile>>; imported: ProfileImportStats }> {
  const parsed = enrichParsedResume(text, await parseResume(text));

  await prisma.profile.upsert({
    where: { userId },
    create: {
      userId,
      fullName: parsed.fullName,
      email: parsed.email,
      phone: parsed.phone,
      location: parsed.location,
      linkedin: parsed.linkedin,
      github: parsed.github,
      website: parsed.website,
      summary: parsed.summary,
      baseResume: text,
      skills: JSON.stringify(parsed.skills),
      workExperience: JSON.stringify(parsed.workExperience),
      education: JSON.stringify(parsed.education),
      certifications: JSON.stringify(parsed.certifications),
      projects: JSON.stringify(parsed.projects),
    },
    update: {
      fullName: parsed.fullName,
      email: parsed.email,
      phone: parsed.phone,
      location: parsed.location,
      linkedin: parsed.linkedin,
      github: parsed.github,
      website: parsed.website,
      summary: parsed.summary,
      baseResume: text,
      skills: JSON.stringify(parsed.skills),
      workExperience: JSON.stringify(parsed.workExperience),
      education: JSON.stringify(parsed.education),
      certifications: JSON.stringify(parsed.certifications),
      projects: JSON.stringify(parsed.projects),
    },
  });

  const profile = await getProfile(userId);
  return { profile, imported: importStats(parsed) };
}
