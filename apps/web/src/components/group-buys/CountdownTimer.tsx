"use client";

import { useState, useSyncExternalStore } from "react";

interface Remaining {
  total: number;
  d: number;
  h: number;
  m: number;
  s: number;
}

const SERVER_SNAPSHOT: Remaining = { total: -1, d: 0, h: 0, m: 0, s: 0 };

function computeRemaining(endDate: string): Remaining {
  const total = Math.max(0, new Date(endDate).getTime() - Date.now());
  const d = Math.floor(total / (1000 * 60 * 60 * 24));
  const h = Math.floor((total / (1000 * 60 * 60)) % 24);
  const m = Math.floor((total / (1000 * 60)) % 60);
  const s = Math.floor((total / 1000) % 60);
  return { total, d, h, m, s };
}

/**
 * getSnapshot must return a referentially-stable value between ticks or
 * useSyncExternalStore treats every render as "changed" and loops forever.
 * The interval is only created lazily inside subscribe(), which React only
 * calls from a passive effect - never during SSR - so this can't leak a
 * timer on the server.
 */
function createCountdownStore(endDate: string) {
  let snapshot = computeRemaining(endDate);
  const listeners = new Set<() => void>();
  let interval: ReturnType<typeof setInterval> | null = null;

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      interval ??= setInterval(() => {
        if (snapshot.total === 0) return;
        snapshot = computeRemaining(endDate);
        listeners.forEach((l) => l());
      }, 1000);

      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && interval) {
          clearInterval(interval);
          interval = null;
        }
      };
    },
    getSnapshot: () => snapshot,
  };
}

export function CountdownTimer({ endDate, compact = false }: { endDate: string; compact?: boolean }) {
  const [store] = useState(() => createCountdownStore(endDate));
  const remaining = useSyncExternalStore(store.subscribe, store.getSnapshot, () => SERVER_SNAPSHOT);

  if (remaining.total < 0) return <span className={compact ? "text-xs" : "text-sm"}>&nbsp;</span>;

  if (remaining.total === 0) {
    return (
      <span className={`font-semibold text-error ${compact ? "text-xs" : "text-sm"}`}>Ended</span>
    );
  }

  const ONE_HOUR = 1000 * 60 * 60;
  const ONE_DAY = ONE_HOUR * 24;
  // Growing urgency as the deadline nears - communicated through color, not
  // extra motion, so it stays legible in a list of many cards ticking down.
  const urgencyClass =
    remaining.total < ONE_HOUR ? "text-error" : remaining.total < ONE_DAY ? "text-warning" : "text-foreground";

  const parts = remaining.d > 0 ? `${remaining.d}d ${remaining.h}h` : `${remaining.h}h ${remaining.m}m ${remaining.s}s`;

  return (
    <span className={`font-semibold tabular-nums ${urgencyClass} ${compact ? "text-xs" : "text-sm"}`}>
      {parts}
    </span>
  );
}
