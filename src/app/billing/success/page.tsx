"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/auth-client";
import { usageKitLabel } from "@/lib/billing/format";
import type { UsageSummary } from "@/lib/billing/usage-core";
import { Alert, Button, Card, PageLoader } from "@/components/ui";

function BillingSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError("Missing checkout session.");
      setLoading(false);
      return;
    }

    apiFetch(`/api/billing/confirm?session_id=${encodeURIComponent(sessionId)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not confirm payment");
        setUsage(data.usage);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) return <PageLoader label="Confirming your purchase…" />;

  return (
    <div className="mx-auto max-w-lg space-y-6 py-8">
      {error ? (
        <Alert variant="error">{error}</Alert>
      ) : (
        <Card className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">
            ✓
          </div>
          <h1 className="mt-4 text-xl font-bold text-slate-900">
            Payment successful
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Your account has been updated. You&apos;re ready to tailor and apply.
          </p>
          {usage && (
            <p className="mt-3 rounded-lg bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800">
              {usageKitLabel(usage)}
            </p>
          )}
        </Card>
      )}

      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/billing">
          <Button variant="secondary">Back to billing</Button>
        </Link>
        <Link href="/jobs">
          <Button>Search jobs</Button>
        </Link>
      </div>
    </div>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={<PageLoader label="Confirming your purchase…" />}>
      <BillingSuccessContent />
    </Suspense>
  );
}
