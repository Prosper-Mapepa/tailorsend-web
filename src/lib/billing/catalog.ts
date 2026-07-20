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
    name: "Campus",
    tagline: "Try it this week — no subscription",
    description: "Eight kits for real applications today.",
    highlights: [
      "8 kits · never expire",
      "One-time purchase",
      "No card needed to stay on Free",
    ],
    idealFor: "A few apps this week",
  },
  pack_15: {
    id: "pack_15",
    name: "Sprint",
    badge: "Best one-time",
    tagline: "A focused hunt without renewing",
    description: "Twenty-five kits for internship season or a two-week push.",
    highlights: [
      "25 kits · never expire",
      "$8 with .edu email",
      "~2–3 weeks of applying",
    ],
    idealFor: "Internship / job sprint",
  },
  pack_40: {
    id: "pack_40",
    name: "Power Search",
    tagline: "Legacy pack",
    description: "Forty kits (legacy storefront).",
    highlights: ["Credits never expire"],
    idealFor: "Existing checkout sessions only",
  },
};

export const PLAN_CATALOG: PlanCatalogEntry[] = [
  {
    id: "free",
    name: "Free",
    tagline: "Try TailorSend with no card",
    description:
      "A small monthly allowance so you can set up your profile and run a couple of applications.",
    highlights: [
      "2 tailor + 1 autofill / month",
      "4 tailor + 2 autofill for .edu",
      "Upgrade anytime",
    ],
    idealFor: "Getting started",
    priceLabel: "$0",
    kitsLabel: "Monthly tease",
  },
  {
    id: "flex",
    name: "Student Monthly",
    badge: "Most popular",
    tagline: "Always-on while you search",
    description:
      "Twenty-five kits every month. Pause for finals — cancel anytime.",
    highlights: [
      `${FLEX_MONTHLY_KITS} kits every month`,
      `$${(FLEX_PRICE_CENTS / 100).toFixed(0)}/mo — less than lunch`,
      "Pause 30 days anytime",
    ],
    idealFor: "Active student search",
    priceLabel: `$${(FLEX_PRICE_CENTS / 100).toFixed(0)}/mo`,
    kitsLabel: `${FLEX_MONTHLY_KITS} kits / month`,
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
