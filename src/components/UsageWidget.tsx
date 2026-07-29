"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/auth-client";
import { formatPlanLabel, usageKitLabel } from "@/lib/billing/format";
import type { UsageSummary } from "@/lib/billing/usage-core";

export function UsageWidget({
  compact = false,
  slim = false,
  tone = "default",
}: {
  compact?: boolean;
  slim?: boolean;
  /** Muted styling for top nav (does not look like a primary nav item). */
  tone?: "default" | "muted";
}) {
  const [usage, setUsage] = useState<UsageSummary | null>(null);

  useEffect(() => {
    apiFetch("/api/billing/usage")
      .then((r) => r.json())
      .then((d) => setUsage(d.usage ?? null))
      .catch(() => setUsage(null));
  }, []);

  if (!usage) return null;

  const label = usageKitLabel(usage);
  const plan = formatPlanLabel(usage.plan);

  if (compact) {
    const muted = tone === "muted";
    return (
      <Link
        href="/billing"
        className={
          muted
            ? "max-w-[min(100%,14rem)] truncate rounded-md px-2 py-1.5 text-xs text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 sm:max-w-none"
            : "inline-flex rounded-lg border border-emerald-200/80 bg-emerald-50/60 px-2.5 py-1 text-xs font-medium text-emerald-800 transition hover:bg-emerald-50 sm:px-3 sm:py-1.5"
        }
        title={`${plan} plan · ${label}`}
      >
        {muted ? (
          <>
            <span className="font-medium text-slate-700">{plan}</span>
            <span className="hidden text-slate-400 sm:inline"> · </span>
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">
              {" "}
              · {usage.creditBalance > 0 ? `${usage.creditBalance} cr` : "Billing"}
            </span>
          </>
        ) : (
          label
        )}
      </Link>
    );
  }

  if (slim) {
    return (
      <Link
        href="/billing"
        className="flex items-center justify-between gap-3 rounded-lg border border-slate-200/70 bg-slate-50/50 px-4 py-2.5 text-sm transition hover:bg-slate-50"
      >
        <div className="min-w-0">
          <span className="font-medium text-slate-900">{plan}</span>
          <span className="text-slate-500"> · {label}</span>
          {usage.plan === "free" && (
            <span className="block text-xs text-slate-400">
              Resets {new Date(usage.periodResetsAt).toLocaleDateString()}
            </span>
          )}
        </div>
        <span className="shrink-0 text-xs font-medium text-emerald-600">
          Billing →
        </span>
      </Link>
    );
  }

  return (
    <Link
      href="/billing"
      className="block rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-green-50/80 p-4 transition hover:border-emerald-300"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700/80">
            {plan}
            {usage.isStudent ? " · Student" : ""}
          </p>
          <p className="mt-1 text-sm font-medium text-slate-900">{label}</p>
          {usage.plan === "free" && (
            <p className="mt-1 text-xs text-slate-500">
              Resets {new Date(usage.periodResetsAt).toLocaleDateString()}
            </p>
          )}
        </div>
        <span className="text-sm font-medium text-emerald-600">Billing →</span>
      </div>
    </Link>
  );
}
