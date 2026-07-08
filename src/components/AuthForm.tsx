"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button, Input, Label } from "@/components/ui";
import {
  requestPasswordReset,
  resetPassword,
  setStoredToken,
} from "@/lib/auth-client";
import { useAuth } from "@/contexts/AuthProvider";

function AuthError({ message }: { message: string | null }) {
  if (!message) return null;
  return <Alert variant="error">{message}</Alert>;
}

export function SignInForm() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <AuthError message={error} />
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@university.edu"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-2"
        />
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
          >
            Forgot?
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={busy} className="mt-2 w-full" size="lg">
        {busy ? "Signing in…" : "Sign in"}
      </Button>
      <p className="!mt-6 text-center text-sm text-slate-500">
        No account?{" "}
        <Link
          href="/register"
          className="font-semibold text-emerald-600 hover:text-emerald-700"
        >
          Create one free
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signUp(email, password, name || undefined);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <AuthError message={error} />
      <div>
        <Label htmlFor="name">Full name</Label>
        <Input
          id="name"
          type="text"
          autoComplete="name"
          placeholder="Alex Johnson"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-2"
        />
      </div>
      <div>
        <Label htmlFor="reg-email">Email</Label>
        <Input
          id="reg-email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@university.edu"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-2"
        />
        <p className="mt-2 text-xs text-emerald-600">
          .edu emails unlock student pricing & extra free kits.
        </p>
      </div>
      <div>
        <Label htmlFor="reg-password">Password</Label>
        <Input
          id="reg-password"
          type="password"
          required
          autoComplete="new-password"
          placeholder="Min. 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-2"
        />
      </div>
      <Button type="submit" disabled={busy} className="mt-2 w-full" size="lg">
        {busy ? "Creating account…" : "Get started free"}
      </Button>
      <p className="!mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link
          href="/sign-in"
          className="font-semibold text-emerald-600 hover:text-emerald-700"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    setDevLink(null);
    try {
      const data = await requestPasswordReset(email);
      setMessage(data.message);
      if (data.devResetLink) setDevLink(data.devResetLink);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <AuthError message={error} />
      {message && <Alert variant="success">{message}</Alert>}
      {devLink && (
        <Alert variant="warning">
          Dev reset link:{" "}
          <a href={devLink} className="break-all underline">
            {devLink}
          </a>
        </Alert>
      )}
      <div>
        <Label htmlFor="forgot-email">Email</Label>
        <Input
          id="forgot-email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-2"
        />
      </div>
      <Button type="submit" disabled={busy} className="mt-2 w-full" size="lg">
        {busy ? "Sending…" : "Send reset link"}
      </Button>
      <p className="!mt-6 text-center text-sm text-slate-500">
        <Link
          href="/sign-in"
          className="font-semibold text-emerald-600 hover:text-emerald-700"
        >
          ← Back to sign in
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const data = await resetPassword({ token, password });
      setStoredToken(data.token);
      router.push("/");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <AuthError message={error} />
      <div>
        <Label htmlFor="new-password">New password</Label>
        <Input
          id="new-password"
          type="password"
          required
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-2"
        />
      </div>
      <div>
        <Label htmlFor="confirm-password">Confirm password</Label>
        <Input
          id="confirm-password"
          type="password"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="mt-2"
        />
      </div>
      <Button type="submit" disabled={busy} className="mt-2 w-full" size="lg">
        {busy ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
