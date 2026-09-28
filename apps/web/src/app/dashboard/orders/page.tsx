"use client";

import { useState } from "react";
import { useAuthedQuery } from "@/hooks/useAuthedQuery";
import { authFetch } from "@/lib/auth-fetch";
import { ApiError } from "@/lib/api-client";
import { OrderCard } from "@/components/dashboard/OrderCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import type { Order } from "@/types/order";
import type { PaginatedResult } from "@/types/pagination";

export default function OrdersPage() {
  const { data, loading, error, refetch } = useAuthedQuery<PaginatedResult<Order>>("/orders");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleCancel = async (id: string) => {
    setCancellingId(id);
    setActionError(null);
    try {
      await authFetch.post(`/orders/${id}/cancel`);
      refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not cancel this order.");
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const items = data?.items ?? [];

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-2xl font-bold tracking-tight">My Orders</h2>
      {actionError && <p className="text-sm text-error">{actionError}</p>}
      {items.length === 0 ? (
        <EmptyState
          title="No orders yet"
          description="Orders are created automatically once a group buy you joined succeeds."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {items.map((order) => (
            <OrderCard
              key={order._id}
              order={order}
              onCancel={cancellingId === order._id ? undefined : handleCancel}
            />
          ))}
        </div>
      )}
    </div>
  );
}
