import Image from "next/image";
import Link from "next/link";
import { SITE_LOGO_PATH, SITE_NAME } from "@/lib/brand";

export type SiteLogoHideNameBelow = "sm" | "md" | "lg";

type SiteLogoProps = {
  href?: string;
  showName?: boolean;
  /** Hide wordmark below this breakpoint (logo icon still shown). */
  hideNameBelow?: SiteLogoHideNameBelow;
  size?: "xs" | "sm" | "md" | "lg";
  variant?: "light" | "dark" | "brand";
  className?: string;
};

const HIDE_NAME_CLASS: Record<SiteLogoHideNameBelow, string> = {
  sm: "hidden sm:inline",
  md: "hidden md:inline",
  lg: "hidden lg:inline",
};

const SIZES = {
  xs: { px: 32, box: "h-8 w-8 rounded-lg", name: "text-sm" },
  sm: { px: 32, box: "h-8 w-8 rounded-xl", name: "text-lg" },
  md: { px: 40, box: "h-10 w-10 rounded-xl", name: "text-lg" },
  lg: { px: 44, box: "h-11 w-11 rounded-2xl", name: "text-xl" },
};

const VARIANTS = {
  light: {
    box: "bg-white shadow-sm ring-1 ring-slate-200/80",
    name: "text-slate-900",
  },
  dark: {
    box: "bg-white shadow-md ring-1 ring-white/30",
    name: "text-white",
  },
  brand: {
    box: "bg-white shadow-md ring-1 ring-emerald-600/15",
    name: "text-slate-900",
  },
};

export function SiteLogo({
  href = "/",
  showName = true,
  hideNameBelow,
  size = "md",
  variant = "light",
  className = "",
}: SiteLogoProps) {
  const s = SIZES[size];
  const v = VARIANTS[variant];
  const nameHidden = hideNameBelow ? HIDE_NAME_CLASS[hideNameBelow] : undefined;

  const content = (
    <>
      <span
        className={`relative flex shrink-0 items-center justify-center overflow-hidden ${s.box} ${v.box}`}
      >
        <Image
          src={SITE_LOGO_PATH}
          alt=""
          width={s.px}
          height={s.px}
          className="h-full w-full object-contain p-0.5"
          priority={size === "lg"}
        />
      </span>
      {showName && (
        <span
          className={`font-bold tracking-tight ${s.name} ${v.name} ${nameHidden ?? ""}`}
        >
          Tailor<span className="text-emerald-600">Send</span>
        </span>
      )}
    </>
  );

  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2.5 ${className}`}
      aria-label={showName ? undefined : SITE_NAME}
    >
      {content}
    </Link>
  );
}
