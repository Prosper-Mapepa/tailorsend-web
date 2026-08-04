import { prisma } from "@/lib/db";
import { safeJson } from "@/lib/util";
import type { JobVisaAnalysis, TriState } from "@/lib/visa-analyze";
import {
  promoteTriState,
  scoreCompanyVisa,
  type CompanyVisaSignals,
} from "@/lib/visa-score";

/** Normalize company display name for matching. */
export function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(
      /\b(inc|incorporated|llc|ltd|limited|corp|corporation|co|company|the)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

export function companySlug(name: string): string {
  const base =
    normalizeCompanyName(name).replace(/\s+/g, "-").replace(/^-|-$/g, "") ||
    "company";
  return base.slice(0, 80);
}

function websiteFromJobUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (
      /greenhouse|lever|ashby|workday|myworkday|linkedin|indeed|glassdoor/.test(
        host,
      )
    ) {
      return "";
    }
    return `https://${host}`;
  } catch {
    return "";
  }
}

/**
 * Find or create a Company row for this employer name.
 * Applies positive JD signals without inventing Yes from silence.
 */
export async function upsertCompanyFromJob(opts: {
  companyName: string;
  jobUrl?: string;
  analysis: JobVisaAnalysis;
}): Promise<{ id: string; slug: string; visaScore: number; signals: CompanyVisaSignals }> {
  const name = opts.companyName.trim() || "Unknown";
  const normalized = normalizeCompanyName(name);
  const slug = companySlug(name);

  let company = await prisma.company.findUnique({ where: { slug } });
  if (!company && normalized) {
    company = await prisma.company.findFirst({
      where: { normalizedName: normalized },
    });
  }

  const website = websiteFromJobUrl(opts.jobUrl ?? "");
  const a = opts.analysis;

  if (!company) {
    const signals: CompanyVisaSignals = {
      optFriendly: promoteTriState("unknown", a.optFriendly),
      stemOptFriendly: promoteTriState("unknown", a.stemOptFriendly),
      eVerify: a.mentionsEVerify ? "yes" : "unknown",
      // Only explicit H-1B mentions (or later dataset import) set Yes — never invent from silence / generic sponsorship.
      h1bSponsor: a.mentionsH1b ? "yes" : "unknown",
      greenCardSponsor: "unknown",
      internationalHiring: "unknown",
      citizenshipRequired: a.citizenshipRequired,
      securityClearanceRequired: a.securityClearance,
    };
    const visaScore = scoreCompanyVisa(signals);
    company = await prisma.company.create({
      data: {
        slug,
        name,
        normalizedName: normalized,
        website,
        optFriendly: signals.optFriendly,
        stemOptFriendly: signals.stemOptFriendly,
        eVerify: signals.eVerify,
        h1bSponsor: signals.h1bSponsor,
        greenCardSponsor: signals.greenCardSponsor,
        internationalHiring: signals.internationalHiring,
        citizenshipRequired: signals.citizenshipRequired,
        securityClearanceRequired: signals.securityClearanceRequired,
        visaScore,
        aliases: JSON.stringify(normalized ? [normalized] : []),
      },
    });
    return { id: company.id, slug: company.slug, visaScore, signals };
  }

  const signals: CompanyVisaSignals = {
    optFriendly: promoteTriState(
      company.optFriendly as TriState,
      a.optFriendly,
    ),
    stemOptFriendly: promoteTriState(
      company.stemOptFriendly as TriState,
      a.stemOptFriendly,
    ),
    eVerify: a.mentionsEVerify
      ? "yes"
      : (company.eVerify as TriState),
    h1bSponsor: promoteTriState(
      company.h1bSponsor as TriState,
      a.mentionsH1b ? true : null,
    ),
    greenCardSponsor: company.greenCardSponsor as TriState,
    internationalHiring: company.internationalHiring as CompanyVisaSignals["internationalHiring"],
    citizenshipRequired:
      company.citizenshipRequired || a.citizenshipRequired,
    securityClearanceRequired:
      company.securityClearanceRequired || a.securityClearance,
  };
  const visaScore = scoreCompanyVisa(signals);
  const aliases = safeJson<string[]>(company.aliases, []);
  if (normalized && !aliases.includes(normalized)) aliases.push(normalized);

  company = await prisma.company.update({
    where: { id: company.id },
    data: {
      name: company.name || name,
      website: company.website || website,
      optFriendly: signals.optFriendly,
      stemOptFriendly: signals.stemOptFriendly,
      eVerify: signals.eVerify,
      h1bSponsor: signals.h1bSponsor,
      greenCardSponsor: signals.greenCardSponsor,
      citizenshipRequired: signals.citizenshipRequired,
      securityClearanceRequired: signals.securityClearanceRequired,
      visaScore,
      aliases: JSON.stringify(aliases.slice(0, 40)),
    },
  });

  return { id: company.id, slug: company.slug, visaScore, signals };
}
