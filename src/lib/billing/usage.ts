import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  SEASON_MONTHS,
  SEASON_TOTAL_KITS,
  isStudentEmail,
  type BillingPlan,
  type UsageAction,
} from "./plans";
import {
  applyConsumption,
  buildUsageSummary,
  canConsume,
  resetMonthlyCounters,
  type ConsumeSource,
  type UsageAccountSnapshot,
  type UsageSummary,
} from "./usage-core";

export type { UsageSummary, UsageAction, ConsumeSource };

export class UsageLimitError extends Error {
  code = "USAGE_LIMIT" as const;
  summary: UsageSummary;

  constructor(message: string, summary: UsageSummary) {
    super(message);
    this.name = "UsageLimitError";
    this.summary = summary;
  }
}

function toSnapshot(row: {
  plan: string;
  isStudent: boolean;
  creditBalance: number;
  periodStart: Date;
  tailorKitsUsed: number;
  autofillKitsUsed: number;
  planKitsUsed: number;
  seasonKitsTotal: number;
  seasonEndsAt: Date | null;
  flexPausedUntil: Date | null;
}): UsageAccountSnapshot {
  return {
    plan: row.plan as BillingPlan,
    isStudent: row.isStudent,
    creditBalance: row.creditBalance,
    periodStart: row.periodStart,
    tailorKitsUsed: row.tailorKitsUsed,
    autofillKitsUsed: row.autofillKitsUsed,
    planKitsUsed: row.planKitsUsed,
    seasonKitsTotal: row.seasonKitsTotal,
    seasonEndsAt: row.seasonEndsAt,
    flexPausedUntil: row.flexPausedUntil,
  };
}

export async function getOrCreateUsageAccount(
  userId: string,
  email: string,
): Promise<UsageAccountSnapshot> {
  const student = isStudentEmail(email);
  const row = await prisma.usageAccount.upsert({
    where: { userId },
    create: { userId, isStudent: student },
    update: {},
  });

  if (student && !row.isStudent) {
    const updated = await prisma.usageAccount.update({
      where: { userId },
      data: { isStudent: true },
    });
    return toSnapshot(updated);
  }

  return toSnapshot(row);
}

async function persistAccount(
  userId: string,
  account: UsageAccountSnapshot,
): Promise<void> {
  await prisma.usageAccount.update({
    where: { userId },
    data: {
      plan: account.plan,
      isStudent: account.isStudent,
      creditBalance: account.creditBalance,
      periodStart: account.periodStart,
      tailorKitsUsed: account.tailorKitsUsed,
      autofillKitsUsed: account.autofillKitsUsed,
      planKitsUsed: account.planKitsUsed,
      seasonKitsTotal: account.seasonKitsTotal,
      seasonEndsAt: account.seasonEndsAt,
      flexPausedUntil: account.flexPausedUntil,
    },
  });
}

async function logEvent(
  userId: string,
  kind: string,
  creditsDelta: number,
  applicationId = "",
  meta: Record<string, unknown> = {},
): Promise<void> {
  await prisma.usageEvent.create({
    data: {
      userId,
      kind,
      creditsDelta,
      applicationId,
      meta: JSON.stringify(meta),
    },
  });
}

export async function getUsageSummary(
  userId: string,
  email: string,
): Promise<UsageSummary> {
  let account = await getOrCreateUsageAccount(userId, email);
  const normalized = resetMonthlyCounters(account);
  if (normalized !== account) {
    await persistAccount(userId, normalized);
    account = normalized;
  }
  return buildUsageSummary(account);
}

export function usageLimitResponse(err: UsageLimitError) {
  return NextResponse.json(
    {
      error: err.message,
      code: err.code,
      usage: err.summary,
    },
    { status: 402 },
  );
}

export async function assertCanUse(
  userId: string,
  email: string,
  action: UsageAction,
  opts: { applicationId?: string; alreadyCharged?: boolean } = {},
): Promise<UsageSummary> {
  const summary = await getUsageSummary(userId, email);
  const decision = canConsume(summary, action, opts.alreadyCharged ?? false);
  if (!decision.allowed) {
    throw new UsageLimitError(decision.reason ?? "Usage limit reached.", summary);
  }
  return summary;
}

export async function consumeUsage(
  userId: string,
  email: string,
  action: UsageAction,
  opts: {
    applicationId?: string;
    alreadyCharged?: boolean;
    continueSession?: boolean;
  } = {},
): Promise<UsageSummary> {
  if (opts.continueSession && opts.alreadyCharged) {
    return getUsageSummary(userId, email);
  }

  let account = await getOrCreateUsageAccount(userId, email);
  account = resetMonthlyCounters(account);
  const summary = buildUsageSummary(account);
  const decision = canConsume(summary, action, opts.alreadyCharged ?? false);

  if (!decision.allowed || !decision.source) {
    throw new UsageLimitError(decision.reason ?? "Usage limit reached.", summary);
  }

  if (decision.source === "already_charged") {
    return summary;
  }

  const next = applyConsumption(account, action, decision.source);
  await persistAccount(userId, next);

  if (opts.applicationId) {
    const appFlag =
      action === "tailor"
        ? { tailorKitCharged: true }
        : action === "autofill"
          ? { autofillKitCharged: true }
          : { incorporateCharged: true };
    await prisma.application.updateMany({
      where: { id: opts.applicationId, userId },
      data: appFlag,
    });
  }

  await logEvent(userId, action, decision.source === "credits" ? -1 : 0, opts.applicationId ?? "", {
    source: decision.source,
  });

  return buildUsageSummary(next);
}

export async function addCredits(
  userId: string,
  email: string,
  amount: number,
  packId: string,
): Promise<UsageSummary> {
  const account = await getOrCreateUsageAccount(userId, email);
  const next = { ...account, creditBalance: account.creditBalance + amount };
  await persistAccount(userId, next);
  await logEvent(userId, "credit_purchase", amount, "", { packId });
  return buildUsageSummary(next);
}

export async function setPlan(
  userId: string,
  email: string,
  plan: BillingPlan,
): Promise<UsageSummary> {
  const account = await getOrCreateUsageAccount(userId, email);
  const now = new Date();
  const next: UsageAccountSnapshot = {
    ...resetMonthlyCounters(account, now),
    plan,
    flexPausedUntil: null,
  };

  if (plan === "season") {
    next.seasonKitsTotal = SEASON_TOTAL_KITS;
    next.planKitsUsed = 0;
    const end = new Date(now);
    end.setUTCMonth(end.getUTCMonth() + SEASON_MONTHS);
    next.seasonEndsAt = end;
  } else if (plan === "flex" || plan === "annual") {
    next.seasonEndsAt = null;
    next.seasonKitsTotal = 0;
    next.planKitsUsed = 0;
  } else {
    next.seasonEndsAt = null;
    next.seasonKitsTotal = 0;
    next.planKitsUsed = 0;
  }

  await persistAccount(userId, next);
  await logEvent(userId, "plan_change", 0, "", { plan });
  return buildUsageSummary(next);
}

export async function pauseFlex(
  userId: string,
  email: string,
): Promise<UsageSummary> {
  const account = await getOrCreateUsageAccount(userId, email);
  if (account.plan !== "flex" && account.plan !== "annual") {
    throw new Error("Only Student Monthly or Yearly can be paused.");
  }
  const until = new Date();
  until.setUTCDate(until.getUTCDate() + 30);
  const next = { ...account, flexPausedUntil: until };
  await persistAccount(userId, next);
  await logEvent(userId, "flex_pause", 0);
  return buildUsageSummary(next);
}
