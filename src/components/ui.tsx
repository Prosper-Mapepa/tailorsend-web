"use client";

import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";
import Link from "next/link";

/* ── Shared form styles ── */
export const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20";

export const labelClass = "mb-1.5 block text-sm font-medium text-slate-700";

export const selectClass = inputClass;

/* ── Card ── */
export function Card({
  children,
  className = "",
  padding = "default",
}: {
  children: ReactNode;
  className?: string;
  padding?: "none" | "default" | "lg";
}) {
  const pad =
    padding === "none" ? "" : padding === "lg" ? "p-6 sm:p-8" : "p-5 sm:p-6";
  return (
    <div
      className={`rounded-2xl border border-slate-200/80 bg-white shadow-sm ${pad} ${className}`}
    >
      {children}
    </div>
  );
}

/* ── Button ── */
type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-emerald-600 disabled:text-white disabled:opacity-50 disabled:shadow-none",
  secondary:
    "border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 active:bg-slate-100 disabled:opacity-50",
  outline:
    "border border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100 disabled:opacity-50",
  ghost:
    "text-slate-600 hover:bg-slate-100 active:bg-slate-200 disabled:opacity-50",
  danger:
    "bg-red-600 text-white shadow-sm hover:bg-red-700 active:bg-red-800 disabled:bg-red-300",
};

const SIZES = {
  sm: "px-3 py-1.5 text-xs rounded-lg",
  md: "px-4 py-2.5 text-sm rounded-xl",
  lg: "px-5 py-3 text-sm rounded-xl",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  loading = false,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: keyof typeof SIZES;
  loading?: boolean;
}) {
  const spinnerClass =
    variant === "primary" || variant === "danger"
      ? "h-4 w-4 border-white/40 border-t-white"
      : "h-4 w-4 border-emerald-200 border-t-emerald-600";

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-medium transition disabled:cursor-not-allowed ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner className={spinnerClass} />}
      {children}
    </button>
  );
}

/* ── Form primitives ── */
export function Label({
  children,
  htmlFor,
  className = "",
}: {
  children: ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={`${labelClass} ${className}`}>
      {children}
    </label>
  );
}

