import { RegisterForm } from "@/components/AuthForm";
import { FormShell } from "@/components/AuthShell";

export default function RegisterPage() {
  return (
    <FormShell
      title="Create your account"
      subtitle="Free to start. Gap suggestions woven into your resume and cover letter."
    >
      <RegisterForm />
    </FormShell>
  );
}
