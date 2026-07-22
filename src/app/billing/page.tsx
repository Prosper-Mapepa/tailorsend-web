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
import {
  ANNUAL_PRICE_CENTS,
  FLEX_PRICE_CENTS,
  isKitSubscriptionPlan,
  storefrontPacks,
} from "@/lib/billing/plans";
import type { UsageSummary } from "@/lib/billing/usage-core";
import { Alert, Button, PageHeader, PageLoader } from "@/components/ui";

type BillingTab = "subscriptions" | "packs";

function CheckItem({ children }: { children: string }) {
  return (
    <li className="flex gap-2 text-[13px] leading-snug text-slate-600">
      <span className="shrink-0 font-semibold text-emerald-600" aria-hidden>
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
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-2.5 text-sm">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="font-semibold text-slate-900">
          {formatPlanLabel(usage.plan)}
        </span>
        {usage.isStudent && (
          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
            Student
          </span>
        )}
        {isKitSubscriptionPlan(usage.plan) && usage.flexPaused && (
          <span className="text-xs text-amber-700">
            Paused until{" "}
            {usage.flexPausedUntil
              ? new Date(usage.flexPausedUntil).toLocaleDateString()
              : "—"}
          </span>
        )}
        {usage.plan === "season" && usage.seasonEndsAt && (
          <span className="text-xs text-slate-500">
            Ends {new Date(usage.seasonEndsAt).toLocaleDateString()}
          </span>
        )}
      </div>
      <div className="ml-auto flex flex-wrap items-baseline gap-4 tabular-nums">
        {isFree ? (
          <>
            <span>
              <strong className="text-slate-900">{tailorLeft}</strong>
              <span className="ml-1 text-xs text-slate-400">tailor</span>
            </span>
            <span>
              <strong className="text-slate-900">{autofillLeft}</strong>
              <span className="ml-1 text-xs text-slate-400">autofill</span>
            </span>
          </>
        ) : (
          <span>
            <strong className="text-slate-900">{totalAvailable}</strong>
            <span className="ml-1 text-xs text-slate-400">kits</span>
          </span>
        )}
        {usage.creditBalance > 0 && (
          <span>
            <strong className="text-emerald-700">{usage.creditBalance}</strong>
            <span className="ml-1 text-xs text-slate-400">credits</span>
          </span>
        )}
      </div>
    </div>
  );
}

