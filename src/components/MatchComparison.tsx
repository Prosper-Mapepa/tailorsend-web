import type { MatchScore } from "@/lib/match-score";

function scoreColor(score: number): string {
  if (score >= 75) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-600";
}

function scoreBar(score: number): string {
  if (score >= 75) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-red-500";
}

export function MatchComparison({
  before,
  after,
}: {
  before: MatchScore;
  after: MatchScore;
}) {
  const delta = after.score - before.score;
  const unfillable = after.unfillable ?? [];

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">
            ATS keyword match: before → after tailoring
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Scored against the same JD keyword rubric. Industry-only gaps you
            can&apos;t truthfully claim are excluded from the denominator.
          </p>
        </div>
        <span
          className={`text-sm font-semibold ${
            delta > 0
              ? "text-emerald-600"
              : delta < 0
                ? "text-red-600"
                : "text-slate-500"
          }`}
        >
          {delta > 0
            ? `▲ +${delta} pts`
            : delta < 0
              ? `▼ ${Math.abs(delta)} pts`
              : "—"}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {(
          [
            ["Before (base resume)", before],
            ["After (tailored)", after],
          ] as const
        ).map(([label, m]) => (
          <div key={label} className="rounded-md bg-white p-3 shadow-sm">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium text-slate-500">{label}</span>
              <span className={`text-2xl font-bold ${scoreColor(m.score)}`}>
                {m.score}%
                {m.score >= 100 && (
                  <span className="ml-1 text-sm font-normal text-emerald-600">
                    ✓
                  </span>
                )}
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all ${scoreBar(m.score)}`}
                style={{ width: `${Math.min(m.score, 100)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">{m.summary}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-xs font-semibold text-emerald-700">
            Matched JD keywords ({after.matched.length})
          </p>
          <div className="flex flex-wrap gap-1">
            {after.matched.length ? (
              after.matched.map((k) => (
                <span
                  key={k}
                  className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800"
                >
                  {k}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-400">—</span>
            )}
          </div>
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold text-amber-700">
            Still missing from resume ({after.missing.length})
          </p>
          <div className="flex flex-wrap gap-1">
            {after.missing.length ? (
              after.missing.map((k) => (
                <span
                  key={k}
                  className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800"
                >
                  {k}
                </span>
              ))
            ) : (
              <span className="text-xs font-medium text-emerald-600">
                All keywords covered ✓
              </span>
            )}
          </div>
        </div>
      </div>

      {unfillable.length > 0 && (
        <div className="mt-3 rounded-md border border-slate-200 bg-white px-3 py-2">
          <p className="text-xs font-semibold text-slate-600">
            Background gaps (not counted in score — can&apos;t add without
            fabricating)
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {unfillable.map((k) => (
              <span
                key={k}
                className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
              >
                {k}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
