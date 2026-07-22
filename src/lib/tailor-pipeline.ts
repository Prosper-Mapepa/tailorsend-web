import {
  enhanceTailoredResume,
  repairMissingRoles,
  tailorApplication,
  type TailorProfile,
} from "@/lib/ai";
import { prepareResumeMarkdown } from "@/lib/markdown";
import { ensureCoverLetterDate } from "@/lib/cover-letter";
import { ensureAllProfileProjects } from "@/lib/resume-projects";
import {
  extractJobRubric,
  extractWorkRoles,
  fillableKeywords,
  findMissingRoles,
  patchMissingKeywords,
  scoreAgainstRubric,
  type MatchScore,
} from "@/lib/match-score";
import { sanitizePlaceholderLinks } from "@/lib/util";

export interface TailorJobInput {
  title: string;
  company: string;
  location: string;
  description: string;
}

export interface TailorPipelineResult {
  tailoredResume: string;
  coverLetter: string;
  matchNotes: string;
  linkedInRecruiterNote: string;
  recruiterEmail: string;
  beforeMatch: MatchScore;
  afterMatch: MatchScore;
}

/** Full tailor pipeline with ATS scoring (shared by /api/tailor and job applications). */
export async function runTailorPipeline(
  job: TailorJobInput,
  profile: TailorProfile,
): Promise<TailorPipelineResult> {
  const scoreJob = {
    title: job.title || "the role",
    company: job.company || "the company",
    description: job.description,
  };

  const rubric = await extractJobRubric(scoreJob);
  const keywords = fillableKeywords(rubric);
  const beforeMatch = scoreAgainstRubric(profile.baseResume, rubric);

  const tailored = await tailorApplication({
    job: { ...scoreJob, location: job.location },
    profile,
    targetKeywords: keywords,
  });

  let resume = tailored.tailoredResume;

  const expectedRoles = extractWorkRoles(profile.baseResume);
  const missingRoles = findMissingRoles(resume, expectedRoles);
  if (missingRoles.length) {
    resume = await repairMissingRoles({
      resume,
      missingRoles,
      job: { ...scoreJob, location: job.location },
    });
  }

  let afterMatch = scoreAgainstRubric(resume, rubric);

  for (let round = 0; round < 2 && afterMatch.missing.length > 0; round++) {
    resume = await enhanceTailoredResume({
      resume,
      missingKeywords: afterMatch.missing,
      job: { ...scoreJob, location: job.location },
      profile,
    });
    afterMatch = scoreAgainstRubric(resume, rubric);
    if (afterMatch.score >= 100) break;
  }

  if (afterMatch.missing.length > 0) {
    resume = patchMissingKeywords(resume, afterMatch.missing);
    afterMatch = scoreAgainstRubric(resume, rubric);
  }

  resume = sanitizePlaceholderLinks(resume);
  resume = ensureAllProfileProjects(resume, profile.projects ?? []);
  resume = prepareResumeMarkdown(resume, profile.projects ?? [], {
    fullName: profile.fullName,
    email: profile.email,
    phone: profile.phone,
    location: profile.location,
    linkedin: profile.linkedin,
    github: profile.github,
    website: profile.website,
  });

  return {
    tailoredResume: resume,
    coverLetter: ensureCoverLetterDate(tailored.coverLetter),
    matchNotes: tailored.matchNotes,
    linkedInRecruiterNote: tailored.linkedInRecruiterNote,
    recruiterEmail: tailored.recruiterEmail,
    beforeMatch,
    afterMatch,
  };
}
