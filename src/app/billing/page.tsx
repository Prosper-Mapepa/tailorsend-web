"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/auth-client";
import {
  getPackCatalog,
  getPlanCatalog,
  PLAN_CATALOG,
} from "@/lib/billing/catalog";
import { formatCents, formatPlanLabel } from "@/lib/billing/format";
import type { CreditPack } from "@/lib/billing/plans";
import { CREDIT_PACKS } from "@/lib/billing/plans";
import type { UsageSummary } from "@/lib/billing/usage-core";
import { Alert, Button, Card, PageHeader, PageLoader } from "@/components/ui";

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
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 text-white shadow-lg">
      <div className="px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300/90">
              Your plan
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight">
                {formatPlanLabel(usage.plan)}
              </h2>
              {usage.isStudent && (
                <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium text-emerald-100">
                  Student
                </span>
              )}
            </div>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-300">
              {getPlanCatalog(usage.plan).tagline}
            </p>
          </div>
          <div className="flex gap-6 sm:text-right">
            {isFree ? (
              <>
                <div>
                  <p className="text-3xl font-bold text-white">{tailorLeft}</p>
                  <p className="text-xs text-slate-400">tailor left</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">{autofillLeft}</p>
                  <p className="text-xs text-slate-400">autofill left</p>
                </div>
              </>
            ) : (
              <div>
                <p className="text-4xl font-bold text-emerald-300">
                  {totalAvailable}
                </p>
                <p className="text-xs text-slate-400">kits available</p>
              </div>
            )}
            {usage.creditBalance > 0 && (
              <div>
                <p className="text-3xl font-bold text-white">
                  {usage.creditBalance}
                </p>
                <p className="text-xs text-slate-400">credits</p>
              </div>
            )}
          </div>
        </div>

        {isFree && (
          <p className="mt-4 text-xs text-slate-400">
            Free kits reset {new Date(usage.periodResetsAt).toLocaleDateString()}
            {usage.isStudent
              ? " · 5 tailor + 2 autofill / month on .edu"
              : " · 3 tailor + 1 autofill / month"}
          </p>
        )}
        {!isFree && usage.plan === "flex" && usage.flexPaused && (
          <p className="mt-4 text-sm text-amber-300">
            Flex paused until{" "}
            {usage.flexPausedUntil
              ? new Date(usage.flexPausedUntil).toLocaleDateString()
              : "—"}
          </p>
        )}
        {!isFree && usage.plan === "season" && usage.seasonEndsAt && (
          <p className="mt-4 text-xs text-slate-400">
            Season pass ends{" "}
            {new Date(usage.seasonEndsAt).toLocaleDateString()} ·{" "}
            {usage.planKitsRemaining} plan kits remaining
          </p>
        )}
      </div>
    </div>
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
  const featured = Boolean(catalog.badge);

  return (
    <article
      className={`relative flex flex-col overflow-hidden rounded-2xl border transition hover:shadow-md ${
        featured
          ? "border-emerald-300 bg-gradient-to-b from-emerald-50/80 to-white shadow-sm ring-1 ring-emerald-100"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      {catalog.badge && (
        <div className="bg-emerald-600 px-4 py-1.5 text-center text-[11px] font-semibold uppercase tracking-wider text-white">
          {catalog.badge}
        </div>
      )}
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              {pack.kits} kits
            </p>
            <h3 className="mt-0.5 text-xl font-bold text-slate-900">
              {catalog.name}
            </h3>
            <p className="mt-1 text-sm font-medium text-slate-600">
              {catalog.tagline}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-2xl font-bold text-slate-900">
              {formatCents(price)}
            </p>
            <p className="text-xs text-slate-400">
              {formatCents(Math.round(perKit))}/kit
            </p>
            {studentDeal && (
              <p className="mt-0.5 text-xs font-semibold text-emerald-600">
                Student price
              </p>
            )}
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          {catalog.description}
        </p>

        <ul className="mt-4 space-y-2">
          {catalog.highlights.map((h) => (
            <CheckItem key={h}>{h}</CheckItem>
          ))}
        </ul>

        <p className="mt-4 text-xs text-slate-400">
          <span className="font-medium text-slate-500">Ideal for:</span>{" "}
          {catalog.idealFor}
        </p>

        <Button
          className="mt-5 w-full"
          loading={busy}
          disabled={anyBusy}
          onClick={onBuy}
        >
          {stripeEnabled ? "Checkout" : `Buy ${catalog.name}`}
        </Button>
      </div>
    </article>
  );
}

function PlanOption({
  plan,
  active,
  stripeEnabled,
  busy,
  busyId,
  onChoose,
  children,
}: {
  plan: (typeof PLAN_CATALOG)[number];
  active: boolean;
  stripeEnabled: boolean;
  busy: string | null;
  busyId: string;
  onChoose?: () => void;
  children?: React.ReactNode;
}) {
  const isFree = plan.id === "free";
  const selectable = !isFree && onChoose;

  return (
    <article
      className={`relative flex flex-col rounded-2xl border p-5 sm:p-6 transition ${
        active
          ? "border-emerald-400 bg-emerald-50/60 shadow-sm ring-1 ring-emerald-200"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
      }`}
    >
      {active && (
        <span className="absolute -top-2.5 right-5 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
          Current plan
        </span>
      )}
      {plan.badge && !active && (
        <span className="mb-2 w-fit rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
          {plan.badge}
        </span>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
          <p className="mt-0.5 text-sm font-medium text-emerald-700">
            {plan.tagline}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            {plan.description}
          </p>
        </div>
        <div className="shrink-0 sm:text-right">
          <p className="text-2xl font-bold text-slate-900">{plan.priceLabel}</p>
          <p className="text-xs text-slate-500">{plan.kitsLabel}</p>
          {selectable && (
            <Button
              size="sm"
              className="mt-3 w-full sm:w-auto"
              variant={active ? "secondary" : "primary"}
              loading={busy === busyId}
              disabled={busy !== null || active}
              onClick={onChoose}
            >
              {active
                ? "Active"
                : stripeEnabled
                  ? plan.id === "flex"
                    ? "Subscribe"
                    : "Checkout"
                  : "Choose"}
            </Button>
          )}
        </div>
      </div>

      <ul className="mt-5 grid gap-2 sm:grid-cols-3">
        {plan.highlights.map((h) => (
          <CheckItem key={h}>{h}</CheckItem>
        ))}
      </ul>

      <p className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-400">
        <span className="font-medium text-slate-500">Ideal for:</span>{" "}
        {plan.idealFor}
      </p>

      {children}
    </article>
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
        setPacks(data.packs ?? CREDIT_PACKS);
        return;
      }
      setUsage(data.usage ?? null);
      setPacks(data.packs ?? CREDIT_PACKS);
      setStripeEnabled(Boolean(data.stripeEnabled));
      setHasStripeCustomer(Boolean(data.hasStripeCustomer));
      setHasSubscription(Boolean(data.hasSubscription));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
      setPacks(CREDIT_PACKS);
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

  const paidPlans = PLAN_CATALOG.filter((p) => p.id !== "free");
  const freePlan = PLAN_CATALOG.find((p) => p.id === "free")!;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Billing & usage"
        description={
          <>
            Every kit powers one tailor, autofill, or incorporate action — you
            always review before anything is submitted.
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
          <h2 className="text-lg font-bold text-slate-900">Credit packs</h2>
          <p className="mt-1 text-sm text-slate-500">
            One-time purchases — credits never expire and stack with your plan.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {packs.map((pack) => {
            const catalog = getPackCatalog(pack);
            const price = packPrice(pack);
            const studentDeal =
              Boolean(usage?.isStudent) &&
              pack.studentPriceCents != null &&
              pack.studentPriceCents < pack.priceCents;
            return (
              <PackCard
                key={pack.id}
                pack={pack}
                catalog={catalog}
                price={price}
                perKit={price / pack.kits}
                studentDeal={studentDeal}
                stripeEnabled={stripeEnabled}
                busy={busy === pack.id}
                anyBusy={busy !== null}
                onBuy={() => purchasePack(pack.id)}
              />
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900">Plans</h2>
          <p className="mt-1 text-sm text-slate-500">
            Subscriptions and allowances — pick what fits your search intensity.
          </p>
        </div>

        {usage?.plan === "free" && (
          <div className="mb-4">
            <PlanOption
              plan={freePlan}
              active
              stripeEnabled={stripeEnabled}
              busy={busy}
              busyId="free"
            />
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          {paidPlans.map((plan) => (
            <PlanOption
              key={plan.id}
              plan={plan}
              active={usage?.plan === plan.id}
              stripeEnabled={stripeEnabled}
              busy={busy}
              busyId={plan.id}
              onChoose={() => changePlan(plan.id as "flex" | "season")}
            >
              {plan.id === "flex" &&
                usage?.plan === "flex" &&
                !usage.flexPaused && (
                  <button
                    type="button"
                    className="mt-3 text-left text-sm font-medium text-emerald-700 hover:text-emerald-800"
                    disabled={busy !== null}
                    onClick={pauseFlex}
                  >
                    Pause Flex for 30 days →
                  </button>
                )}
            </PlanOption>
          ))}
        </div>

        {usage && usage.plan !== "free" && !hasSubscription && (
          <button
            type="button"
            className="mt-4 w-full text-center text-sm text-slate-500 hover:text-slate-700"
            disabled={busy !== null}
            onClick={() => changePlan("free")}
          >
            Downgrade to free
          </button>
        )}
      </section>

      <Card className="border-slate-100 bg-slate-50/50">
        <p className="text-center text-sm text-slate-600">
          <span className="font-semibold text-slate-800">What counts as a kit?</span>{" "}
          Tailoring a resume + cover for a role · autofilling an application ·
          adding AI edge ideas. Continuing autofill on the same job is always
          free.
        </p>
      </Card>
    </div>
  );
}
