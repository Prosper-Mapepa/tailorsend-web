import Link from "next/link";

type SiteLogoProps = {
  href?: string;
  showName?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  variant?: "light" | "dark" | "brand";
  className?: string;
};

const SIZES = {
  xs: { box: "h-8 w-8 rounded-lg text-base", name: "text-sm" },
  sm: { box: "h-8 w-8 rounded-xl text-base", name: "text-lg" },
  md: { box: "h-10 w-10 rounded-xl text-lg", name: "text-lg" },
  lg: { box: "h-11 w-11 rounded-2xl text-xl", name: "text-xl" },
};

const VARIANTS = {
  light: {
    box: "bg-gradient-to-br from-emerald-600 to-green-600 shadow-md shadow-emerald-500/25",
    name: "text-slate-900",
  },
  dark: {
    box: "bg-white/15 ring-1 ring-white/20 backdrop-blur-sm",
    name: "text-white",
  },
  brand: {
    box: "bg-gradient-to-br from-emerald-600 to-green-600 shadow-lg shadow-emerald-600/30",
    name: "text-slate-900",
  },
};

export function SiteLogo({
  href = "/",
  showName = true,
  size = "md",
  variant = "light",
  className = "",
}: SiteLogoProps) {
  const s = SIZES[size];
  const v = VARIANTS[variant];

  const content = (
    <>
      <span
        className={`grid place-items-center ${s.box} ${v.box}`}
        aria-hidden
      >
        🚀
      </span>
      {showName && (
        <span className={`font-bold tracking-tight ${s.name} ${v.name}`}>
          TailorSend
        </span>
      )}
    </>
  );

  return (
    <Link href={href} className={`inline-flex items-center gap-2.5 ${className}`}>
      {content}
    </Link>
  );
}
