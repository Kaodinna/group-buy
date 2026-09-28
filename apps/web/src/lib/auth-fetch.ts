import { apiClient, ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";

/**
 * Wraps an authenticated call with the current access token and, on a 401,
 * silently refreshes the session (via the httpOnly refresh cookie) and
 * retries exactly once before giving up. Components never handle token
 * refresh themselves.
 */
async function withAuth<T>(fn: (token?: string) => Promise<T>): Promise<T> {
  const token = useAuthStore.getState().accessToken;

  try {
    return await fn(token ?? undefined);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      const newToken = await useAuthStore.getState().refresh();
      if (newToken) {
        return await fn(newToken);
      }
    }
    throw error;
  }
}

export const authFetch = {
  get: <T>(path: string) => withAuth<T>((token) => apiClient.get<T>(path, { token })),
  post: <T>(path: string, body?: unknown) =>
    withAuth<T>((token) => apiClient.post<T>(path, body, { token })),
  patch: <T>(path: string, body?: unknown) =>
    withAuth<T>((token) => apiClient.patch<T>(path, body, { token })),
  delete: <T>(path: string) => withAuth<T>((token) => apiClient.delete<T>(path, { token })),
  upload: <T>(path: string, formData: FormData) =>
    withAuth<T>((token) => apiClient.upload<T>(path, formData, { token })),
};
