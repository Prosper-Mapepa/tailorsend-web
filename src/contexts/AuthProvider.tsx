"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type { AuthUser } from "@/lib/auth-client";
import {
  fetchMe,
  loginUser,
  logoutUser,
  registerUser,
  setStoredToken,
} from "@/lib/auth-client";
import { markOnboardingPending } from "@/lib/onboarding";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refresh = useCallback(async () => {
    const me = await fetchMe();
    setUser(me);
  }, []);

  useEffect(() => {
    fetchMe()
      .then(setUser)
      .finally(() => setLoading(false));
  }, []);

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

  const signOut = useCallback(async () => {
    await logoutUser();
    setUser(null);
    router.push("/");
    router.refresh();
  }, [router]);

  const value = useMemo(
    () => ({ user, loading, signIn, signUp, signOut, refresh }),
    [user, loading, signIn, signUp, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