function PackageShell({
  badge,
  featured,
  children,
  footer,
}: {
  badge?: string;
  featured?: boolean;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <article
      className={`relative flex h-full flex-col rounded-2xl bg-white p-6 ${
        featured
          ? "border-2 border-emerald-500"
          : "border border-slate-200"
      }`}
    >
      {badge ? (
        <div
          className={`mb-3 inline-flex w-fit rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
            featured
              ? "bg-emerald-600 text-white"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {badge}
        </div>
      ) : (
        <div className="mb-3 h-5" aria-hidden />
      )}
      <div className="flex flex-1 flex-col">{children}</div>
      <div className="mt-6 flex flex-col gap-2">{footer}</div>
    </article>
  );
}

function PackCard({
  pack,
  catalog,
  price,
  perKit,
  stripeEnabled,
  busy,
  anyBusy,
  onBuy,
}: {
  pack: CreditPack;
  catalog: ReturnType<typeof getPackCatalog>;
  price: number;
  perKit: number;
  stripeEnabled: boolean;
  busy: boolean;
  anyBusy: boolean;
  onBuy: () => void;
}) {
  return (
    <PackageShell
      badge={catalog.badge}
      featured={Boolean(catalog.badge)}
      footer={
        <Button
          className="w-full"
          variant={catalog.badge ? "primary" : "secondary"}
          loading={busy}
          disabled={anyBusy}
          onClick={onBuy}
        >
          {stripeEnabled ? `Buy ${catalog.name}` : `Get ${catalog.name}`}
        </Button>
      }
    >
      <h3 className="text-xl font-semibold tracking-tight text-slate-900">
        {catalog.name}
      </h3>
      <p className="mt-1 text-sm text-slate-500">{catalog.tagline}</p>
      <div className="mt-5 flex items-baseline gap-1">
        <span className="text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">
          {formatCents(price)}
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        {pack.kits} kits · {formatCents(Math.round(perKit))}/kit · one-time
      </p>
      <ul className="mt-5 space-y-2.5 border-t border-slate-100 pt-5">
        {catalog.highlights.map((h) => (
          <CheckItem key={h}>{h}</CheckItem>
        ))}
      </ul>
    </PackageShell>
  );
}

function PlanCard({
  planId,
  featured,
  current,
  stripeEnabled,
  busy,
  anyBusy,
  onSubscribe,
  onPause,
  canPause,
}: {
  planId: "flex" | "annual";
  featured?: boolean;
  current: boolean;
  stripeEnabled: boolean;
  busy: boolean;
  anyBusy: boolean;
  onSubscribe: () => void;
  onPause?: () => void;
  canPause?: boolean;
}) {
  const plan = getPlanCatalog(planId);
  const isAnnual = planId === "annual";
  const amount = isAnnual ? ANNUAL_PRICE_CENTS : FLEX_PRICE_CENTS;
  const suffix = isAnnual ? "/yr" : "/mo";
  const meta = isAnnual
    ? `25 kits/mo · ${formatCents(Math.round(ANNUAL_PRICE_CENTS / 12))}/mo effective`
    : "25 kits/mo · cancel anytime";

  return (
    <PackageShell
      badge={current ? "Current plan" : plan.badge}
      featured={featured || current}
      footer={
        <>
          <Button
            className="w-full"
            loading={busy}
            disabled={anyBusy || current}
            onClick={onSubscribe}
          >
            {current
              ? "Active"
              : stripeEnabled
                ? isAnnual
                  ? "Subscribe yearly"
                  : "Subscribe monthly"
                : `Get ${plan.name}`}
          </Button>
          {canPause && (
            <button
              type="button"
              className="w-full text-center text-sm text-slate-500 hover:text-slate-700"
              disabled={anyBusy}
              onClick={onPause}
            >
              Pause for 30 days
            </button>
          )}
        </>
      }
    >
      <h3 className="text-xl font-semibold tracking-tight text-slate-900">
        {plan.name}
      </h3>
      <p className="mt-1 text-sm text-slate-500">{plan.tagline}</p>
      <div className="mt-5 flex items-baseline gap-1">
        <span className="text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">
          {formatCents(amount)}
        </span>
        <span className="text-sm font-medium text-slate-500">{suffix}</span>
      </div>
      <p className="mt-1 text-sm text-slate-500">{meta}</p>
      <ul
        className={`mt-5 space-y-2.5 border-t pt-5 ${
          featured || current ? "border-emerald-100" : "border-slate-100"
        }`}
      >
        {plan.highlights.map((h) => (
          <CheckItem key={h}>{h}</CheckItem>
        ))}
      </ul>
    </PackageShell>
  );
}

function BillingTabs({
  tab,
  onChange,
}: {
  tab: BillingTab;
  onChange: (tab: BillingTab) => void;
}) {
  const tabs: { id: BillingTab; label: string }[] = [
    { id: "subscriptions", label: "Subscriptions" },
    { id: "packs", label: "One-time packs" },
  ];

  return (
    <div
      className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1"
      role="tablist"
      aria-label="Billing options"
    >
      {tabs.map((t) => {
        const active = tab === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              active
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
            onClick={() => onChange(t.id)}
          >
            {t.label}
          </button>
        );
      })}
    </div>
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
  const [tab, setTab] = useState<BillingTab>("subscriptions");

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
      return data.usage ?? null;
    } catch (e) {
      setError((e as Error).message);
      setPacks(storefrontPacks());
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    load()
      .then((u) => {
        if (cancelled || !u) return;
        if (!isKitSubscriptionPlan(u.plan) && u.plan !== "season") {
          setTab("packs");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function startCheckout(
    kind: "pack" | "flex" | "annual" | "season",
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

  async function changePlan(plan: "free" | "flex" | "annual" | "season") {
    if (plan === "flex" || plan === "annual" || plan === "season") {
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
  const onFlex = usage?.plan === "flex";
  const onAnnual = usage?.plan === "annual";
  const onSubscription = onFlex || onAnnual;
  const onSeason = usage?.plan === "season";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        description="One kit = tailor, autofill, or incorporate."
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

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <BillingTabs tab={tab} onChange={setTab} />
          <p className="text-sm text-slate-500">
            {tab === "subscriptions"
              ? "Best value while you search"
              : "No renewal · kits never expire"}
          </p>
        </div>

        {tab === "subscriptions" ? (
          <div
            role="tabpanel"
            className="grid items-stretch gap-5 md:grid-cols-2"
          >
            <PlanCard
              planId="flex"
              current={Boolean(onFlex)}
              stripeEnabled={stripeEnabled}
              busy={busy === "flex"}
              anyBusy={busy !== null}
              onSubscribe={() => changePlan("flex")}
              canPause={Boolean(onFlex && usage && !usage.flexPaused)}
              onPause={pauseFlex}
            />
            <PlanCard
              planId="annual"
              featured
              current={Boolean(onAnnual)}
              stripeEnabled={stripeEnabled}
              busy={busy === "annual"}
              anyBusy={busy !== null}
              onSubscribe={() => changePlan("annual")}
              canPause={Boolean(onAnnual && usage && !usage.flexPaused)}
              onPause={pauseFlex}
            />
          </div>
        ) : (
          <div
            role="tabpanel"
            className="grid items-stretch gap-5 md:grid-cols-2"
          >
            {campus && (
              <PackCard
                pack={campus}
                catalog={getPackCatalog(campus)}
                price={packPrice(campus)}
                perKit={packPrice(campus) / campus.kits}
                stripeEnabled={stripeEnabled}
                busy={busy === campus.id}
                anyBusy={busy !== null}
                onBuy={() => purchasePack(campus.id)}
              />
            )}
            {sprint && (
              <PackCard
                pack={sprint}
                catalog={getPackCatalog(sprint)}
                price={packPrice(sprint)}
                perKit={packPrice(sprint) / sprint.kits}
                stripeEnabled={stripeEnabled}
                busy={busy === sprint.id}
                anyBusy={busy !== null}
                onBuy={() => purchasePack(sprint.id)}
              />
            )}
          </div>
        )}
      </section>

      {onSeason && (
        <Alert variant="info">
          Legacy Season Pass: {usage?.planKitsRemaining ?? 0} kits left
          {usage?.seasonEndsAt
            ? ` through ${new Date(usage.seasonEndsAt).toLocaleDateString()}`
            : ""}
          .
        </Alert>
      )}

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-400">
        {usage && usage.plan !== "free" && !hasSubscription && (
          <button
            type="button"
            className="hover:text-slate-600"
            disabled={busy !== null}
            onClick={() => changePlan("free")}
          >
            Downgrade to free
          </button>
        )}
        {onSubscription && hasSubscription && stripeEnabled && (
          <span>Cancel or change interval via Manage billing</span>
        )}
      </div>
    </div>
  );
}
