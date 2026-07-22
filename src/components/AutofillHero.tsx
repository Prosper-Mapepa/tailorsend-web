"use client";

import { Button } from "@/components/ui";

/** Hero CTA for the Apply step — primary autofill + secondary helpers. */
export function AutofillHero({
  busy,
  disabled,
  disabledReason,
  onAutofill,
  onPreview,
  applyUrl,
}: {
  busy: boolean;
  disabled: boolean;
  disabledReason?: string | null;
  onAutofill: () => void;
  onPreview: () => void;
  applyUrl?: string | null;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-green-50/80 shadow-sm">
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:p-6">
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Signature feature
          </div>
          <h3 className="mt-2.5 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Auto-fill application
          </h3>
          <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-slate-600">
            Fills the company apply page with your tailored answers. Locally it
            opens Chrome so you can review and submit; on the live site it runs
            headless — use the screenshot and form-answers backup, then submit
            yourself.
          </p>
          {disabled && disabledReason && (
            <p className="mt-2 text-sm font-medium text-amber-700">
              {disabledReason}
            </p>
          )}
        </div>

        <div className="flex w-full shrink-0 flex-col gap-2.5 sm:w-auto sm:min-w-[15rem]">
          <Button
            size="lg"
            onClick={onAutofill}
            disabled={disabled || busy}
            className="w-full bg-emerald-600 px-6 text-base shadow-lg shadow-emerald-600/30 hover:bg-emerald-500"
          >
            <span className="inline-flex items-center gap-2">
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-5 w-5"
                aria-hidden
              >
                <path d="M11.983 1.904a.75.75 0 00-1.292-.657l-7.25 9.5A.75.75 0 003.75 12h5.558l-1.291 6.096a.75.75 0 001.292.657l7.25-9.5A.75.75 0 0016.25 8h-5.558l1.291-6.096z" />
              </svg>
              {busy ? "Auto-filling…" : "Start auto-fill"}
            </span>
          </Button>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={onPreview}
              disabled={disabled || busy}
            >
              Preview only
            </Button>
            {applyUrl && !disabled && (
              <a
                href={applyUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1"
              >
                <Button variant="outline" size="sm" className="w-full">
                  Open page
                </Button>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
