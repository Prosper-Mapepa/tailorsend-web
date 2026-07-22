import {
  ANNUAL_MONTHLY_KITS,
  ANNUAL_PRICE_CENTS,
  FLEX_MONTHLY_KITS,
  FLEX_PRICE_CENTS,
  SEASON_MONTHS,
  SEASON_PRICE_CENTS,
  SEASON_TOTAL_KITS,
  type CreditPack,
} from "./plans";
import { formatCents } from "./format";

export type PackCatalogEntry = {
  id: string;
  name: string;
  badge?: string;
  tagline: string;
  description: string;
  highlights: string[];
  idealFor: string;
  bestWhen: string;
};

export type PlanCatalogEntry = {
  id: "free" | "flex" | "annual" | "season";
  name: string;
  badge?: string;
  tagline: string;
  description: string;
  highlights: string[];
  idealFor: string;
  bestWhen: string;
  priceLabel: string;
  kitsLabel: string;
};

const flexPrice = formatCents(FLEX_PRICE_CENTS);
const annualPrice = formatCents(ANNUAL_PRICE_CENTS);
const monthlyIfAnnual = formatCents(Math.round(ANNUAL_PRICE_CENTS / 12));
const annualSavings = formatCents(FLEX_PRICE_CENTS * 12 - ANNUAL_PRICE_CENTS);

export const PACK_CATALOG: Record<string, PackCatalogEntry> = {
  pack_5: {
    id: "pack_5",
    name: "Campus",
    tagline: "Small top-up · no subscription",
    description:
      "Eight kits for a few applications this week. Kits never expire.",
    highlights: [
      "8 kits that never expire",
      "One-time purchase",
      "Stay on Free after — no card required",
    ],
    idealFor: "Trying TailorSend on 1–2 applications",
    bestWhen: "You only need a handful of kits right now",
  },
  pack_15: {
    id: "pack_15",
    name: "Sprint",
    badge: "Best one-time",
    tagline: "Volume without renewing",
    description:
      "Fifty kits for a focused hunt. Better per-kit price than Campus.",
    highlights: [
      "50 kits that never expire",
      "Better $/kit than Campus",
      "About 2 months of applying",
    ],
    idealFor: "A serious short hunt without billing every month",
    bestWhen: "You want volume once, then you are done",
  },
  pack_40: {
    id: "pack_40",
    name: "Power Search",
    tagline: "Legacy pack",
    description: "Forty kits (legacy storefront).",
    highlights: ["Credits never expire"],
    idealFor: "Existing checkout sessions only",
    bestWhen: "Legacy fulfillment only",
  },
};

export const PLAN_CATALOG: PlanCatalogEntry[] = [
  {
    id: "free",
    name: "Free",
    tagline: "Try TailorSend with no card",
    description:
      "A small monthly allowance so you can set up your profile and run a couple of applications before upgrading.",
    highlights: [
      "2 tailor + 1 autofill / month",
      "4 tailor + 2 autofill for .edu",
      "Upgrade anytime",
    ],
    idealFor: "Getting started",
    bestWhen: "You are exploring the product",
    priceLabel: "$0",
    kitsLabel: "Monthly tease",
  },
  {
    id: "flex",
    name: "Student Monthly",
    badge: "Flexible",
    tagline: "Pay month to month",
    description:
      "25 kits every month. Pause or cancel anytime.",
    highlights: [
      "25 kits every month",
      "Pause up to 30 days",
      "Cancel when your search ends",
    ],
    idealFor: "Active search lasting a few months",
    bestWhen: "You want the lowest monthly commitment",
    priceLabel: `${flexPrice}/mo`,
    kitsLabel: `${FLEX_MONTHLY_KITS} kits / month`,
  },
  {
    id: "annual",
    name: "Student Yearly",
    badge: "Best value",
    tagline: "Same kits · save ~25%",
    description:
      `Same 25 kits/mo as Monthly, billed yearly. Save about ${annualSavings}.`,
    highlights: [
      "25 kits every month",
      `${monthlyIfAnnual}/mo effective`,
      `Save ~${annualSavings} vs Monthly`,
    ],
    idealFor: "Full recruiting cycle (internship + full-time)",
    bestWhen: "You will apply for 6+ months this year",
    priceLabel: `${annualPrice}/yr`,
    kitsLabel: `${ANNUAL_MONTHLY_KITS} kits / month`,
  },
  {
    id: "season",
    name: "Season Pass",
    badge: "Legacy",
    tagline: "Existing customers only",
    description:
      "No longer sold. Existing holders keep remaining kits through the paid window.",
    highlights: [
      `${SEASON_TOTAL_KITS} kits over ${SEASON_MONTHS} months`,
      `Was $${(SEASON_PRICE_CENTS / 100).toFixed(0)} one-time`,
      "Manage in billing portal",
    ],
    idealFor: "Current Season Pass holders",
    bestWhen: "Legacy plan only",
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
      bestWhen: "You need a credit top-up",
    }
  );
}

export function getPlanCatalog(
  id: "free" | "flex" | "annual" | "season",
): PlanCatalogEntry {
  return PLAN_CATALOG.find((p) => p.id === id)!;
}
