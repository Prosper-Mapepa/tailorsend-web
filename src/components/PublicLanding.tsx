import { AuthMarketingShell } from "@/components/AuthShell";

export function PublicLanding() {
  return (
    <div className="auth-page fixed inset-0 z-30 overflow-y-auto">
      <div className="auth-page-gradient pointer-events-none fixed inset-0" />
      <div className="brand-mesh pointer-events-none fixed inset-0" />
      <div className="brand-grid pointer-events-none fixed inset-0 opacity-[0.12]" />
      <div className="relative min-h-full w-full">
        <AuthMarketingShell />
      </div>
    </div>
  );
}
