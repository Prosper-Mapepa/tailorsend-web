import {
  SEASON_TOTAL_KITS,
  isKitSubscriptionPlan,
  isUnlimitedPlan,
  subscriptionKitsPerMonth,
  type BillingPlan,
  type FreeLimits,
  freeLimits,
  type UsageAction,
} from "./plans";

export interface UsageAccountSnapshot {
  plan: BillingPlan;
  isStudent: boolean;
  creditBalance: number;
  periodStart: Date;
  tailorKitsUsed: number;
  autofillKitsUsed: number;
  planKitsUsed: number;
  seasonKitsTotal: number;
  seasonEndsAt: Date | null;
  flexPausedUntil: Date | null;
}

export interface UsageSummary extends UsageAccountSnapshot {
  limits: FreeLimits;
  tailorRemaining: number;
  autofillRemaining: number;
  planKitsRemaining: number;
  /** True when plan is unlimited and not paused. */
  unlimited: boolean;
  periodResetsAt: Date;
  flexPaused: boolean;
  seasonActive: boolean;
}

export type ConsumeSource =
  | "free_monthly"
  | "flex_plan"
  | "season_plan"
  | "unlimited_plan"
  | "credits"
  | "already_charged";

export interface ConsumeDecision {
  allowed: boolean;
  source?: ConsumeSource;
  reason?: string;
}

function startOfUtcMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function addMonths(d: Date, months: number): Date {
  const out = new Date(d);
  out.setUTCMonth(out.getUTCMonth() + months);
  return out;
}

export function periodResetsAt(periodStart: Date, now = new Date()): Date {
  const start = startOfUtcMonth(now);
  return addMonths(start, 1);
}

export function shouldResetMonthlyPeriod(
  periodStart: Date,
  now = new Date(),
): boolean {
  return startOfUtcMonth(periodStart).getTime() < startOfUtcMonth(now).getTime();
}

export function resetMonthlyCounters(
  account: UsageAccountSnapshot,
  now = new Date(),
): UsageAccountSnapshot {
  if (!shouldResetMonthlyPeriod(account.periodStart, now)) return account;
  return {
    ...account,
    periodStart: startOfUtcMonth(now),
    tailorKitsUsed: 0,
    autofillKitsUsed: 0,
    planKitsUsed: 0,
  };
}

export function isFlexPaused(
  account: UsageAccountSnapshot,
  now = new Date(),
): boolean {
  return Boolean(
    account.flexPausedUntil && account.flexPausedUntil.getTime() > now.getTime(),
  );
}

export function isSeasonActive(
  account: UsageAccountSnapshot,
  now = new Date(),
): boolean {
  if (account.plan !== "season") return false;
  if (!account.seasonEndsAt) return false;
  return account.seasonEndsAt.getTime() > now.getTime();
}

export function buildUsageSummary(
  account: UsageAccountSnapshot,
  now = new Date(),
): UsageSummary {
  const normalized = resetMonthlyCounters(account, now);
  const limits = freeLimits(normalized.isStudent);
  const flexPaused = isFlexPaused(normalized, now);
  const seasonActive = isSeasonActive(normalized, now);

  const unlimited = isUnlimitedPlan(normalized.plan) && !flexPaused;

  let planKitsRemaining = 0;
  if (unlimited) {
    planKitsRemaining = Number.MAX_SAFE_INTEGER;
  } else if (isKitSubscriptionPlan(normalized.plan) && !flexPaused) {
    planKitsRemaining = Math.max(
      0,
      subscriptionKitsPerMonth(normalized.plan) - normalized.planKitsUsed,
    );
  } else if (seasonActive) {
    const total = normalized.seasonKitsTotal || SEASON_TOTAL_KITS;
    planKitsRemaining = Math.max(0, total - normalized.planKitsUsed);
  }

  const tailorRemainingFree = Math.max(
    0,
    limits.tailorPerMonth - normalized.tailorKitsUsed,
  );
  const autofillRemainingFree = Math.max(
    0,
    limits.autofillPerMonth - normalized.autofillKitsUsed,
  );

  const pool = unlimited
    ? Number.MAX_SAFE_INTEGER
    : planKitsRemaining + normalized.creditBalance;

  return {
    ...normalized,
    limits,
    tailorRemaining:
      normalized.plan === "free"
        ? tailorRemainingFree + (planKitsRemaining + normalized.creditBalance)
        : pool,
    autofillRemaining:
      normalized.plan === "free"
        ? autofillRemainingFree + (planKitsRemaining + normalized.creditBalance)
        : pool,
    planKitsRemaining,
    unlimited,
    periodResetsAt: periodResetsAt(normalized.periodStart, now),
    flexPaused,
    seasonActive,
  };
}

export function canConsume(
  summary: UsageSummary,
  action: UsageAction,
  alreadyCharged: boolean,
): ConsumeDecision {
  if (alreadyCharged) {
    return { allowed: true, source: "already_charged" };
  }

  if (summary.plan === "free") {
    const freeRemaining =
      action === "tailor"
        ? summary.limits.tailorPerMonth - summary.tailorKitsUsed
        : action === "autofill"
          ? summary.limits.autofillPerMonth - summary.autofillKitsUsed
          : 0;

    if (freeRemaining > 0) {
      return { allowed: true, source: "free_monthly" };
    }
    if (summary.creditBalance > 0) {
      return { allowed: true, source: "credits" };
    }
    if (action === "incorporate") {
      return {
        allowed: false,
        reason:
          "Add edge ideas is included with credits or a paid plan. Get a pack from Billing.",
      };
    }
    const label = action === "tailor" ? "tailor" : "autofill";
    return {
      allowed: false,
      reason: `Monthly ${label} limit reached. Get kits or upgrade on Billing.`,
    };
  }

  if (
    (isKitSubscriptionPlan(summary.plan) || isUnlimitedPlan(summary.plan)) &&
    summary.flexPaused
  ) {
    if (summary.creditBalance > 0) {
      return { allowed: true, source: "credits" };
    }
    return {
      allowed: false,
      reason: "Subscription is paused. Use credits or resume on Billing.",
    };
  }

  if (summary.unlimited) {
    return { allowed: true, source: "unlimited_plan" };
  }

  if (summary.planKitsRemaining > 0) {
    return {
      allowed: true,
      source: summary.plan === "season" ? "season_plan" : "flex_plan",
    };
  }

  if (summary.creditBalance > 0) {
    return { allowed: true, source: "credits" };
  }

  return {
    allowed: false,
    reason:
      "No application kits left this period. Buy a credit pack or upgrade on Billing.",
  };
}

export function applyConsumption(
  account: UsageAccountSnapshot,
  action: UsageAction,
  source: ConsumeSource,
): UsageAccountSnapshot {
  if (source === "already_charged") return account;

  const next = { ...account };
  switch (source) {
    case "free_monthly":
      if (action === "tailor") next.tailorKitsUsed += 1;
      else if (action === "autofill") next.autofillKitsUsed += 1;
      break;
    case "flex_plan":
    case "season_plan":
      next.planKitsUsed += 1;
      break;
    case "unlimited_plan":
      // No kit decrement while on Unlimited.
      break;
    case "credits":
      next.creditBalance = Math.max(0, next.creditBalance - 1);
      break;
  }
  return next;
}
