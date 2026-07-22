export type BillingPlan = "free" | "flex" | "annual" | "season";

export type UsageAction = "tailor" | "autofill" | "incorporate";

export interface FreeLimits {
  tailorPerMonth: number;
  autofillPerMonth: number;
}

/** Free tease — enough to try the product, not enough for a full search. */
export const FREE_LIMITS_STUDENT: FreeLimits = {
  tailorPerMonth: 4,
  autofillPerMonth: 2,
};

export const FREE_LIMITS_DEFAULT: FreeLimits = {
  tailorPerMonth: 2,
  autofillPerMonth: 1,
};

/** Student Monthly — flexible recurring. */
export const FLEX_MONTHLY_KITS = 25;
export const FLEX_PRICE_CENTS = 999; // $9.99/mo → ~$0.40/kit

/**
 * Student Yearly — same monthly kits, billed annually.
 * ~25% off vs $9.99 × 12 ($119.88).
 */
export const ANNUAL_MONTHLY_KITS = 25;
export const ANNUAL_PRICE_CENTS = 8999; // $89.99/yr → ~$7.50/mo · ~$0.30/kit

/** Kept for existing Season pass holders — no longer sold. */
export const SEASON_TOTAL_KITS = 60;
export const SEASON_MONTHS = 4;
export const SEASON_PRICE_CENTS = 2900;

export interface CreditPack {
  id: string;
  label: string;
  kits: number;
  priceCents: number;
  studentPriceCents?: number;
}

/**
 * One-time packs. Sprint must beat Campus on $/kit so volume feels like a deal.
 * Campus $5/8 ≈ $0.63 · Sprint $29.99/50 ≈ $0.60
 */
export const CREDIT_PACKS: CreditPack[] = [
  {
    id: "pack_5",
    label: "Campus",
    kits: 8,
    priceCents: 500,
  },
  {
    id: "pack_15",
    label: "Sprint",
    kits: 50,
    priceCents: 2999,
  },
  // Legacy — still fulfillable if an open Stripe session uses this id
  { id: "pack_40", label: "40 kits", kits: 40, priceCents: 2500 },
];

/** Packs shown on the billing page. */
export const STOREFRONT_PACK_IDS = ["pack_5", "pack_15"] as const;

export function isStudentEmail(email: string): boolean {
  const e = email.trim().toLowerCase();
  return (
    e.endsWith(".edu") ||
    e.endsWith(".ac.uk") ||
    e.endsWith(".edu.au") ||
    /\.edu\.[a-z]{2}$/.test(e)
  );
}

export function freeLimits(isStudent: boolean): FreeLimits {
  return isStudent ? FREE_LIMITS_STUDENT : FREE_LIMITS_DEFAULT;
}

/** Plans that refresh kits monthly and support pause. */
export function isKitSubscriptionPlan(
  plan: BillingPlan,
): plan is "flex" | "annual" {
  return plan === "flex" || plan === "annual";
}

export function subscriptionKitsPerMonth(plan: BillingPlan): number {
  if (plan === "annual") return ANNUAL_MONTHLY_KITS;
  if (plan === "flex") return FLEX_MONTHLY_KITS;
  return 0;
}

export function packById(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.id === id);
}

export function storefrontPacks(): CreditPack[] {
  return STOREFRONT_PACK_IDS.map((id) => packById(id)!).filter(Boolean);
}
