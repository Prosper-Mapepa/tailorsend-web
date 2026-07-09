const COMPLETE_KEY = "tailorsend-onboarding-complete";
const PENDING_KEY = "tailorsend-onboarding-pending";

export function onboardingStorageKey(userId: string): string {
  return `${COMPLETE_KEY}:${userId}`;
}

export function isOnboardingComplete(userId: string): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(onboardingStorageKey(userId)) === "1";
}

export function markOnboardingComplete(userId: string): void {
  localStorage.setItem(onboardingStorageKey(userId), "1");
  sessionStorage.removeItem(PENDING_KEY);
}

export function markOnboardingPending(): void {
  sessionStorage.setItem(PENDING_KEY, "1");
}

export function isOnboardingPending(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(PENDING_KEY) === "1";
}

export function clearOnboardingPending(): void {
  sessionStorage.removeItem(PENDING_KEY);
}

export interface OnboardingStep {
  icon: string;
  title: string;
  body: string;
  navLabel?: string;
  href?: string;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    icon: "👋",
    title: "Welcome to TailorSend",
    body: "Apply smarter in four steps: build your profile, find roles, tailor documents, then autofill applications — always with your approval before submit.",
  },
  {
    icon: "📄",
    title: "Step 1 — Upload your profile",
    body: "Add your resume on Profile. We extract contact info, experience, education, projects, and skills so the AI only uses facts you’ve provided.",
    navLabel: "Profile",
    href: "/profile",
  },
  {
    icon: "🔍",
    title: "Step 2 — Find matching jobs",
    body: "Jobs searches boards and scores openings against your profile so you focus on roles worth tailoring for.",
    navLabel: "Jobs",
    href: "/jobs",
  },
  {
    icon: "✨",
    title: "Step 3 — Tailor resume & cover",
    body: "Paste a posting or pick a saved job. We research the company, suggest honest gap fixes, and weave them into tailored documents.",
    navLabel: "Tailor",
    href: "/tailor",
  },
  {
    icon: "⚡",
    title: "Step 4 — Autofill applications",
    body: "Track every application, then autofill Greenhouse, Lever, and multi-step ATS forms in a real browser. You review every field — we never click submit.",
    navLabel: "Applications",
    href: "/applications",
  },
  {
    icon: "🚀",
    title: "Ready to start?",
    body: "Upload your resume on Profile to unlock matching and tailoring. Students with a .edu email get free monthly kits.",
    navLabel: "Profile",
    href: "/profile#upload",
  },
];
