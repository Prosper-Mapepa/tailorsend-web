export type ProfileNavItem = { id: string; label: string };

export type ProfileNavGroup = {
  label: string;
  items: ProfileNavItem[];
};

export const PROFILE_NAV_GROUPS: ProfileNavGroup[] = [
  {
    label: "Start",
    items: [{ id: "upload", label: "Upload" }],
  },
  {
    label: "Your resume",
    items: [
      { id: "contact", label: "Contact" },
      { id: "experience", label: "Experience" },
      { id: "education", label: "Education" },
      { id: "projects", label: "Projects" },
      { id: "skills", label: "Skills" },
      { id: "certifications", label: "Certs" },
      { id: "summary", label: "Summary" },
      { id: "resume", label: "Base resume" },
    ],
  },
  {
    label: "Job search",
    items: [
      { id: "roles", label: "Target roles" },
      { id: "boards", label: "Job boards" },
      { id: "visa", label: "Work auth" },
    ],
  },
  {
    label: "Applications",
    items: [
      { id: "application", label: "Defaults" },
      { id: "eeo", label: "EEO" },
    ],
  },
];

export const PROFILE_NAV_ITEMS: ProfileNavItem[] = PROFILE_NAV_GROUPS.flatMap(
  (g) => g.items,
);

export type ProfileCompletion = {
  contact: boolean;
  experience: boolean;
  education: boolean;
  projects: boolean;
  skills: boolean;
  summary: boolean;
  resume: boolean;
};

const CORE_KEYS: (keyof ProfileCompletion)[] = [
  "contact",
  "experience",
  "education",
  "skills",
];

export function profileCompletionStats(completion: ProfileCompletion) {
  const coreDone = CORE_KEYS.filter((k) => completion[k]).length;
  const coreTotal = CORE_KEYS.length;
  const percent = Math.round((coreDone / coreTotal) * 100);
  return { coreDone, coreTotal, percent };
}

export function nextProfileStep(
  completion: ProfileCompletion,
): { id: string; label: string; hint: string } | null {
  if (!completion.contact) {
    return {
      id: "contact",
      label: "Add contact info",
      hint: "name and email for autofill",
    };
  }
  if (!completion.experience) {
    return {
      id: "experience",
      label: "Add work experience",
      hint: "upload a resume or add roles manually",
    };
  }
  if (!completion.education) {
    return {
      id: "education",
      label: "Add education",
      hint: "degrees and training",
    };
  }
  if (!completion.skills) {
    return {
      id: "skills",
      label: "List your skills",
      hint: "comma-separated for ATS matching",
    };
  }
  return null;
}
