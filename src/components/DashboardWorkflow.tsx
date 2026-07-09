import Link from "next/link";

const STEPS = [
  {
    href: "/profile",
    label: "Profile",
    desc: "Resume & target roles",
  },
  {
    href: "/jobs",
    label: "Jobs",
    desc: "Scan & match",
  },
  {
    href: "/tailor",
    label: "Tailor",
    desc: "Resume + cover",
  },
  {
    href: "/applications",
    label: "Apply",
    desc: "Review & submit",
  },
] as const;

function StepIcon({ step, className }: { step: number; className?: string }) {
  const props = {
    className: className ?? "h-5 w-5",
    fill: "none",
    viewBox: "0 0 24 24",
    stroke: "currentColor",
    strokeWidth: 1.75,
    "aria-hidden": true as const,
  };

  switch (step) {
    case 0:
      return (
        <svg {...props}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      );
    case 1:
      return (
        <svg {...props}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      );
    case 2:
      return (
        <svg {...props}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      );
  }
}

export function getWorkflowState(
  profileReady: boolean,
  jobCount: number,
  appCount: number,
  submitted: number,
) {
  const done = [
    profileReady,
    jobCount > 0,
    appCount > 0,
    submitted > 0,
  ];
  const activeIndex = done.findIndex((d) => !d);
  const completedCount = done.filter(Boolean).length;
  return {
    done,
    activeIndex: activeIndex === -1 ? 3 : activeIndex,
    completedCount,
    allDone: activeIndex === -1,
  };
}

function getActiveHint(
  activeIndex: number,
  hasResume: boolean,
  roleCount: number,
) {
  if (activeIndex === 0) {
    if (!hasResume && roleCount === 0) {
      return "Upload your resume and add target roles to unlock job matching.";
    }
    if (!hasResume) return "Upload your resume so we can tailor applications.";
    if (roleCount === 0) return "Add target roles — we use them to score every job.";
    return "Finish your profile to start matching jobs.";
  }
  if (activeIndex === 1) return "Search boards and save roles worth applying to.";
  if (activeIndex === 2) return "Pick a saved job and generate a tailored resume + cover.";
  if (activeIndex === 3) return "Autofill the application, review everything, then submit.";
  return "You've completed the full workflow. Keep applying!";
}

export function DashboardWorkflow({
  profileReady,
  jobCount,
  appCount,
  submitted,
  hasResume,
  roleCount,
}: {
  profileReady: boolean;
  jobCount: number;
  appCount: number;
  submitted: number;
  hasResume: boolean;
  roleCount: number;
}) {
  const { done, activeIndex, completedCount, allDone } = getWorkflowState(
    profileReady,
    jobCount,
    appCount,
    submitted,
  );
  const active = STEPS[activeIndex]!;
  const hint = getActiveHint(activeIndex, hasResume, roleCount);
  const progress = (completedCount / STEPS.length) * 100;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      {/* Progress strip */}
      <div className="h-1 bg-slate-100">
        <div
          className="h-full bg-emerald-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-900">
                {allDone ? "Workflow complete" : "Your workflow"}
              </h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {completedCount}/{STEPS.length}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">{hint}</p>
          </div>
          <Link
            href={active.href}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-700"
          >
            {allDone ? "View applications" : `Continue to ${active.label}`}
            <span aria-hidden>→</span>
          </Link>
        </div>

        {/* Desktop pipeline */}
        <div className="mt-8 hidden md:block">
          <div className="flex items-start">
            {STEPS.map((step, i) => {
              const isDone = done[i];
              const isActive = i === activeIndex && !allDone;
              return (
                <div key={step.href} className="flex flex-1 items-start">
                  <Link
                    href={step.href}
                    className={`group flex flex-1 flex-col items-center px-1 text-center transition ${
                      isActive ? "-translate-y-0.5" : "hover:-translate-y-0.5"
                    }`}
                  >
                    <div
                      className={`relative flex h-11 w-11 items-center justify-center rounded-xl transition ${
                        isDone
                          ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                          : isActive
                            ? "bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500"
                            : "bg-slate-50 text-slate-400 ring-1 ring-slate-200"
                      }`}
                    >
                      {isDone ? (
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                          aria-hidden
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : (
                        <StepIcon step={i} />
                      )}
                      {isActive && (
                        <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        </span>
                      )}
                    </div>
                    <p
                      className={`mt-2.5 text-sm font-semibold ${
                        isActive
                          ? "text-emerald-800"
                          : isDone
                            ? "text-slate-800"
                            : "text-slate-500"
                      }`}
                    >
                      {step.label}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">{step.desc}</p>
                  </Link>
                  {i < STEPS.length - 1 && (
                    <div
                      className="mt-5 flex flex-1 items-center px-1"
                      aria-hidden
                    >
                      <div
                        className={`h-px w-full ${
                          done[i] ? "bg-emerald-400" : "bg-slate-200"
                        }`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile timeline */}
        <div className="mt-6 space-y-1 md:hidden">
          {STEPS.map((step, i) => {
            const isDone = done[i];
            const isActive = i === activeIndex && !allDone;
            const isLast = i === STEPS.length - 1;
            return (
              <Link
                key={step.href}
                href={step.href}
                className={`flex gap-3 rounded-xl px-2 py-2.5 transition ${
                  isActive ? "bg-emerald-50/80" : "hover:bg-slate-50"
                }`}
              >
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      isDone
                        ? "bg-emerald-600 text-white"
                        : isActive
                          ? "bg-white text-emerald-700 ring-2 ring-emerald-500"
                          : "bg-slate-50 text-slate-400 ring-1 ring-slate-200"
                    }`}
                  >
                    {isDone ? (
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        aria-hidden
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      <StepIcon step={i} className="h-4 w-4" />
                    )}
                  </div>
                  {!isLast && (
                    <div
                      className={`my-1 w-px flex-1 min-h-3 ${
                        isDone ? "bg-emerald-300" : "bg-slate-200"
                      }`}
                    />
                  )}
                </div>
                <div className="min-w-0 pb-1 pt-1">
                  <p
                    className={`text-sm font-semibold ${
                      isActive ? "text-emerald-800" : "text-slate-800"
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className="text-xs text-slate-500">{step.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Profile checklist when profile is the active step */}
        {activeIndex === 0 && !profileReady && (
          <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            <span
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ${
                hasResume
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-800"
              }`}
            >
              {hasResume ? "✓" : "○"} Resume
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ${
                roleCount > 0
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-800"
              }`}
            >
              {roleCount > 0 ? "✓" : "○"} Target roles
              {roleCount > 0 && ` (${roleCount})`}
            </span>
            <Link
              href="/profile"
              className="ml-auto text-xs font-medium text-emerald-600 hover:text-emerald-700"
            >
              Complete profile →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
