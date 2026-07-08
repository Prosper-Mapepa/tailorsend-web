"use client";

import { Button } from "@/components/ui";

export interface AutofillFieldRow {
  label: string;
  required: boolean;
  status: "filled" | "skipped" | "failed";
  value?: string;
}

export interface AutofillPanelData {
  ok: boolean;
  fields: AutofillFieldRow[];
  requiredFilled: number;
  requiredTotal: number;
  optionalFilled: number;
  optionalTotal: number;
  passes: number;
  uploadedResume: boolean;
  awaitingHumanSubmit?: boolean;
  error?: string;
  warning?: string;
  botWallDetected?: boolean;
  validationErrors?: number;
  verified?: boolean;
  stepsAdvanced?: number;
  multiStep?: boolean;
}

function pct(filled: number, total: number) {
  if (total === 0) return 100;
  return Math.round((filled / total) * 100);
}

/** Strip Greenhouse field ids and duplicate tokens from discovery descriptors. */
function cleanFieldLabel(raw: string): string {
  if (!raw) return "Field";

  const lower = raw.toLowerCase();
  const presets: [RegExp, string][] = [
    [/^resume|resume\s*\/\s*cv/i, "Resume"],
    [/^cover letter/i, "Cover letter"],
    [/^\s*country\b/i, "Country"],
    [/preferred[\s_-]*first/i, "Preferred first name"],
    [/first[\s_-]*name/i, "First name"],
    [/last[\s_-]*name|surname/i, "Last name"],
    [/e-?mail/i, "Email"],
    [/phone|mobile|tel/i, "Phone"],
    [/location\s*\(city\)|candidate-location/i, "Location"],
    [/zip|postal/i, "Zip code"],
    [/linkedin/i, "LinkedIn"],
    [/github/i, "GitHub"],
    [/eligible to work/i, "Eligible to work"],
    [/legally authorized/i, "Work authorization"],
    [/sponsorship|immigration/i, "Sponsorship"],
    [/gender/i, "Gender"],
    [/race|ethnicity/i, "Race / ethnicity"],
    [/veteran/i, "Veteran status"],
    [/disability/i, "Disability status"],
  ];
  for (const [re, label] of presets) {
    if (re.test(lower)) return label;
  }

  const question = raw.match(/([A-Za-z][^?]{8,}\?)/);
  if (question) return question[1].replace(/\*+/g, "").trim();

  let s = raw.replace(/\*+/g, " ").trim();
  s = s.replace(/\bquestion_\d+\b/gi, "");
  s = s.replace(/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/gi, "");

  const words = s.split(/\s+/).filter(Boolean);
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const w of words) {
    const key = w.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(w);
  }
  s = kept.join(" ").trim();

  if (s.length > 64) s = `${s.slice(0, 61)}…`;
  return s || "Field";
}

function dedupeFilledFields(fields: AutofillFieldRow[]): AutofillFieldRow[] {
  const seen = new Map<string, AutofillFieldRow>();
  for (const f of fields) {
    if (f.status !== "filled") continue;
    const key = cleanFieldLabel(f.label).toLowerCase();
    if (!seen.has(key)) seen.set(key, f);
  }
  return Array.from(seen.values());
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12.5l2.5 2.5L16 9" />
    </svg>
  );
}

