"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Alert } from "@/components/ui";
import { useAuth } from "@/contexts/AuthProvider";

const ERROR_MESSAGES: Record<string, string> = {
  cancelled: "Google sign-in was cancelled.",
  google_not_configured: "Google sign-in is not set up on this server.",
  invalid_state: "Sign-in expired. Please try again.",
  account_conflict: "This email is linked to another Google account.",
  google_auth_failed: "Google sign-in failed. Please try again.",
};

function OAuthCallbackInner() {
  const { completeSession } = useAuth();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const errCode = searchParams.get("error");
    if (errCode) {
      setError(ERROR_MESSAGES[errCode] ?? "Sign-in failed. Please try again.");
      return;
    }

    const token = searchParams.get("token");
    if (!token) {
      setError("Missing sign-in token. Please try again.");
      return;
    }

    const isNew = searchParams.get("new") === "1";
    let cancelled = false;
    completeSession(token, { newUser: isNew }).catch((err) => {
      if (!cancelled) {
        setError((err as Error).message || "Sign-in failed. Please try again.");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [completeSession, searchParams]);

  if (error) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <Alert variant="error">{error}</Alert>
        <Link
          href="/sign-in"
          className="mt-6 inline-block text-sm font-semibold text-emerald-600 hover:text-emerald-700"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center text-sm text-slate-600">
      Completing sign-in…
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 py-16 text-center text-sm text-slate-600">
          Completing sign-in…
        </div>
      }
    >
      <OAuthCallbackInner />
    </Suspense>
  );
}
