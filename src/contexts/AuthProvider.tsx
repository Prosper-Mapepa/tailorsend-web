"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import type { AuthUser } from "@/lib/auth-client";
import {
  fetchMe,
  getStoredToken,
  loginUser,
  logoutUser,
  registerUser,
  setStoredToken,
} from "@/lib/auth-client";
import { markOnboardingPending } from "@/lib/onboarding";
import { syncExtensionAuth } from "@/lib/extension-bridge";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  /** Persist OAuth/session token and load the user into client auth state. */
  completeSession: (
    token: string,
    opts?: { newUser?: boolean },
  ) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const refresh = useCallback(async () => {
    const me = await fetchMe();
    setUser(me);
  }, []);

  useEffect(() => {
    fetchMe()
      .then(setUser)
      .finally(() => setLoading(false));
  }, []);

  // Keep the Chrome extension signed in whenever TailorSend has a session.
  useEffect(() => {
    if (loading) return;
    syncExtensionAuth(user ? getStoredToken() : null);
  }, [loading, user]);

  // Recover when a token exists (e.g. set on /auth/callback) but client user
  // was never loaded — otherwise dashboard SSR can be logged-in while Nav shows Sign in.
  useEffect(() => {
    if (loading || user) return;
    if (!getStoredToken()) return;
    let cancelled = false;
    fetchMe().then((me) => {
      if (!cancelled) setUser(me);
    });
    return () => {
      cancelled = true;
    };
  }, [loading, user, pathname]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { token, user: u } = await loginUser({ email, password });
      setStoredToken(token);
      setUser(u);
      router.push("/");
      router.refresh();
    },
    [router],
  );

  const signUp = useCallback(
    async (email: string, password: string, name?: string) => {
      const { token, user: u } = await registerUser({ email, password, name });
      setStoredToken(token);
      setUser(u);
      markOnboardingPending();
      router.push("/profile");
      router.refresh();
    },
    [router],
  );

  const completeSession = useCallback(
    async (token: string, opts?: { newUser?: boolean }) => {
      setStoredToken(token);
      const me = await fetchMe();
      if (!me) {
        setStoredToken(null);
        throw new Error(
          "Could not load your account after sign-in. Please try again.",
        );
      }
      setUser(me);
      setLoading(false);
      if (opts?.newUser) markOnboardingPending();
      router.replace(opts?.newUser ? "/profile" : "/");
      router.refresh();
    },
    [router],
  );

  const signOut = useCallback(async () => {
    await logoutUser();
    setUser(null);
    syncExtensionAuth(null);
    router.push("/");
    router.refresh();
  }, [router]);

  // Valid session on auth pages → home (proxy no longer does this via cookie).
  useEffect(() => {
    if (loading || !user) return;
    if (pathname === "/sign-in" || pathname === "/register") {
      router.replace("/");
    }
  }, [user, loading, pathname, router]);

  const value = useMemo(
    () => ({
      user,
      loading,
      signIn,
      signUp,
      completeSession,
      signOut,
      refresh,
    }),
    [user, loading, signIn, signUp, completeSession, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
