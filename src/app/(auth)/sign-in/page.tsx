import { SignInForm } from "@/components/AuthForm";
import { FormShell } from "@/components/AuthShell";

export default function SignInPage() {
  return (
    <FormShell
      title="Welcome back"
      subtitle="Sign in to get gap suggestions added to your resume and cover letters."
    >
      <SignInForm />
    </FormShell>
  );
}