export function AutofillPanel({
  data,
  loading,
  onContinue,
  onComplete,
  onClose,
  variant = "inline",
}: {
  data: AutofillPanelData | null;
  loading?: boolean;
  onContinue: () => void;
  onComplete?: () => void;
  onClose?: () => void;
  variant?: "inline" | "card";
}) {
  if (!data && !loading) return null;

  const required = data?.fields.filter((f) => f.required) ?? [];
  const optional = data?.fields.filter((f) => !f.required) ?? [];
  const filledFields = dedupeFilledFields([...required, ...optional]);
  const reqFilled = data?.requiredFilled ?? 0;
  const reqTotal = data?.requiredTotal ?? 0;
  const progress = reqTotal === 0 ? 0 : pct(reqFilled, reqTotal);
  const inProgress = loading || (!data && loading);
  const isComplete =
    !inProgress && progress >= 100 && reqFilled >= reqTotal && reqTotal > 0;
  const multiStep = Boolean(data?.multiStep || (data?.stepsAdvanced ?? 0) > 0);
  const needsMorePasses =
    multiStep && !isComplete && !inProgress && data && !data.verified;
  const shell =
    variant === "card"
      ? "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg"
      : "overflow-hidden rounded-xl border border-slate-200 bg-slate-50/80";

  return (
    <div className={shell}>
      <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          {isComplete ? (
            <CheckIcon className="h-8 w-8 shrink-0 text-emerald-500" />
          ) : (
            <span className="text-lg">⚡</span>
          )}
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900">
              {isComplete ? "Autofill complete" : "Autofill progress"}
            </h2>
            {!inProgress && data && (
              <p className="text-xs text-slate-500">
                {isComplete
                  ? `${reqFilled} required fields filled`
                  : `${reqFilled} of ${reqTotal} required · ${progress}%`}
                {data.verified && !isComplete ? " · validated" : ""}
              </p>
            )}
            {inProgress && (
              <p className="text-xs text-slate-500">Filling application…</p>
            )}
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-white hover:text-slate-600"
            aria-label="Dismiss autofill panel"
          >
            Dismiss
          </button>
        )}
      </div>

      <div className="space-y-4 p-4">
        {inProgress && (
          <div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-emerald-400" />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Opening the apply page and filling fields…
            </p>
          </div>
        )}

        {!inProgress && !isComplete && progress < 100 && (
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {isComplete && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Review in the browser, then click <strong>Complete</strong> to
            update your application status.
          </p>
        )}

        {!isComplete && !inProgress && data && (
          <p className="text-xs text-slate-500">
            {needsMorePasses
              ? `Multi-step form — advanced through ${data.stepsAdvanced ?? data.passes} step(s). Click Continue Autofill to fill remaining pages.`
              : data.verified
                ? "Validation passed. Review in the browser before submitting."
                : "Multi-step form? Click Continue Autofill to run another pass."}
          </p>
        )}

        {data?.error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {data.error}
          </p>
        )}
        {data?.warning && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {data.warning}
          </p>
        )}

        {(data?.uploadedResume || data?.awaitingHumanSubmit) && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
            {data.uploadedResume && (
              <span className="text-emerald-700">Resume attached</span>
            )}
            {data.awaitingHumanSubmit && (
              <span>Browser left open for review</span>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            {inProgress ? (
              <div className="space-y-1.5">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-7 animate-pulse rounded-md bg-white/80"
                  />
                ))}
              </div>
            ) : filledFields.length === 0 ? (
              <p className="text-xs text-slate-400">No fields filled yet.</p>
            ) : (
              <ul className="max-h-44 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200/80 bg-white">
                {filledFields.map((f, i) => (
                  <FieldRow key={`${cleanFieldLabel(f.label)}-${i}`} field={f} />
                ))}
              </ul>
            )}
          </div>

          <Button
            className="w-full shrink-0 sm:w-40"
            onClick={() => (isComplete ? onComplete?.() : onContinue())}
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Filling…
              </span>
            ) : isComplete ? (
              "Complete"
            ) : (
              "Continue Autofill"
            )}
          </Button>
        </div>

        {data && data.passes > 1 && !isComplete && (
          <p className="text-center text-xs text-slate-400">
            {data.passes} passes completed
          </p>
        )}
      </div>
    </div>
  );
}

function FieldRow({ field }: { field: AutofillFieldRow }) {
  const label = cleanFieldLabel(field.label);
  const failed = field.status === "failed";

  return (
    <li className="flex items-center gap-2 px-2.5 py-1.5 text-xs">
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
          failed
            ? "bg-red-50 text-red-500"
            : "bg-emerald-50 text-emerald-600"
        }`}
      >
        {failed ? "✕" : "✓"}
      </span>
      <span className="min-w-0 flex-1 truncate text-slate-700">{label}</span>
      {field.value && (
        <span
          className="max-w-[42%] shrink-0 truncate text-right text-slate-400"
          title={field.value}
        >
          {field.value}
        </span>
      )}
    </li>
  );
}
