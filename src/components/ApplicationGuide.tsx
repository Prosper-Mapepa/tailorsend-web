"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import {
  GUIDE_STEP_ORDER,
  getStepMeta,
  type GuideContext,
  type GuideStepId,
} from "@/lib/application-guide";

const SHORT_LABELS: Record<GuideStepId, string> = {
  resume: "Resume",
  cover: "Cover",
  edge: "Edge",
  apply: "Apply",
  status: "Status",
};

function GuideStepper({
  currentStep,
  completedSteps,
  context,
  onGoToStep,
  compact = false,
}: {
  currentStep: GuideStepId;
  completedSteps: Set<GuideStepId>;
  context: GuideContext;
  onGoToStep: (step: GuideStepId) => void;
  compact?: boolean;
}) {
  return (
    <nav aria-label="Application progress" className="overflow-x-auto">
      <ol
        className={`flex min-w-max items-center ${compact ? "gap-1" : "gap-1 sm:gap-2"}`}
      >
        {GUIDE_STEP_ORDER.map((id, i) => {
          const done = completedSteps.has(id);
          const active = id === currentStep;
          const stepMeta = getStepMeta(id, context);
          return (
            <li key={id} className="flex items-center gap-1 sm:gap-2">
              {i > 0 && (
                <span
                  className={`hidden h-px sm:block ${
                    compact ? "w-3" : "w-4 sm:w-6"
                  } ${done ? "bg-emerald-300" : "bg-slate-200"}`}
                  aria-hidden
                />
              )}
              <button
                type="button"
                onClick={() => onGoToStep(id)}
                className={`flex items-center gap-1.5 rounded-full font-medium transition outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
                  compact
                    ? "px-2 py-1 text-xs"
                    : "px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm"
                } ${
                  active
                    ? "bg-emerald-600 text-white shadow-sm"
                    : done
                      ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                }`}
              >
                <span
                  className={`flex shrink-0 items-center justify-center rounded-full font-bold ${
                    compact
                      ? "h-5 w-5 text-[10px]"
                      : "h-5 w-5 text-[10px] sm:h-6 sm:w-6 sm:text-xs"
                  } ${
                    active
                      ? "bg-white/20 text-white"
                      : done
                        ? "bg-emerald-200 text-emerald-900"
                        : "bg-white text-slate-400"
                  }`}
                >
                  {done ? "✓" : stepMeta.number}
                </span>
                <span className={compact ? "inline" : "hidden sm:inline"}>
                  {compact ? SHORT_LABELS[id] : stepMeta.title}
                </span>
                {!compact && (
                  <span className="sm:hidden">{SHORT_LABELS[id]}</span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function ApplicationGuide({
  currentStep,
  completedSteps,
  context,
  dirty,
  saving,
  onGoToStep,
  onNext,
  onSkip,
  onSave,
}: {
  currentStep: GuideStepId;
  completedSteps: Set<GuideStepId>;
  context: GuideContext;
  dirty?: boolean;
  saving?: boolean;
  onGoToStep: (step: GuideStepId) => void;
  onNext: () => void;
  onSkip?: () => void;
  onSave?: () => void;
}) {
  const meta = getStepMeta(currentStep, context);
  const isLast = currentStep === "status";
  const allDone = completedSteps.has("status") || context.statusSubmitted;

  const sentinelRef = useRef<HTMLDivElement>(null);
  const [stepperPinned, setStepperPinned] = useState(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setStepperPinned(!entry.isIntersecting),
      { threshold: 0, rootMargin: "-56px 0px 0px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const stepperProps = {
    currentStep,
    completedSteps,
    context,
    onGoToStep,
  };

  return (
    <div className="mb-6 space-y-3">
      <div ref={sentinelRef} className="h-px" aria-hidden />

      <GuideStepper {...stepperProps} />

      {stepperPinned && (
        <div className="fixed inset-x-0 top-14 z-40 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-md">
          <div className="mx-auto max-w-6xl px-4 py-3.5 sm:px-6">
            <GuideStepper {...stepperProps} compact />
          </div>
        </div>
      )}

      {!allDone && (
        <div className="rounded-xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50/90 to-white px-4 py-3.5 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                Step {meta.number} of {GUIDE_STEP_ORDER.length}
              </p>
              <h3 className="mt-0.5 text-sm font-semibold text-slate-900 sm:text-base">
                {meta.title}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                {meta.prompt}
              </p>
              {dirty && (currentStep === "resume" || currentStep === "cover") && (
                <p className="mt-2 text-xs font-medium text-amber-700">
                  You have unsaved edits — save before continuing.
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {dirty && onSave && (currentStep === "resume" || currentStep === "cover") && (
                <Button
                  variant="secondary"
                  loading={saving}
                  onClick={onSave}
                >
                  {saving ? "Saving…" : "Save"}
                </Button>
              )}
              {meta.canSkip && onSkip && currentStep === "edge" && (
                <Button variant="ghost" onClick={onSkip}>
                  {meta.skipLabel}
                </Button>
              )}
              <Button onClick={onNext} disabled={saving}>
                {isLast ? meta.nextLabel : meta.nextLabel}
              </Button>
            </div>
          </div>
        </div>
      )}

      {allDone && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
          Application workflow complete. You can revisit any step using the
          tabs below.
        </p>
      )}
    </div>
  );
}
