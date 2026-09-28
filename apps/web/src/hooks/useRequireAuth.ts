"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import type { Role } from "@/types/user";

/**
 * Redirects to /login if there's no session once the persisted store has
 * hydrated, or to "/" if the user is logged in but not one of allowedRoles.
 * Returns the current user (null while still resolving).
 */
export function useRequireAuth(allowedRoles?: Role[]) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  useEffect(() => {
    if (!hasHydrated) return;

    if (!user) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
      router.replace("/");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, user, pathname]);

  const isAuthorized = !!user && (!allowedRoles || allowedRoles.includes(user.role));

  return { user, isReady: hasHydrated && isAuthorized };
}
