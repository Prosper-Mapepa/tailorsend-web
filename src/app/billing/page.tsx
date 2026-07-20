"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/auth-client";
import {
  getPackCatalog,
  getPlanCatalog,
} from "@/lib/billing/catalog";
import { formatCents, formatPlanLabel } from "@/lib/billing/format";
import type { CreditPack } from "@/lib/billing/plans";
import { storefrontPacks } from "@/lib/billing/plans";
import type { UsageSummary } from "@/lib/billing/usage-core";
import { Alert, Button, PageHeader, PageLoader } from "@/components/ui";

function CheckItem({ children }: { children: string }) {
  return (
    <li className="flex gap-2 text-sm text-slate-600">
      <span className="mt-0.5 shrink-0 text-emerald-600" aria-hidden>
        ✓
      </span>
      <span>{children}</span>
    </li>
  );
}

function UsageOverview({ usage }: { usage: UsageSummary }) {
  const isFree = usage.plan === "free";
  const totalAvailable = usage.planKitsRemaining + usage.creditBalance;
  const tailorLeft = Math.max(0, usage.limits.tailorPerMonth - usage.tailorKitsUsed);
  const autofillLeft = Math.max(
    0,
    usage.limits.autofillPerMonth - usage.autofillKitsUsed,
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-slate-900">
              {formatPlanLabel(usage.plan)}
            </h2>
            {usage.isStudent && (
              <span className="text-xs font-medium text-emerald-700">
                · Student
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-slate-500">
            {isFree
              ? `Resets ${new Date(usage.periodResetsAt).toLocaleDateString()} · ${
                  usage.isStudent
                    ? "4 tailor + 2 autofill / month"
                    : "2 tailor + 1 autofill / month"
                }`
              : getPlanCatalog(usage.plan).tagline}
          </p>
          {usage.plan === "flex" && usage.flexPaused && (
            <p className="mt-1 text-sm text-amber-700">
              Paused until{" "}
              {usage.flexPausedUntil
                ? new Date(usage.flexPausedUntil).toLocaleDateString()
                : "—"}
            </p>
          )}
          {usage.plan === "season" && usage.seasonEndsAt && (
            <p className="mt-1 text-sm text-slate-500">
              Ends {new Date(usage.seasonEndsAt).toLocaleDateString()} ·{" "}
              {usage.planKitsRemaining} plan kits left
            </p>
          )}
        </div>

        <div className="flex shrink-0 gap-5 sm:gap-6">
          {isFree ? (
            <>
              <div className="text-left sm:text-right">
                <p className="text-xl font-semibold tabular-nums text-slate-900">
                  {tailorLeft}
                </p>
                <p className="text-xs text-slate-400">tailor left</p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xl font-semibold tabular-nums text-slate-900">
                  {autofillLeft}
                </p>
                <p className="text-xs text-slate-400">autofill left</p>
              </div>
            </>
          ) : (
            <div className="text-left sm:text-right">
              <p className="text-xl font-semibold tabular-nums text-slate-900">
                {totalAvailable}
              </p>
              <p className="text-xs text-slate-400">kits available</p>
            </div>
          )}
          {usage.creditBalance > 0 && (
            <div className="text-left sm:text-right">
              <p className="text-xl font-semibold tabular-nums text-emerald-700">
                {usage.creditBalance}
              </p>
              <p className="text-xs text-slate-400">credits</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PackageShell({
  badge,
  accent,
  children,
  footer,
}: {
  badge?: string;
  accent?: boolean;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <article
      className={`flex h-full flex-col rounded-xl border bg-white p-5 ${
        accent
          ? "border-emerald-300 shadow-sm ring-1 ring-emerald-100"
          : "border-slate-200"
      }`}
    >
      <div className="mb-3 h-5">
        {badge ? (
          <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
            {badge}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col">{children}</div>
      <div className="mt-auto flex min-h-[2.75rem] flex-col justify-end gap-2 pt-6">
        {footer}
      </div>
    </article>
  );
}

function PackCard({
  pack,
  catalog,
  price,
  perKit,
  studentDeal,
  stripeEnabled,
  busy,
  anyBusy,
  onBuy,
}: {
  pack: CreditPack;
  catalog: ReturnType<typeof getPackCatalog>;
  price: number;
  perKit: number;
  studentDeal: boolean;
  stripeEnabled: boolean;
  busy: boolean;
  anyBusy: boolean;
  onBuy: () => void;
}) {
  return (
    <PackageShell
      badge={catalog.badge}
      accent={Boolean(catalog.badge)}
      footer={
        <Button
          className="w-full"
          loading={busy}
          disabled={anyBusy}
          onClick={onBuy}
        >
          {stripeEnabled ? `Buy ${catalog.name}` : `Get ${catalog.name}`}
        </Button>
      }
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-900">{catalog.name}</h3>
        <div className="shrink-0 text-right">
          <p className="text-xl font-semibold tabular-nums text-slate-900">
            {formatCents(price)}
          </p>
          {studentDeal ? (
            <p className="text-xs font-medium text-emerald-600">.edu price</p>
          ) : (
            <p className="text-xs text-slate-400">
              {formatCents(Math.round(perKit))}/kit
            </p>
          )}
        </div>
      </div>

      <p className="mt-1 text-sm text-slate-500">{catalog.tagline}</p>
      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400">
        {pack.kits} kits · one-time
      </p>

      <ul className="mt-5 space-y-2">
        {catalog.highlights.map((h) => (
          <CheckItem key={h}>{h}</CheckItem>
        ))}
      </ul>
    </PackageShell>
  );
}

export default function BillingPage() {
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [hasStripeCustomer, setHasStripeCustomer] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch("/api/billing/usage");
      const text = await res.text();
      let data: {
        usage?: UsageSummary;
        packs?: CreditPack[];
        stripeEnabled?: boolean;
        hasStripeCustomer?: boolean;
        hasSubscription?: boolean;
        error?: string;
      } = {};
      try {
        data = JSON.parse(text) as typeof data;
      } catch {
        throw new Error(
          "Billing API returned an invalid response. If you just pulled updates, run npm run db:migrate.",
        );
      }
      if (!res.ok) {
        setError(data.error ?? `Could not load billing (${res.status}).`);
        setPacks(data.packs ?? storefrontPacks());
        return;
      }
      setUsage(data.usage ?? null);
      setPacks(data.packs ?? storefrontPacks());
      setStripeEnabled(Boolean(data.stripeEnabled));
      setHasStripeCustomer(Boolean(data.hasStripeCustomer));
      setHasSubscription(Boolean(data.hasSubscription));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
      setPacks(storefrontPacks());
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  async function startCheckout(
    kind: "pack" | "flex" | "season",
    packId?: string,
  ) {
    const busyId = kind === "pack" ? packId! : kind;
    setBusy(busyId);
    setMessage(null);
    setError(null);
    try {
      const res = await apiFetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          kind === "pack" ? { kind, packId } : { kind },
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Checkout failed");
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error("No checkout URL returned.");
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }

  async function openBillingPortal() {
    setBusy("portal");
    setMessage(null);
    setError(null);
    try {
      const res = await apiFetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not open billing portal");
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error("No portal URL returned.");
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }

  async function purchasePack(packId: string) {
    if (stripeEnabled) {
      await startCheckout("pack", packId);
      return;
    }
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
    if (plan === "flex" || plan === "season") {
      if (stripeEnabled) {
        await startCheckout(plan);
        return;
      }
    }
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

  if (loading) return <PageLoader label="Loading billing…" />;

  const campus = packs.find((p) => p.id === "pack_5");
  const sprint = packs.find((p) => p.id === "pack_15");
  const flexPlan = getPlanCatalog("flex");
  const onFlex = usage?.plan === "flex";
  const onSeason = usage?.plan === "season";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Billing & usage"
        description={
          <>
            Three packages for students. One kit = tailor, autofill, or
            incorporate — you review before submit.
            {!stripeEnabled && (
              <span className="mt-1 block text-xs text-amber-700">
                Dev mode — purchases are simulated until Stripe is configured.
              </span>
            )}
          </>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            {hasStripeCustomer && stripeEnabled && (
              <Button
                variant="secondary"
                size="sm"
                loading={busy === "portal"}
                disabled={busy !== null}
                onClick={openBillingPortal}
              >
                Manage billing
              </Button>
            )}
            <Link href="/jobs">
              <Button variant="ghost" size="sm">
                Back to jobs
              </Button>
            </Link>
          </div>
        }
      />

      {error && <Alert variant="error">{error}</Alert>}
      {message && <Alert variant="success">{message}</Alert>}

      {usage && <UsageOverview usage={usage} />}

      <section>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-slate-900">Packages</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Start with Campus, subscribe monthly, or buy a Sprint for season.
          </p>
        </div>

        <div className="grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campus && (
            <PackCard
              pack={campus}
              catalog={getPackCatalog(campus)}
              price={packPrice(campus)}
              perKit={packPrice(campus) / campus.kits}
              studentDeal={false}
              stripeEnabled={stripeEnabled}
              busy={busy === campus.id}
              anyBusy={busy !== null}
              onBuy={() => purchasePack(campus.id)}
            />
          )}

          <PackageShell
            badge={onFlex ? "Current plan" : flexPlan.badge}
            accent
            footer={
              <>
                <Button
                  className="w-full"
                  loading={busy === "flex"}
                  disabled={busy !== null || onFlex}
                  onClick={() => changePlan("flex")}
                >
                  {onFlex
                    ? "Active"
                    : stripeEnabled
                      ? "Subscribe"
                      : "Get Student Monthly"}
                </Button>
                {onFlex && usage && !usage.flexPaused && (
                  <button
                    type="button"
                    className="w-full text-center text-sm text-slate-500 hover:text-slate-700"
                    disabled={busy !== null}
                    onClick={pauseFlex}
                  >
                    Pause for 30 days
                  </button>
                )}
              </>
            }
          >
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900">
                {flexPlan.name}
              </h3>
              <div className="shrink-0 text-right">
                <p className="text-xl font-semibold tabular-nums text-slate-900">
                  {flexPlan.priceLabel}
                </p>
                <p className="text-xs text-slate-400">recurring</p>
              </div>
            </div>

            <p className="mt-1 text-sm text-slate-500">{flexPlan.tagline}</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400">
              {flexPlan.kitsLabel}
            </p>

            <ul className="mt-5 space-y-2">
              {flexPlan.highlights.map((h) => (
                <CheckItem key={h}>{h}</CheckItem>
              ))}
            </ul>
          </PackageShell>

          {sprint && (
            <PackCard
              pack={sprint}
              catalog={getPackCatalog(sprint)}
              price={packPrice(sprint)}
              perKit={packPrice(sprint) / sprint.kits}
              studentDeal={
                Boolean(usage?.isStudent) &&
                sprint.studentPriceCents != null &&
                sprint.studentPriceCents < sprint.priceCents
              }
              stripeEnabled={stripeEnabled}
              busy={busy === sprint.id}
              anyBusy={busy !== null}
              onBuy={() => purchasePack(sprint.id)}
            />
          )}
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          A kit is one tailor, autofill, or edge-ideas action. Continuing
          autofill on the same job is free.
        </p>
      </section>

      {onSeason && (
        <Alert variant="info">
          You still have a legacy Season Pass with{" "}
          {usage?.planKitsRemaining ?? 0} kits left
          {usage?.seasonEndsAt
            ? ` through ${new Date(usage.seasonEndsAt).toLocaleDateString()}`
            : ""}
          . New purchases use Campus, Student Monthly, or Sprint.
        </Alert>
      )}

      {usage && usage.plan !== "free" && !hasSubscription && (
        <button
          type="button"
          className="w-full text-center text-sm text-slate-400 hover:text-slate-600"
          disabled={busy !== null}
          onClick={() => changePlan("free")}
        >
          Downgrade to free
        </button>
      )}
    </div>
  );
}
