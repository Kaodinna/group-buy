"use client";

import { useState } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { ApiError } from "@/lib/api-client";
import type { OrderStatus } from "@/types/order";

const NEXT_STATUS: Partial<Record<OrderStatus, { label: string; target: OrderStatus }>> = {
  PENDING: { label: "Mark processing", target: "PROCESSING" },
  PROCESSING: { label: "Mark shipped", target: "SHIPPED" },
  SHIPPED: { label: "Mark delivered", target: "DELIVERED" },
};

export function OrderStatusUpdater({
  orderId,
  orderStatus,
  onUpdated,
}: {
  orderId: string;
  orderStatus: OrderStatus;
  onUpdated: () => void;
}) {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const next = NEXT_STATUS[orderStatus];
  if (!next) return null;

  const handleClick = async () => {
    setUpdating(true);
    setError(null);
    try {
      await authFetch.patch(`/orders/${orderId}/status`, { orderStatus: next.target });
      onUpdated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update this order.");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      {error && <p className="text-xs text-error">{error}</p>}
      <button
        onClick={handleClick}
        disabled={updating}
        className="rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-black/3 disabled:opacity-60 dark:hover:bg-white/6"
      >
        {updating ? "Updating…" : next.label}
      </button>
    </div>
  );
}