export function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${inputClass} ${className}`} {...props} />;
}

export function Textarea({
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`${inputClass} min-h-[100px] resize-y ${className}`}
      {...props}
    />
  );
}

/* ── Page layout ── */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="max-w-2xl text-sm leading-relaxed text-slate-500 sm:text-base">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
    </div>
  );
}

export function SectionTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm text-slate-500">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

/* ── Feedback ── */
export function Alert({
  variant = "info",
  children,
  className = "",
}: {
  variant?: "info" | "success" | "warning" | "error";
  children: ReactNode;
  className?: string;
}) {
  const styles = {
    info: "border-emerald-200 bg-emerald-50/80 text-emerald-900",
    success: "border-emerald-200 bg-emerald-50/80 text-emerald-900",
    warning: "border-amber-200 bg-amber-50/80 text-amber-900",
    error: "border-red-200 bg-red-50/80 text-red-900",
  };
  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${styles[variant]} ${className}`}
    >
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center py-12 text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-2xl">
        📋
      </div>
      <h3 className="font-semibold text-slate-900">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </Card>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`inline-block h-5 w-5 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600 ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}

export function PageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-12 text-slate-500">
      <Spinner />
      <span className="text-sm">{label}</span>
    </div>
  );
}

/* ── Stat card ── */
export function StatCard({
  label,
  value,
  href,
  accent,
}: {
  label: string;
  value: number | string;
  href?: string;
  accent?: "emerald" | "teal" | "green" | "amber";
}) {
  const accents = {
    emerald: "group-hover:border-emerald-200 group-hover:shadow-emerald-100",
    teal: "group-hover:border-teal-200 group-hover:shadow-teal-100",
    green: "group-hover:border-green-200 group-hover:shadow-green-100",
    amber: "group-hover:border-amber-200 group-hover:shadow-amber-100",
  };
  const inner = (
    <Card
      className={`group transition hover:-translate-y-0.5 hover:shadow-md ${href ? "cursor-pointer" : ""} ${accent ? accents[accent] : ""}`}
      padding="default"
    >
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
    </Card>
  );
  if (href) {
    return <Link href={href}>{inner}</Link>;
  }
  return inner;
}

/* ── Badge & score ── */
const STATUS_COLORS: Record<string, string> = {
  new: "bg-slate-100 text-slate-700 ring-slate-200/60",
  saved: "bg-amber-50 text-amber-800 ring-amber-200/60",
  draft: "bg-slate-100 text-slate-700 ring-slate-200/60",
  tailored: "bg-teal-50 text-teal-700 ring-teal-200/60",
  autofilled: "bg-green-50 text-green-700 ring-green-200/60",
  needs_review: "bg-amber-50 text-amber-800 ring-amber-200/60",
  submitted: "bg-emerald-50 text-emerald-700 ring-emerald-200/60",
  failed: "bg-red-50 text-red-700 ring-red-200/60",
  rejected: "bg-red-50 text-red-700 ring-red-200/60",
  interview: "bg-emerald-50 text-emerald-700 ring-emerald-200/60",
  offer: "bg-emerald-50 text-emerald-700 ring-emerald-200/60",
};

export function Badge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? "bg-slate-100 text-slate-700 ring-slate-200/60";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${color}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function ScorePill({ score }: { score: number }) {
  const color =
    score >= 70
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200/60"
      : score >= 40
        ? "bg-amber-50 text-amber-800 ring-amber-200/60"
        : "bg-slate-100 text-slate-600 ring-slate-200/60";
  return (
    <span
      className={`inline-flex shrink-0 whitespace-nowrap rounded-lg px-2 py-0.5 text-xs font-semibold leading-none ring-1 ring-inset ${color}`}
    >
      {score}% match
    </span>
  );
}

/* ── Pagination ── */
export function Pagination({
  page,
  totalPages,
  onPageChange,
  className = "",
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) =>
      p === 1 ||
      p === totalPages ||
      (p >= page - 1 && p <= page + 1),
  );

  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-1.5 ${className}`}
    >
      <Button
        variant="secondary"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </Button>
      {pages.map((p, i) => {
        const prev = pages[i - 1];
        const gap = prev !== undefined && p - prev > 1;
        return (
          <span key={p} className="flex items-center gap-1.5">
            {gap && <span className="px-1 text-slate-400">…</span>}
            <button
              type="button"
              onClick={() => onPageChange(p)}
              className={`min-w-8 rounded-lg px-2.5 py-1.5 text-sm font-medium transition ${
                p === page
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {p}
            </button>
          </span>
        );
      })}
      <Button
        variant="secondary"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </Button>
    </div>
  );
}

/* ── Upload dropzone ── */
export function UploadZone({
  onFile,
  accept,
  loading,
  label = "Click to upload or drag & drop",
  hint,
}: {
  onFile: (file: File) => void;
  accept?: string;
  loading?: boolean;
  label?: string;
  hint?: string;
}) {
  return (
    <label
      className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 transition ${
        loading
          ? "border-emerald-200 bg-emerald-50/50"
          : "border-slate-200 bg-slate-50/50 hover:border-emerald-300 hover:bg-emerald-50/30"
      }`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) onFile(file);
      }}
    >
      <input
        type="file"
        className="hidden"
        accept={accept}
        disabled={loading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
        }}
      />
      {loading ? (
        <Spinner className="h-6 w-6" />
      ) : (
        <>
          <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-white text-lg shadow-sm">
            ↑
          </div>
          <p className="text-sm font-medium text-slate-700">{label}</p>
          {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
        </>
      )}
    </label>
  );
}
