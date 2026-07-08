import { ForgotPasswordForm } from "@/components/AuthForm";
import { FormShell } from "@/components/AuthShell";

export default function ForgotPasswordPage() {
  return (
    <FormShell
      title="Reset password"
      subtitle="We'll email you a secure link to choose a new password."
    >
      <ForgotPasswordForm />
    </FormShell>
  );
}
