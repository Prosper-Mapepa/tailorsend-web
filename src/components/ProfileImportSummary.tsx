import { ProfileCountBadge } from "@/components/ProfileCountBadge";

export interface ImportSummaryData {
  workExperience: number;
  education: number;
  projects: number;
  certifications: number;
  skills: number;
}

function importParts(summary: ImportSummaryData): string[] {
  const parts: string[] = [];
  if (summary.workExperience > 0) {
    parts.push(
      `${summary.workExperience} job${summary.workExperience === 1 ? "" : "s"}`,
    );
  }
  if (summary.education > 0) {
    parts.push(
      `${summary.education} education entr${summary.education === 1 ? "y" : "ies"}`,
    );
  }
  if (summary.projects > 0) {
    parts.push(
      `${summary.projects} project${summary.projects === 1 ? "" : "s"}`,
    );
  }
  if (summary.certifications > 0) {
    parts.push(
      `${summary.certifications} cert${summary.certifications === 1 ? "" : "s"}`,
    );
  }
  if (summary.skills > 0) {
    parts.push(
      `${summary.skills} skill${summary.skills === 1 ? "" : "s"}`,
    );
  }
  return parts;
}

export function importSummarySentence(
  summary: ImportSummaryData,
  extractedChars?: number,
): string {
  const parts = importParts(summary);
  if (parts.length === 0) {
    return "Resume parsed. Review your profile sections below, then save.";
  }
  const charNote =
    extractedChars != null
      ? ` from ${extractedChars.toLocaleString()} characters of text`
      : "";
  return `Imported ${parts.join(", ")}${charNote}. Review each section and save your profile.`;
}

const BADGE_ITEMS: {
  key: keyof ImportSummaryData;
  singular: string;
  plural: string;
}[] = [
  { key: "workExperience", singular: "job", plural: "jobs" },
  { key: "education", singular: "education", plural: "education" },
  { key: "projects", singular: "project", plural: "projects" },
  { key: "certifications", singular: "cert", plural: "certs" },
  { key: "skills", singular: "skill", plural: "skills" },
];

export function ProfileImportSummary({
  summary,
  extractedChars,
  loading,
  error,
  onDismiss,
}: {
  summary?: ImportSummaryData | null;
  extractedChars?: number;
  loading?: boolean;
  error?: string | null;
  onDismiss?: () => void;
}) {
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 px-4 py-3.5">
        <p className="text-sm font-medium text-emerald-900">
          Parsing your resume…
        </p>
        <p className="mt-1 text-sm text-emerald-700/90">
          Extracting contact info, work experience, education, projects,
          certifications, and skills.
        </p>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-emerald-900">
            Resume imported successfully
          </p>
          <p className="mt-1 text-sm leading-relaxed text-emerald-800/90">
            {importSummarySentence(summary, extractedChars)}
          </p>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100/80"
            aria-label="Dismiss"
          >
            ✕
          </button>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {BADGE_ITEMS.map(({ key, singular, plural }) => {
          const n = summary[key];
          if (n <= 0) return null;
          return (
            <span
              key={key}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/80 py-0.5 pl-0.5 pr-2.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200/80"
            >
              <ProfileCountBadge count={n} />
              {n === 1 ? singular : plural}
            </span>
          );
        })}
      </div>
    </div>
  );
}
