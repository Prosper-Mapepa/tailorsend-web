export function ProfileCountBadge({
  count,
  className = "",
}: {
  count: number;
  className?: string;
}) {
  if (count <= 0) return null;

  return (
    <span
      className={`inline-flex min-w-[1.35rem] items-center justify-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-emerald-700 ring-1 ring-emerald-200/70 ${className}`}
    >
      {count}
    </span>
  );
}
