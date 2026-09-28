"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/auth-store";
import { authFetch } from "@/lib/auth-fetch";
import type { PublicUser } from "@/types/user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const ranRef = useRef(false);

  useEffect(() => {
    if (!hasHydrated || ranRef.current) return;
    ranRef.current = true;

    authFetch
      .get<PublicUser>("/auth/me")
      .then((user) => useAuthStore.setState({ user }))
      .catch(() => useAuthStore.setState({ user: null, accessToken: null }));
  }, [hasHydrated]);

  return <>{children}</>;
}
