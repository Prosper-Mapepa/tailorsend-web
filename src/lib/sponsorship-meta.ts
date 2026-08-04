/**
 * Extensible company sponsorship metadata.
 * Populated by future DOL LCA / E-Verify importers — leave empty until then.
 */
export type SponsorshipMeta = {
  /** Calendar years with H-1B LCA filings (when known). */
  h1bFilingYears?: number[];
  /** Approximate LCA / petition count from public data. */
  h1bFilingCount?: number;
  /** Years with employment-based green card filings. */
  greenCardFilingYears?: number[];
  greenCardFilingCount?: number;
  /** Data provenance, e.g. "dol-lca", "manual", "e-verify-list". */
  source?: string;
  /** ISO timestamp of last successful dataset sync. */
  lastSyncedAt?: string;
  /** Free-form notes for operators. */
  notes?: string;
  [key: string]: unknown;
};

export function emptySponsorshipMeta(): SponsorshipMeta {
  return {};
}

export function parseSponsorshipMeta(raw: string | null | undefined): SponsorshipMeta {
  if (!raw) return emptySponsorshipMeta();
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as SponsorshipMeta;
    }
  } catch {
    /* ignore */
  }
  return emptySponsorshipMeta();
}

export function mergeSponsorshipMeta(
  current: SponsorshipMeta,
  patch: SponsorshipMeta,
): SponsorshipMeta {
  const merged: SponsorshipMeta = { ...current, ...patch };
  if (patch.h1bFilingYears || current.h1bFilingYears) {
    merged.h1bFilingYears = Array.from(
      new Set([...(current.h1bFilingYears ?? []), ...(patch.h1bFilingYears ?? [])]),
    ).sort((a, b) => b - a);
  }
  if (patch.greenCardFilingYears || current.greenCardFilingYears) {
    merged.greenCardFilingYears = Array.from(
      new Set([
        ...(current.greenCardFilingYears ?? []),
        ...(patch.greenCardFilingYears ?? []),
      ]),
    ).sort((a, b) => b - a);
  }
  return merged;
}
