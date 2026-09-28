import { create } from "zustand";
import { persist } from "zustand/middleware";
import { apiClient } from "@/lib/api-client";
import type { PublicUser } from "@/types/user";

interface AuthState {
  user: PublicUser | null;
  accessToken: string | null;
  hasHydrated: boolean;
  setAuth: (user: PublicUser, accessToken: string) => void;
  setHasHydrated: (value: boolean) => void;
  /** Silently exchanges the httpOnly refresh cookie for a new access token. */
  refresh: () => Promise<string | null>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      hasHydrated: false,

      setAuth: (user, accessToken) => set({ user, accessToken }),

      setHasHydrated: (value) => set({ hasHydrated: value }),

      refresh: async () => {
        try {
          const data = await apiClient.post<{ accessToken: string }>("/auth/refresh");
          set({ accessToken: data.accessToken });
          return data.accessToken;
        } catch {
          set({ user: null, accessToken: null });
          return null;
        }
      },

      logout: async () => {
        const token = get().accessToken;
        try {
          await apiClient.post("/auth/logout", undefined, { token: token ?? undefined });
        } catch {
          // Clear local state regardless of whether the server call succeeded.
        }
        set({ user: null, accessToken: null });
      },
    }),
    {
      name: "gb-auth",
      partialize: (state) => ({ user: state.user, accessToken: state.accessToken }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
