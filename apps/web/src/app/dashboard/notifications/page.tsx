"use client";

import { authFetch } from "@/lib/auth-fetch";
import { useAuthedQuery } from "@/hooks/useAuthedQuery";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import type { Notification } from "@/types/notification";
import type { PaginatedResult } from "@/types/pagination";

function timeAgo(date: string): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NotificationsPage() {
  const { data, loading, error, refetch } = useAuthedQuery<PaginatedResult<Notification>>("/notifications");

  const markAsRead = (id: string) => {
    authFetch.patch(`/notifications/${id}/read`).then(refetch).catch(() => {});
  };

  const markAllAsRead = () => {
    authFetch.patch("/notifications/read-all").then(refetch).catch(() => {});
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const items = data?.items ?? [];
  const hasUnread = items.some((n) => !n.isRead);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Notifications</h2>
        {hasUnread && (
          <button onClick={markAllAsRead} className="text-sm font-medium text-primary-dark hover:underline">
            Mark all as read
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState title="No notifications yet" description="We'll let you know when something happens." />
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((notification) => (
            <button
              key={notification._id}
              onClick={() => !notification.isRead && markAsRead(notification._id)}
              className={`flex items-start gap-3 rounded-2xl p-4 text-left shadow-soft transition-shadow hover:shadow-soft-hover ${
                notification.isRead ? "bg-surface" : "bg-primary-light/60"
              }`}
            >
              {!notification.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />}
              <div className="min-w-0 flex-1">
                <div className="flex w-full items-center justify-between gap-2">
                  <p className="font-medium text-foreground">{notification.title}</p>
                  <span className="shrink-0 text-xs text-muted">{timeAgo(notification.createdAt)}</span>
                </div>
                <p className="mt-0.5 text-sm text-muted">{notification.message}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
