"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthProvider";
import {
  isOnboardingComplete,
  isOnboardingPending,
} from "@/lib/onboarding";
import { OnboardingTour } from "@/components/OnboardingTour";

const HIDDEN_PATHS = [
  "/sign-in",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/terms",
  "/privacy",
];

export function OnboardingGate() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (loading || !user) {
      setShow(false);
      return;
    }
    if (HIDDEN_PATHS.some((p) => pathname.startsWith(p))) {
      setShow(false);
      return;
    }
    if (pathname === "/" && !user) {
      setShow(false);
      return;
    }
    const pending = isOnboardingPending();
    const complete = isOnboardingComplete(user.id);
    setShow(pending && !complete);
  }, [user, loading, pathname]);

  if (!show || !user) return null;

  return (
    <OnboardingTour userId={user.id} onClose={() => setShow(false)} />
  );
}
