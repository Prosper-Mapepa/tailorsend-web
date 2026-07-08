"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/auth-client";
import { formatPlanLabel, usageKitLabel } from "@/lib/billing/format";
import type { UsageSummary } from "@/lib/billing/usage-core";

export function UsageWidget({ compact = false }: { compact?: boolean }) {
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
    return (
      <Link
        href="/billing"
        className="hidden rounded-lg border border-emerald-200/80 bg-emerald-50/60 px-3 py-1.5 text-xs font-medium text-emerald-800 transition hover:bg-emerald-50 lg:inline-flex"
        title={`${plan} plan`}
      >
        {label}
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
