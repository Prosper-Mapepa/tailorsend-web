"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import {
  ONBOARDING_STEPS,
  markOnboardingComplete,
  type OnboardingStep,
} from "@/lib/onboarding";
import { Button } from "@/components/ui";

function WorkflowStrip({ active }: { active: number }) {
  const labels = ["Profile", "Jobs", "Tailor", "Apply"];
  return (
    <div className="mt-6 flex items-center justify-between gap-1">
      {labels.map((label, i) => {
        const stepIndex = i + 1;
        const isActive = active === stepIndex;
        const isDone = active > stepIndex;
        return (
          <div key={label} className="flex flex-1 flex-col items-center gap-1.5">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition ${
                isActive
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                  : isDone
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-400"
              }`}
            >
              {isDone ? "✓" : stepIndex}
            </div>
            <span
              className={`text-[10px] font-medium sm:text-xs ${
                isActive ? "text-emerald-700" : "text-slate-400"
              }`}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function StepCard({ step }: { step: OnboardingStep }) {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 text-3xl shadow-inner ring-1 ring-emerald-100">
        {step.icon}
      </div>
      <h2 className="mt-5 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
        {step.title}
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-600 sm:text-base">
        {step.body}
      </p>
      {step.navLabel && step.href && (
        <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
          <span className="text-emerald-500">→</span> {step.navLabel} tab
        </p>
      )}
    </div>
  );
}

export function OnboardingTour({
  userId,
  onClose,
}: {
  userId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const total = ONBOARDING_STEPS.length;
  const current = ONBOARDING_STEPS[step];
  const isLast = step === total - 1;
  const workflowStep = step >= 1 && step <= 4 ? step : step > 4 ? 4 : 0;

  const finish = useCallback(() => {
    markOnboardingComplete(userId);
    onClose();
    router.push("/profile#upload");
    requestAnimationFrame(() => {
      document.getElementById("upload")?.scrollIntoView({ behavior: "smooth" });
    });
  }, [userId, onClose, router]);

  const skip = useCallback(() => {
    markOnboardingComplete(userId);
    onClose();
  }, [userId, onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        aria-label="Close tour"
        onClick={skip}
      />

      <div className="relative w-full max-w-lg rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xl shadow-slate-900/10 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
            Quick tour
          </p>
          <button
            type="button"
            onClick={skip}
            className="text-sm font-medium text-slate-400 transition hover:text-slate-600"
          >
            Skip
          </button>
        </div>

        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-500 transition-all duration-300"
            style={{ width: `${((step + 1) / total) * 100}%` }}
          />
        </div>

        <div className="mt-8 min-h-[220px]">
          <StepCard step={current} />
          {workflowStep > 0 && <WorkflowStrip active={workflowStep} />}
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-center gap-1.5 sm:justify-start">
            {ONBOARDING_STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-5 bg-emerald-500" : "w-1.5 bg-slate-200"
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {step > 0 && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep((s) => s - 1)}
              >
                Back
              </Button>
            )}
            {isLast ? (
              <Button type="button" onClick={finish}>
                Upload my resume
              </Button>
            ) : (
              <Button type="button" onClick={() => setStep((s) => s + 1)}>
                {step === 0 ? "Show me how" : "Next"}
              </Button>
            )}
          </div>
        </div>

        {current.href && !isLast && (
          <p className="mt-4 text-center text-xs text-slate-400">
            Or jump there now:{" "}
            <Link
              href={current.href}
              className="font-medium text-emerald-600 hover:text-emerald-700"
              onClick={() => {
                markOnboardingComplete(userId);
                onClose();
              }}
            >
              Open {current.navLabel}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
