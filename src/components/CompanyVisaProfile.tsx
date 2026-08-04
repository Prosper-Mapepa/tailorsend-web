"use client";

import type { SponsorshipMeta } from "@/lib/sponsorship-meta";

type Tri = "yes" | "no" | "unknown" | string;

function triLabel(v: Tri): string {
  if (v === "yes") return "Yes";
  if (v === "no") return "No";
  return "Unknown";
}

function triTone(v: Tri): string {
  if (v === "yes") return "text-emerald-800";
  if (v === "no") return "text-red-700";
  return "text-slate-500";
}

function Row({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2.5 last:border-0">
      <div>
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {hint ? <p className="mt-0.5 text-xs text-slate-400">{hint}</p> : null}
      </div>
      <p className={`shrink-0 text-sm font-semibold tabular-nums ${triTone(value.toLowerCase())}`}>
        {value}
      </p>
    </div>
  );
}

export function CompanyVisaProfile({
  visaScore,
  optFriendly,
  stemOptFriendly,
  h1bSponsor,
  greenCardSponsor,
  eVerify,
  citizenshipRequired,
  securityClearanceRequired,
  internationalHiring,
  sponsorshipMeta,
}: {
  visaScore: number;
  optFriendly: Tri;
  stemOptFriendly: Tri;
  h1bSponsor: Tri;
  greenCardSponsor: Tri;
  eVerify: Tri;
  citizenshipRequired: boolean;
  securityClearanceRequired: boolean;
  internationalHiring: string;
  sponsorshipMeta?: SponsorshipMeta;
}) {
  const meta = sponsorshipMeta ?? {};
  const hasFilings =
    (meta.h1bFilingCount != null && meta.h1bFilingCount > 0) ||
    (meta.h1bFilingYears && meta.h1bFilingYears.length > 0) ||
    (meta.greenCardFilingCount != null && meta.greenCardFilingCount > 0);

  const previousSponsorship = hasFilings
    ? [
        meta.h1bFilingCount != null
          ? `${meta.h1bFilingCount} H-1B filing(s)`
          : meta.h1bFilingYears?.length
            ? `H-1B in ${meta.h1bFilingYears.slice(0, 4).join(", ")}`
            : null,
        meta.greenCardFilingCount != null
          ? `${meta.greenCardFilingCount} green card filing(s)`
          : null,
      ]
        .filter(Boolean)
        .join(" · ") || "Yes"
    : "Unknown";

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">
            Visa Information
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            F-1 compatibility signals. Unknown means we have not verified this
            yet — we do not invent Yes from silence.
          </p>
        </div>
        <div
          title="Company visa score 0–100"
          className="rounded-xl bg-emerald-50 px-3 py-2 text-center ring-1 ring-emerald-200/80"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
            Score
          </p>
          <p className="text-xl font-bold tabular-nums text-emerald-900">
            {visaScore}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <Row label="OPT Friendly" value={triLabel(optFriendly)} />
        <Row label="STEM OPT Friendly" value={triLabel(stemOptFriendly)} />
        <Row
          label="H-1B Sponsor"
          value={triLabel(h1bSponsor)}
          hint="Yes only from explicit JD mention or public LCA data"
        />
        <Row
          label="Green Card Sponsor"
          value={triLabel(greenCardSponsor)}
          hint="Requires imported public data when available"
        />
        <Row label="E-Verify" value={triLabel(eVerify)} />
        <Row
          label="Citizenship required"
          value={citizenshipRequired ? "Yes" : "No"}
        />
        <Row
          label="Security clearance"
          value={securityClearanceRequired ? "Yes" : "No"}
        />
        <Row
          label="International hiring"
          value={
            internationalHiring === "unknown"
              ? "Unknown"
              : internationalHiring.charAt(0).toUpperCase() +
                internationalHiring.slice(1)
          }
        />
        <Row
          label="Previous sponsorship"
          value={previousSponsorship}
          hint={
            meta.source
              ? `Source: ${meta.source}${meta.lastSyncedAt ? ` · synced ${meta.lastSyncedAt.slice(0, 10)}` : ""}`
              : "Import DOL LCA data to populate"
          }
        />
      </div>
    </section>
  );
}
