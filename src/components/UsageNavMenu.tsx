"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/auth-client";
import { formatPlanLabel } from "@/lib/billing/format";
import type { UsageSummary } from "@/lib/billing/usage-core";

function useUsageSummary() {
  const [usage, setUsage] = useState<UsageSummary | null>(null);

  useEffect(() => {
    apiFetch("/api/billing/usage")
      .then((r) => r.json())
      .then((d) => setUsage(d.usage ?? null))
      .catch(() => setUsage(null));
  }, []);

  return usage;
}

function usageTriggerHint(usage: UsageSummary): string {
  if (usage.plan !== "free") {
    const kits = usage.planKitsRemaining + usage.creditBalance;
    return `${kits} kit${kits === 1 ? "" : "s"} left`;
  }
  if (usage.creditBalance > 0) {
    return `${usage.creditBalance} credit${usage.creditBalance === 1 ? "" : "s"}`;
  }
  const tailor = usage.tailorRemaining;
  const autofill = usage.autofillRemaining;
  if (tailor === 0 && autofill === 0) return "Limit reached";
  return `${tailor} tailor · ${autofill} autofill`;
}

function UsageRow({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="text-sm text-slate-600">{label}</span>
      <span
        className={`text-sm tabular-nums ${muted ? "text-slate-400" : "font-medium text-slate-900"}`}
      >
        {value}
      </span>
    </div>
  );
}

/** Top-nav plan & usage dropdown. */
export function UsageNavMenu() {
  const usage = useUsageSummary();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  if (!usage) return null;

  const plan = formatPlanLabel(usage.plan);
  const hint = usageTriggerHint(usage);
  const resetLabel =
    usage.plan === "free"
      ? new Date(usage.periodResetsAt).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })
      : null;

  return (
    <div className="relative hidden md:block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={`${plan} · ${hint}`}
        className="flex max-w-[9.5rem] items-center gap-1 rounded-xl border border-transparent py-1 pl-2 pr-1.5 text-left transition outline-none hover:border-slate-200 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-emerald-500/40 xl:max-w-[14rem]"
      >
        <span className="truncate text-sm font-medium text-slate-800">{plan}</span>
        <span className="hidden text-slate-300 xl:inline" aria-hidden>
          ·
        </span>
        <span className="hidden truncate text-sm text-slate-500 xl:inline">
          {hint}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Plan and usage"
          className="absolute right-0 z-50 mt-2 w-72 origin-top-right rounded-xl border border-slate-200/80 bg-white p-4 shadow-lg shadow-slate-200/50"
        >
          <div className="border-b border-slate-100 pb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Your plan
            </p>
            <p className="mt-0.5 text-base font-semibold text-slate-900">
              {plan}
              {usage.isStudent ? (
                <span className="ml-1.5 text-sm font-normal text-slate-500">
                  Student
                </span>
              ) : null}
            </p>
            {resetLabel && (
              <p className="mt-1 text-xs text-slate-500">
                Free allowances reset {resetLabel}
              </p>
            )}
          </div>

          <div className="py-2">
            {usage.plan === "free" ? (
              <>
                <UsageRow
                  label="Tailor kits"
                  value={`${usage.tailorRemaining} left`}
                  muted={usage.tailorRemaining === 0}
                />
                <UsageRow
                  label="Autofill kits"
                  value={`${usage.autofillRemaining} left`}
                  muted={usage.autofillRemaining === 0}
                />
                <UsageRow
                  label="Credit balance"
                  value={
                    usage.creditBalance > 0
                      ? `${usage.creditBalance}`
                      : "None"
                  }
                  muted={usage.creditBalance === 0}
                />
              </>
            ) : (
              <>
                <UsageRow
                  label="Plan kits"
                  value={`${usage.planKitsRemaining} left`}
                />
                {usage.creditBalance > 0 && (
                  <UsageRow
                    label="Credits"
                    value={`${usage.creditBalance}`}
                  />
                )}
              </>
            )}
          </div>

          <Link
            href="/billing"
            onClick={() => setOpen(false)}
            className="mt-1 flex w-full items-center justify-center rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
          >
            Manage billing
          </Link>
          <p className="mt-2 text-center text-[11px] leading-snug text-slate-400">
            Credits work on any plan when monthly kits run out.
          </p>
        </div>
      )}
    </div>
  );
}

/** Compact usage summary for mobile drawer. */
export function UsageNavMenuMobile({ onNavigate }: { onNavigate?: () => void }) {
  const usage = useUsageSummary();
  if (!usage) return null;

  const plan = formatPlanLabel(usage.plan);

  return (
    <Link
      href="/billing"
      onClick={onNavigate}
      className="block rounded-lg border border-slate-200/80 bg-slate-50/80 px-3 py-3 transition hover:bg-slate-50"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        Plan & usage
      </p>
      <p className="mt-1 text-sm font-medium text-slate-900">{plan}</p>
      <p className="mt-0.5 text-xs text-slate-500">{usageTriggerHint(usage)}</p>
      <span className="mt-2 inline-block text-xs font-medium text-emerald-600">
        Billing →
      </span>
    </Link>
  );
}
