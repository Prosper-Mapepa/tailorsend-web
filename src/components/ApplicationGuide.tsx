"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import {
  GUIDE_STEP_ORDER,
  getStepMeta,
  stepIndex,
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
  onGoToStep,
  stepCounts,
}: {
  currentStep: GuideStepId;
  completedSteps: Set<GuideStepId>;
  onGoToStep: (step: GuideStepId) => void;
  stepCounts?: Partial<Record<GuideStepId, number>>;
}) {
  const currentIdx = stepIndex(currentStep);

  return (
    <nav aria-label="Application progress" className="w-full">
      <ol className="relative flex items-start justify-between gap-0">
        {/* Progress track behind the steps */}
        <div
          className="pointer-events-none absolute left-[10%] right-[10%] top-5 h-0.5 bg-slate-200 sm:top-6"
          aria-hidden
        >
          <div
            className="h-full bg-emerald-500 transition-all duration-500 ease-out"
            style={{
              width: `${(currentIdx / Math.max(GUIDE_STEP_ORDER.length - 1, 1)) * 100}%`,
            }}
          />
        </div>

        {GUIDE_STEP_ORDER.map((id, i) => {
          const done = completedSteps.has(id);
          const active = id === currentStep;
          const count = stepCounts?.[id] ?? 0;
          const reached = done || active || i < currentIdx;

          return (
            <li key={id} className="relative z-10 flex min-w-0 flex-1 flex-col items-center">
              <button
                type="button"
                onClick={() => onGoToStep(id)}
                className="group flex w-full flex-col items-center gap-2 outline-none"
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition duration-200 sm:h-12 sm:w-12 sm:text-base ${
                    active
                      ? "scale-110 bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 ring-4 ring-emerald-100"
                      : done
                        ? "bg-emerald-500 text-white shadow-sm group-hover:bg-emerald-600"
                        : reached
                          ? "bg-emerald-100 text-emerald-700 ring-2 ring-emerald-200 group-hover:bg-emerald-200"
                          : "bg-white text-slate-400 ring-2 ring-slate-200 group-hover:ring-slate-300 group-hover:text-slate-600"
                  }`}
                >
                  {done && !active ? (
                    <svg
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-5 w-5"
                      aria-hidden
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>
                <span className="flex flex-col items-center gap-0.5 px-0.5 text-center">
                  <span
                    className={`text-xs font-semibold sm:text-sm ${
                      active
                        ? "text-emerald-800"
                        : done
                          ? "text-emerald-700"
                          : "text-slate-500 group-hover:text-slate-700"
                    }`}
                  >
                    {SHORT_LABELS[id]}
                    {count > 0 ? (
                      <span className="ml-1 tabular-nums text-emerald-600">
                        ({count})
                      </span>
                    ) : null}
                  </span>
                  {active && (
                    <span className="hidden h-1 w-6 rounded-full bg-emerald-500 sm:block" />
                  )}
                </span>
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
  stepCounts,
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
  stepCounts?: Partial<Record<GuideStepId, number>>;
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
    onGoToStep,
    stepCounts,
  };

  const renderActions = (compact = false) =>
    !allDone ? (
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {dirty &&
          onSave &&
          (currentStep === "resume" || currentStep === "cover") && (
            <Button
              variant="secondary"
              size={compact ? "sm" : "md"}
              loading={saving}
              onClick={onSave}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          )}
        {meta.canSkip && onSkip && currentStep === "edge" && (
          <Button
            variant="ghost"
            size={compact ? "sm" : "md"}
            onClick={onSkip}
          >
            {meta.skipLabel}
          </Button>
        )}
        <Button
          size={compact ? "sm" : "lg"}
          onClick={onNext}
          disabled={saving}
        >
          {isLast ? "Done" : meta.nextLabel}
        </Button>
      </div>
    ) : null;

  return (
    <div className="mb-6">
      <div ref={sentinelRef} className="h-px" aria-hidden />

      <div className="space-y-5">
        <GuideStepper {...stepperProps} />

        {currentStep !== "status" && (
          <div className="flex flex-col gap-3 border-t border-slate-200/80 pt-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
            <div className="min-w-0 flex-1">
              {!allDone ? (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                    Step {meta.number} of {GUIDE_STEP_ORDER.length}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
                    {meta.title}
                  </h2>
                  <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-500">
                    {meta.prompt}
                    {dirty &&
                      (currentStep === "resume" ||
                        currentStep === "cover") && (
                      <span className="ml-1 font-medium text-amber-700">
                        Unsaved edits.
                      </span>
                    )}
                  </p>
                </>
              ) : (
                <p className="text-sm font-medium text-emerald-700">
                  Workflow complete — tap any step above to revisit it.
                </p>
              )}
            </div>
            {renderActions()}
          </div>
        )}
      </div>

      {stepperPinned && (
        <div className="fixed inset-x-0 top-14 z-40 border-b border-slate-200/80 bg-white/95 shadow-md backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 sm:px-6">
            <div className="min-w-0 flex-1 overflow-x-auto">
              <ol className="flex min-w-max items-center gap-1.5">
                {GUIDE_STEP_ORDER.map((id, i) => {
                  const done = completedSteps.has(id);
                  const active = id === currentStep;
                  const count = stepCounts?.[id] ?? 0;
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => onGoToStep(id)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                          active
                            ? "bg-emerald-600 text-white"
                            : done
                              ? "bg-emerald-50 text-emerald-800"
                              : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <span>{done && !active ? "✓" : i + 1}</span>
                        {SHORT_LABELS[id]}
                        {count > 0 ? ` · ${count}` : ""}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
            {renderActions(true)}
          </div>
        </div>
      )}
    </div>
  );
}
