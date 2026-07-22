import type { PrismaClient } from "@/generated/prisma/client";

export type TailoredApplicationPayload = {
  tailoredResume: string;
  coverLetter: string;
  matchNotes: string;
  linkedInRecruiterNote: string;
  recruiterEmail: string;
  beforeMatch: string;
  afterMatch: string;
  companyEdge: string;
  status: string;
};

function isMissingOutreachColumnError(err: unknown): boolean {
  const msg = String((err as Error)?.message ?? err);
  return (
    /linkedInRecruiterNote|recruiterEmail/i.test(msg) ||
    /column .* does not exist/i.test(msg) ||
    /Unknown argument/i.test(msg)
  );
}

/** Save outreach even when Prisma Client was generated before new columns existed. */
export async function persistRecruiterOutreach(
  prisma: PrismaClient,
  applicationId: string,
  linkedInRecruiterNote: string,
  recruiterEmail: string,
): Promise<void> {
  if (!linkedInRecruiterNote && !recruiterEmail) return;

  try {
    await prisma.$executeRaw`
      UPDATE "Application"
      SET "linkedInRecruiterNote" = ${linkedInRecruiterNote},
          "recruiterEmail" = ${recruiterEmail},
          "updatedAt" = NOW()
      WHERE "id" = ${applicationId}
    `;
  } catch (err) {
    if (!isMissingOutreachColumnError(err)) throw err;
    const row = await prisma.application.findUnique({
      where: { id: applicationId },
      select: { formAnswers: true },
    });
    let base: Record<string, unknown> = {};
    try {
      base = JSON.parse(row?.formAnswers || "{}") as Record<string, unknown>;
    } catch {
      base = {};
    }
    base.recruiterOutreach = { linkedInRecruiterNote, recruiterEmail };
    await prisma.application.update({
      where: { id: applicationId },
      data: { formAnswers: JSON.stringify(base) },
    });
  }
}

/** Core tailor fields — stable Prisma shape (no outreach columns on this object). */
function coreTailorData(payload: TailoredApplicationPayload) {
  return {
    tailoredResume: payload.tailoredResume,
    coverLetter: payload.coverLetter,
    matchNotes: payload.matchNotes,
    beforeMatch: payload.beforeMatch,
    afterMatch: payload.afterMatch,
    companyEdge: payload.companyEdge,
    status: payload.status,
  };
}

export async function createTailoredApplication(
  prisma: PrismaClient,
  data: { jobId: string; userId: string } & TailoredApplicationPayload,
) {
  const { jobId, userId, ...payload } = data;
  const application = await prisma.application.create({
    data: {
      jobId,
      userId,
      ...coreTailorData(payload),
    },
  });
  await persistRecruiterOutreach(
    prisma,
    application.id,
    payload.linkedInRecruiterNote,
    payload.recruiterEmail,
  );
  return application;
}

export async function updateTailoredApplication(
  prisma: PrismaClient,
  id: string,
  payload: TailoredApplicationPayload,
) {
  const application = await prisma.application.update({
    where: { id },
    data: coreTailorData(payload),
  });
  await persistRecruiterOutreach(
    prisma,
    id,
    payload.linkedInRecruiterNote,
    payload.recruiterEmail,
  );
  return application;
}

export function formatDbErrorForUser(err: unknown): string {
  const msg = String((err as Error)?.message ?? err);
  if (isMissingOutreachColumnError(err)) {
    return (
      "Database is out of sync. From the project root (not backend/), run: " +
      "npm run db:migrate && npx prisma generate — then restart npm run dev."
    );
  }
  if (msg.length > 280) {
    return msg.split("\n")[0]?.slice(0, 280) ?? "Something went wrong.";
  }
  return msg || "Something went wrong.";
}

export function recruiterOutreachFromApplication(app: {
  linkedInRecruiterNote?: string | null;
  recruiterEmail?: string | null;
  formAnswers?: string | null;
}): { linkedInRecruiterNote: string; recruiterEmail: string } {
  let linkedInRecruiterNote = app.linkedInRecruiterNote?.trim() ?? "";
  let recruiterEmail = app.recruiterEmail?.trim() ?? "";
  if (!linkedInRecruiterNote && !recruiterEmail && app.formAnswers?.trim()) {
    try {
      const parsed = JSON.parse(app.formAnswers) as {
        recruiterOutreach?: {
          linkedInRecruiterNote?: string;
          recruiterEmail?: string;
        };
      };
      linkedInRecruiterNote =
        parsed.recruiterOutreach?.linkedInRecruiterNote?.trim() ?? "";
      recruiterEmail = parsed.recruiterOutreach?.recruiterEmail?.trim() ?? "";
    } catch {
      /* ignore */
    }
  }
  return { linkedInRecruiterNote, recruiterEmail };
}

export async function hydrateApplicationOutreach<
  T extends { id: string; formAnswers?: string | null },
>(
  prisma: PrismaClient,
  app: T,
): Promise<T & { linkedInRecruiterNote: string; recruiterEmail: string }> {
  const fromRow = recruiterOutreachFromApplication(
    app as Parameters<typeof recruiterOutreachFromApplication>[0],
  );
  if (fromRow.linkedInRecruiterNote || fromRow.recruiterEmail) {
    return { ...app, ...fromRow };
  }
  try {
    const rows = await prisma.$queryRaw<
      { linkedInRecruiterNote: string; recruiterEmail: string }[]
    >`
      SELECT "linkedInRecruiterNote", "recruiterEmail"
      FROM "Application"
      WHERE "id" = ${app.id}
      LIMIT 1
    `;
    const row = rows[0];
    if (row) {
      return {
        ...app,
        linkedInRecruiterNote: row.linkedInRecruiterNote ?? "",
        recruiterEmail: row.recruiterEmail ?? "",
      };
    }
  } catch {
    /* columns may not exist */
  }
  return { ...app, linkedInRecruiterNote: "", recruiterEmail: "" };
}
