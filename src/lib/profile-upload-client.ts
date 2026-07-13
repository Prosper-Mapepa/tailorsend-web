import { apiFetch } from "@/lib/auth-client";
import { readApiJson } from "@/lib/read-api-json";

export type ProfileImportSummary = {
  workExperience: number;
  education: number;
  projects: number;
  certifications: number;
  skills: number;
  hasLinkedIn: boolean;
  hasGitHub: boolean;
  hasWebsite: boolean;
};

export type ProfileUploadResult = {
  profile: Record<string, unknown>;
  extractedChars: number;
  imported?: ProfileImportSummary;
  parseFailed?: boolean;
  parseError?: string;
};

/** Save resume text, then AI-parse structured fields (two requests for Netlify timeouts). */
export async function uploadAndParseResume(
  file: File,
  onPhase?: (phase: "upload" | "parse") => void,
): Promise<ProfileUploadResult> {
  onPhase?.("upload");
  const fd = new FormData();
  fd.append("file", file);

  const importRes = await apiFetch("/api/profile/import", {
    method: "POST",
    body: fd,
  });
  const importData = await readApiJson<{
    error?: string;
    profile?: Record<string, unknown>;
    extractedChars?: number;
  }>(importRes);
  if (!importRes.ok) {
    throw new Error(importData.error ?? "Upload failed");
  }

  onPhase?.("parse");
  const parseRes = await apiFetch("/api/profile/parse", { method: "POST" });
  const parseData = await readApiJson<{
    error?: string;
    profile?: Record<string, unknown>;
    imported?: ProfileImportSummary;
  }>(parseRes);

  if (!parseRes.ok) {
    return {
      profile: importData.profile ?? {},
      extractedChars: importData.extractedChars ?? 0,
      parseFailed: true,
      parseError:
        parseData.error ??
        (parseRes.status === 502 || parseRes.status === 504
          ? "Parsing timed out — your resume text was saved. Review and edit fields on Profile."
          : "Could not parse resume fields."),
    };
  }

  return {
    profile: parseData.profile ?? importData.profile ?? {},
    extractedChars: importData.extractedChars ?? 0,
    imported: parseData.imported,
  };
}
