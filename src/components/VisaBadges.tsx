"use client";

import type { ReactNode } from "react";

export type VisaBadgeKind =
  | "opt"
  | "stem_opt"
  | "h1b"
  | "everify"
  | "green_card"
  | "sponsorship"
  | "citizenship"
  | "clearance";

const BADGE_META: Record<
  VisaBadgeKind,
  { label: string; title: string; tone: "good" | "bad" | "neutral" }
> = {
  opt: {
    label: "OPT Friendly",
    title: "Posting or company signals openness to F-1 OPT candidates.",
    tone: "good",
  },
  stem_opt: {
    label: "STEM OPT",
    title: "STEM OPT / extension friendliness is indicated.",
    tone: "good",
  },
  h1b: {
    label: "H-1B Sponsor",
    title: "H-1B sponsorship is mentioned or recorded for this employer.",
    tone: "good",
  },
  everify: {
    label: "E-Verify",
    title: "E-Verify is mentioned for this role or employer.",
    tone: "good",
  },
  green_card: {
    label: "Green Card Sponsor",
    title: "Employer has green-card sponsorship history (when data is loaded).",
    tone: "good",
  },
  sponsorship: {
    label: "Sponsors Visas",
    title: "The job posting explicitly offers visa sponsorship.",
    tone: "good",
  },
  citizenship: {
    label: "Citizenship Required",
    title: "This role requires U.S. citizenship or permanent residency.",
    tone: "bad",
  },
  clearance: {
    label: "Security Clearance",
    title: "This role requires a security clearance.",
    tone: "bad",
  },
};

function toneClass(tone: "good" | "bad" | "neutral"): string {
  if (tone === "good") {
    return "bg-emerald-50 text-emerald-800 ring-emerald-200/80";
  }
  if (tone === "bad") {
    return "bg-red-50 text-red-800 ring-red-200/80";
  }
  return "bg-slate-50 text-slate-600 ring-slate-200/80";
}

export function VisaBadge({ kind }: { kind: VisaBadgeKind }) {
  const meta = BADGE_META[kind];
  return (
    <span
      title={meta.title}
      className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ${toneClass(meta.tone)}`}
    >
      {meta.label}
    </span>
  );
}

export function VisaBadges({
  analysis,
  company,
  visaRisk,
}: {
  analysis?: Record<string, unknown> | null;
  company?: {
    optFriendly?: string;
    stemOptFriendly?: string;
    eVerify?: string;
    h1bSponsor?: string;
    greenCardSponsor?: string;
    citizenshipRequired?: boolean;
    securityClearanceRequired?: boolean;
  } | null;
  visaRisk?: string;
}) {
  const badges: VisaBadgeKind[] = [];
  const a = analysis ?? {};

  if (visaRisk === "clearance" || a.securityClearance || company?.securityClearanceRequired) {
    badges.push("clearance");
  }
  if (
    visaRisk === "citizenship" ||
    a.citizenshipRequired ||
    company?.citizenshipRequired
  ) {
    badges.push("citizenship");
  }
  if (a.optFriendly === true || company?.optFriendly === "yes") badges.push("opt");
  if (a.stemOptFriendly === true || company?.stemOptFriendly === "yes") {
    badges.push("stem_opt");
  }
  if (a.mentionsH1b === true || company?.h1bSponsor === "yes") badges.push("h1b");
  if (a.mentionsEVerify === true || company?.eVerify === "yes") {
    badges.push("everify");
  }
  if (company?.greenCardSponsor === "yes") badges.push("green_card");
  if (a.visaSponsorship === true && !badges.includes("h1b")) {
    badges.push("sponsorship");
  }

  if (!badges.length && visaRisk === "none") {
    return (
      <span
        title="No citizenship, clearance, or no-sponsorship language detected in the posting."
        className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ${toneClass("good")}`}
      >
        Sponsorship OK
      </span>
    );
  }

  return (
    <>
      {badges.map((k) => (
        <VisaBadge key={k} kind={k} />
      ))}
    </>
  );
}

export function VisaScoreChip({
  score,
  reasons,
}: {
  score: number;
  reasons?: string[];
}) {
  const title =
    reasons && reasons.length
      ? `Visa ${score}/100\n${reasons.map((r) => `• ${r}`).join("\n")}`
      : `Visa compatibility ${score}/100`;
  return (
    <span
      title={title}
      className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-emerald-900 ring-1 ring-emerald-200/80"
    >
      Visa {score}
    </span>
  );
}

export function MatchBreakdownInline({
  breakdown,
}: {
  breakdown?: {
    overall?: number;
    visa?: number;
    skills?: number;
    experience?: number;
  } | null;
}): ReactNode {
  if (!breakdown || breakdown.overall == null) return null;
  return (
    <p
      className="mt-2 text-[11px] leading-relaxed text-slate-500"
      title="Match weights: 40% skills · 20% experience · 20% visa · 10% salary · 10% location"
    >
      Match {breakdown.overall}%
      {breakdown.visa != null ? ` · Visa ${breakdown.visa}%` : ""}
      {breakdown.skills != null ? ` · Skills ${breakdown.skills}%` : ""}
      {breakdown.experience != null
        ? ` · Experience ${breakdown.experience}%`
        : ""}
    </p>
  );
}
