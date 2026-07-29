"use client";

import { useEffect, useState } from "react";

/** Client-facing steps that mirror `runTailorPipeline` (timed while the API runs). */
export const TAILOR_PROGRESS_STEPS = [
  "Reading job description…",
  "Scoring your base resume…",
  "Tailoring resume & cover letter…",
  "Filling ATS keywords…",
  "Writing recruiter outreach…",
  "Saving application…",
] as const;

const STEP_MS = 3200;

export type TailorProgress = {
  label: string;
  index: number;
  total: number;
};

/** Advances through tailor stages while `active`; resets when inactive. */
export function useTailorProgress(active: boolean): TailorProgress | null {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      setIndex(0);
      return;
    }
    setIndex(0);
    const id = window.setInterval(() => {
      setIndex((i) =>
        Math.min(i + 1, TAILOR_PROGRESS_STEPS.length - 1),
      );
    }, STEP_MS);
    return () => window.clearInterval(id);
  }, [active]);

  if (!active) return null;
  return {
    label: TAILOR_PROGRESS_STEPS[index] ?? TAILOR_PROGRESS_STEPS[0],
    index,
    total: TAILOR_PROGRESS_STEPS.length,
  };
}
