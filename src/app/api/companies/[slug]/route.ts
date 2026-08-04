import { NextResponse } from "next/server";
import { isAuthUser, requireAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseSponsorshipMeta } from "@/lib/sponsorship-meta";
import { safeJson } from "@/lib/util";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const auth = await requireAuthUser();
  if (!isAuthUser(auth)) return auth;

  const { slug } = await ctx.params;
  const company = await prisma.company.findUnique({
    where: { slug },
    include: {
      jobs: {
        where: { status: { not: "hidden" } },
        orderBy: [{ visaScore: "desc" }, { matchScore: "desc" }],
        take: 40,
        select: {
          id: true,
          title: true,
          location: true,
          remote: true,
          url: true,
          applyUrl: true,
          salary: true,
          matchScore: true,
          visaScore: true,
          visaRisk: true,
          visaAnalysis: true,
          postedAt: true,
          atsPlatform: true,
        },
      },
    },
  });

  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const sponsorshipMeta = parseSponsorshipMeta(company.sponsorshipMeta);
  const aliases = safeJson<string[]>(company.aliases, []);

  return NextResponse.json({
    company: {
      id: company.id,
      slug: company.slug,
      name: company.name,
      industry: company.industry,
      size: company.size,
      headquarters: company.headquarters,
      website: company.website,
      optFriendly: company.optFriendly,
      stemOptFriendly: company.stemOptFriendly,
      eVerify: company.eVerify,
      h1bSponsor: company.h1bSponsor,
      greenCardSponsor: company.greenCardSponsor,
      internationalHiring: company.internationalHiring,
      citizenshipRequired: company.citizenshipRequired,
      securityClearanceRequired: company.securityClearanceRequired,
      visaScore: company.visaScore,
      sponsorshipMeta,
      aliases,
      updatedAt: company.updatedAt,
    },
    jobs: company.jobs.map((j) => ({
      ...j,
      visaAnalysis: safeJson(j.visaAnalysis, {}),
    })),
  });
}
