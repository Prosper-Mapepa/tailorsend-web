import type { UsageSummary } from "./usage-core";

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

export function formatPlanLabel(plan: string): string {
  if (plan === "flex") return "Flex";
  if (plan === "season") return "Season Pass";
  return "Free";
}

export function usageKitLabel(summary: UsageSummary): string {
  if (summary.plan === "free") {
    const tailorLeft = Math.max(
      0,
      summary.limits.tailorPerMonth - summary.tailorKitsUsed,
    );
    const autofillLeft = Math.max(
      0,
      summary.limits.autofillPerMonth - summary.autofillKitsUsed,
    );
    const parts = [`${tailorLeft} tailor`, `${autofillLeft} autofill`];
    if (summary.creditBalance > 0) {
      parts.push(`${summary.creditBalance} credits`);
    }
    return parts.join(" · ");
  }
  const kits =
    summary.planKitsRemaining + summary.creditBalance;
  return `${kits} kits left`;
}

export function parseUsageError(data: {
  error?: string;
  code?: string;
}): string {
  if (data.code === "USAGE_LIMIT") {
    return data.error ?? "Usage limit reached.";
  }
  return data.error ?? "Request failed.";
}
