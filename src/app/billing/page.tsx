"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/auth-client";
import {
  formatCents,
  formatPlanLabel,
  usageKitLabel,
} from "@/lib/billing/format";
import type { CreditPack } from "@/lib/billing/plans";
import {
  FLEX_MONTHLY_KITS,
  FLEX_PRICE_CENTS,
  SEASON_MONTHS,
  SEASON_PRICE_CENTS,
  SEASON_TOTAL_KITS,
} from "@/lib/billing/plans";
import type { UsageSummary } from "@/lib/billing/usage-core";
import { Alert, Button, Card, PageHeader } from "@/components/ui";

export default function BillingPage() {
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await apiFetch("/api/billing/usage");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not load billing.");
      return;
    }
    setUsage(data.usage);
    setPacks(data.packs ?? []);
  }, []);

  useEffect(() => {
    load()
      .catch(() => setError("Could not load billing."))
      .finally(() => setLoading(false));
  }, [load]);

  async function purchasePack(packId: string) {
    setBusy(packId);
    setMessage(null);
    setError(null);
    try {
      const res = await apiFetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "purchase_pack", packId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Purchase failed");
      setUsage(data.usage);
      setMessage(data.message);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function changePlan(plan: "free" | "flex" | "season") {
    setBusy(plan);
    setMessage(null);
    setError(null);
    try {
      const res = await apiFetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_plan", plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Plan change failed");
      setUsage(data.usage);
      setMessage(data.message);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function pauseFlex() {
    setBusy("pause");
    setMessage(null);
    setError(null);
    try {
      const res = await apiFetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pause_flex" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Pause failed");
      setUsage(data.usage);
      setMessage(data.message);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  function packPrice(pack: CreditPack): number {
    if (!usage?.isStudent || pack.studentPriceCents == null) {
      return pack.priceCents;
    }
    return pack.studentPriceCents;
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-slate-500">
        Loading billing…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Billing & usage"
        description="Application kits power tailoring, autofill, and edge ideas. Students get extra free monthly kits."
      />

      {error && <Alert variant="error">{error}</Alert>}
      {message && <Alert variant="success">{message}</Alert>}

      {usage && (
        <Card>
          <h2 className="text-base font-semibold text-slate-900">
            Current plan: {formatPlanLabel(usage.plan)}
            {usage.isStudent && (
              <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                Student
              </span>
            )}
          </h2>
          <p className="mt-2 text-sm text-slate-600">{usageKitLabel(usage)}</p>
          {usage.plan === "free" && (
            <p className="mt-1 text-xs text-slate-500">
              Free monthly limits reset on{" "}
              {new Date(usage.periodResetsAt).toLocaleDateString()}.
              {usage.isStudent
                ? " As a student you get 5 tailor + 2 autofill per month."
                : " You get 3 tailor + 1 autofill per month."}
            </p>
          )}
          {usage.plan === "flex" && usage.flexPaused && (
            <p className="mt-2 text-sm text-amber-700">
              Flex is paused until{" "}
              {usage.flexPausedUntil
                ? new Date(usage.flexPausedUntil).toLocaleDateString()
                : "—"}
              . Use credits or resume Flex below.
            </p>
          )}
          {usage.creditBalance > 0 && (
            <p className="mt-2 text-sm text-slate-700">
              Credit balance: <strong>{usage.creditBalance}</strong> kits
            </p>
          )}
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="text-base font-semibold text-slate-900">Credit packs</h2>
          <p className="mt-1 text-sm text-slate-500">
            1 kit = one tailor, autofill, or incorporate action.
          </p>
          <ul className="mt-4 space-y-3">
            {packs.map((pack) => (
              <li
                key={pack.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {pack.label}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatCents(packPrice(pack))}
                    {usage?.isStudent &&
                      pack.studentPriceCents != null &&
                      pack.studentPriceCents < pack.priceCents && (
                        <span className="ml-1 text-emerald-600">
                          student price
                        </span>
                      )}
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled={busy !== null}
                  onClick={() => purchasePack(pack.id)}
                >
                  {busy === pack.id ? "…" : "Buy"}
                </Button>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-400">
            Simulated purchase for development — Stripe integration coming later.
          </p>
        </Card>

        <Card>
          <h2 className="text-base font-semibold text-slate-900">Plans</h2>
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-slate-100 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">Flex</p>
                  <p className="text-sm text-slate-500">
                    {formatCents(FLEX_PRICE_CENTS)}/mo · {FLEX_MONTHLY_KITS} kits
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Pause up to 30 days during breaks.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={usage?.plan === "flex" ? "secondary" : "primary"}
                  disabled={busy !== null || usage?.plan === "flex"}
                  onClick={() => changePlan("flex")}
                >
                  {busy === "flex" ? "…" : usage?.plan === "flex" ? "Active" : "Choose"}
                </Button>
              </div>
              {usage?.plan === "flex" && !usage.flexPaused && (
                <button
                  type="button"
                  className="mt-3 text-xs font-medium text-slate-500 underline"
                  disabled={busy !== null}
                  onClick={pauseFlex}
                >
                  Pause Flex for 30 days
                </button>
              )}
            </div>

            <div className="rounded-xl border border-slate-100 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">Season Pass</p>
                  <p className="text-sm text-slate-500">
                    {formatCents(SEASON_PRICE_CENTS)} · {SEASON_TOTAL_KITS} kits
                    over {SEASON_MONTHS} months
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={usage?.plan === "season" ? "secondary" : "primary"}
                  disabled={busy !== null || usage?.plan === "season"}
                  onClick={() => changePlan("season")}
                >
                  {busy === "season" ? "…" : usage?.plan === "season" ? "Active" : "Choose"}
                </Button>
              </div>
            </div>

            {usage && usage.plan !== "free" && (
              <button
                type="button"
                className="text-sm text-slate-500 underline"
                disabled={busy !== null}
                onClick={() => changePlan("free")}
              >
                Downgrade to free
              </button>
            )}
          </div>
        </Card>
      </div>

      <Card className="bg-slate-50/50">
        <h2 className="text-sm font-semibold text-slate-900">How kits work</h2>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-600">
          <li>Tailor resume + cover for a job</li>
          <li>Autofill an application (continue on same job is free)</li>
          <li>Add AI build ideas to your resume</li>
        </ul>
        <Link
          href="/jobs"
          className="mt-4 inline-block text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          Back to jobs →
        </Link>
      </Card>
    </div>
  );
}
