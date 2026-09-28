"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { ApiError } from "@/lib/api-client";

interface QueryState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Fetches `path` whenever `enabled` or `reloadKey` change. Follows the same
 * discipline as the group-buys browse page: the effect only ever calls
 * setState from inside the promise's callbacks, never synchronously in the
 * effect body, so it can't trip React's set-state-in-effect purity rule.
 * Callers that need to show a spinner on refetch should set `loading` to
 * true themselves (in an event handler) before bumping reloadKey.
 */
export function useAuthedQuery<T>(path: string, enabled = true) {
  const [state, setState] = useState<QueryState<T>>({ data: null, loading: enabled, error: null });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    authFetch
      .get<T>(path)
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err instanceof ApiError ? err.message : "Something went wrong. Please try again.";
        setState((prev) => ({ data: prev.data, loading: false, error: message }));
      });

    return () => {
      cancelled = true;
    };
  }, [path, enabled, reloadKey]);

  const refetch = () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    setReloadKey((k) => k + 1);
  };

  return { ...state, refetch };
}
