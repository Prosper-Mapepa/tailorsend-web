export type BillingPlan = "free" | "flex" | "season";

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

/** Student Monthly — primary recurring revenue. */
export const FLEX_MONTHLY_KITS = 25;
export const FLEX_PRICE_CENTS = 800; // $8/mo

/** Kept for existing Season pass holders — no longer sold as a storefront plan. */
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
 * Storefront packs (plus legacy ids kept for checkout fulfillment).
 * Primary sell: Campus → Student Monthly → Sprint.
 */
export const CREDIT_PACKS: CreditPack[] = [
  {
    id: "pack_5",
    label: "Campus",
    kits: 8,
    priceCents: 500, // $5 — impulse buy
  },
  {
    id: "pack_15",
    label: "Sprint",
    kits: 25,
    priceCents: 1200, // $12
    studentPriceCents: 800, // $8 with .edu
  },
  // Legacy — still fulfillable if an open Stripe session uses this id
  { id: "pack_40", label: "40 kits", kits: 40, priceCents: 2500 },
];

/** Packs shown on the billing page (order = left → right). */
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

export function packById(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.id === id);
}

export function storefrontPacks(): CreditPack[] {
  return STOREFRONT_PACK_IDS.map((id) => packById(id)!).filter(Boolean);
}
