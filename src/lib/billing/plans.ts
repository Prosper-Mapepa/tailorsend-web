export type BillingPlan = "free" | "flex" | "season";

export type UsageAction = "tailor" | "autofill" | "incorporate";

export interface FreeLimits {
  tailorPerMonth: number;
  autofillPerMonth: number;
}

export const FREE_LIMITS_STUDENT: FreeLimits = {
  tailorPerMonth: 5,
  autofillPerMonth: 2,
};

export const FREE_LIMITS_DEFAULT: FreeLimits = {
  tailorPerMonth: 3,
  autofillPerMonth: 1,
};

export const FLEX_MONTHLY_KITS = 20;
export const FLEX_PRICE_CENTS = 900;
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

export const CREDIT_PACKS: CreditPack[] = [
  { id: "pack_5", label: "5 kits", kits: 5, priceCents: 500 },
  {
    id: "pack_15",
    label: "15 kits",
    kits: 15,
    priceCents: 1200,
    studentPriceCents: 600,
  },
  { id: "pack_40", label: "40 kits", kits: 40, priceCents: 2500 },
];

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
