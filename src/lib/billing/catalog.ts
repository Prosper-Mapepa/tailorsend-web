import {
  FLEX_MONTHLY_KITS,
  FLEX_PRICE_CENTS,
  SEASON_MONTHS,
  SEASON_PRICE_CENTS,
  SEASON_TOTAL_KITS,
  type CreditPack,
} from "./plans";

export type PackCatalogEntry = {
  id: string;
  name: string;
  badge?: string;
  tagline: string;
  description: string;
  highlights: string[];
  idealFor: string;
};

export type PlanCatalogEntry = {
  id: "free" | "flex" | "season";
  name: string;
  badge?: string;
  tagline: string;
  description: string;
  highlights: string[];
  idealFor: string;
  priceLabel: string;
  kitsLabel: string;
};

export const PACK_CATALOG: Record<string, PackCatalogEntry> = {
  pack_5: {
    id: "pack_5",
    name: "Starter",
    tagline: "Test the full workflow on a few roles",
    description:
      "Five kits to run the complete TailorSend loop — company research, tailored resume and cover, and autofill — on the roles you care about most. A low-commitment way to see results before scaling up.",
    highlights: [
      "5 tailor or autofill actions",
      "Credits never expire",
      "Stack with your free monthly kits",
    ],
    idealFor: "Trying TailorSend on 3–5 target companies",
  },
  pack_15: {
    id: "pack_15",
    name: "Job Hunt",
    badge: "Best value",
    tagline: "A focused sprint across your best matches",
    description:
      "Fifteen kits for a serious two-week push. Tailor documents for every strong match, autofill Greenhouse and Lever forms, and weave in edge ideas — without rationing every click.",
    highlights: [
      "15 kits — lowest per-kit price",
      "Student .edu pricing available",
      "Use for tailor, autofill, or incorporate",
    ],
    idealFor: "Active searchers applying to 10–15 roles",
  },
  pack_40: {
    id: "pack_40",
    name: "Power Search",
    tagline: "Fuel a full pipeline for weeks",
    description:
      "Forty kits for candidates running a broad search. Cover multiple target roles per week, iterate on edge ideas, and autofill batch applications — you review and submit every one.",
    highlights: [
      "40 kits at the best bulk rate",
      "Never expires — use at your pace",
      "Pairs well with the free plan",
    ],
    idealFor: "Full-time job seekers or career switchers",
  },
};

export const PLAN_CATALOG: PlanCatalogEntry[] = [
  {
    id: "free",
    name: "Free",
    tagline: "Start tailoring with no card required",
    description:
      "Monthly tailor and autofill kits reset on the first of each month. Students on .edu emails get extra free kits. Perfect while you build your profile and explore the platform.",
    highlights: [
      "3 tailor + 1 autofill / month",
      "5 tailor + 2 autofill for students",
      "Buy credit packs anytime",
    ],
    idealFor: "Getting started and light monthly use",
    priceLabel: "$0",
    kitsLabel: "Monthly free allowance",
  },
  {
    id: "flex",
    name: "Flex",
    tagline: "Steady monthly kits for ongoing searches",
    description:
      "Twenty application kits every billing month — use them for tailoring, autofill, or edge ideas in any mix. Pause up to 30 days during breaks, finals, or between offers without losing your account.",
    highlights: [
      `${FLEX_MONTHLY_KITS} kits refreshed monthly`,
      "Pause 30 days during breaks",
      "Cancel or manage via billing portal",
    ],
    idealFor: "Graduates and professionals applying weekly",
    priceLabel: `$${(FLEX_PRICE_CENTS / 100).toFixed(0)}/mo`,
    kitsLabel: `${FLEX_MONTHLY_KITS} kits / month`,
  },
  {
    id: "season",
    name: "Season Pass",
    badge: "Seasonal",
    tagline: "One payment for an entire recruiting cycle",
    description:
      "Sixty kits spread across four months — built for fall recruiting through spring offers. Pay once, apply confidently through peak hiring season without monthly math.",
    highlights: [
      `${SEASON_TOTAL_KITS} kits over ${SEASON_MONTHS} months`,
      "Best plan $/kit for heavy searchers",
      "One-time payment — no subscription",
    ],
    idealFor: "Campus recruiting & internship season",
    priceLabel: `$${(SEASON_PRICE_CENTS / 100).toFixed(0)}`,
    kitsLabel: `${SEASON_TOTAL_KITS} kits total`,
  },
];

export function getPackCatalog(pack: CreditPack): PackCatalogEntry {
  return (
    PACK_CATALOG[pack.id] ?? {
      id: pack.id,
      name: pack.label,
      tagline: "Application kits",
      description: `${pack.kits} kits for tailor, autofill, or incorporate actions.`,
      highlights: ["Credits never expire"],
      idealFor: "Top up when you need more kits",
    }
  );
}

export function getPlanCatalog(id: "free" | "flex" | "season"): PlanCatalogEntry {
  return PLAN_CATALOG.find((p) => p.id === id)!;
}
