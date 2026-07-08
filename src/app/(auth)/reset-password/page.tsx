import Link from "next/link";
import { ResetPasswordForm } from "@/components/AuthForm";
import { FormShell } from "@/components/AuthShell";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <FormShell
        title="Invalid link"
        subtitle="This password reset link is missing or has expired."
      >
        <p className="text-sm leading-relaxed text-slate-600">
          Request a new link from the{" "}
          <Link
            href="/forgot-password"
            className="font-medium text-emerald-600 hover:text-emerald-700"
          >
            forgot password
          </Link>{" "}
          page.
        </p>
      </FormShell>
    );
  }

  return (
    <FormShell
      title="Set new password"
      subtitle="Choose a strong password for your account."
    >
      <ResetPasswordForm token={token} />
    </FormShell>
  );
}
