"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authFetch } from "@/lib/auth-fetch";

export function NotificationBell() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchCount = () => {
      authFetch
        .get<{ count: number }>("/notifications/unread-count")
        .then((data) => {
          if (!cancelled) setCount(data.count);
        })
        .catch(() => {
          if (!cancelled) setCount(null);
        });
    };

    fetchCount();
    const interval = setInterval(fetchCount, 30_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <Link
      href="/dashboard/notifications"
      className="relative rounded-full p-2 text-muted transition-colors hover:bg-black/3 hover:text-foreground dark:hover:bg-white/6"
      aria-label="Notifications"
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth={1.8}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 0 0-4-5.65V5a2 2 0 1 0-4 0v.35A6 6 0 0 0 6 11v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9"
        />
      </svg>
      {!!count && count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
