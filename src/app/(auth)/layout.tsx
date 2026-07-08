/** Full-bleed layout for sign-in, register, and password flows. */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-page fixed inset-0 z-30 overflow-y-auto">
      <div className="auth-page-gradient pointer-events-none fixed inset-0" />
      <div className="brand-mesh pointer-events-none fixed inset-0" />
      <div className="brand-grid pointer-events-none fixed inset-0 opacity-[0.12]" />
      <div className="relative min-h-full">{children}</div>
    </div>
  );
}
