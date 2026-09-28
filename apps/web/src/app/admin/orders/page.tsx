"use client";

import { useState } from "react";
import { useAuthedQuery } from "@/hooks/useAuthedQuery";
import { OrderStatusUpdater } from "@/components/dashboard/OrderStatusUpdater";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Pagination } from "@/components/ui/Pagination";
import { formatMoney } from "@/lib/format";
import type { Order, OrderStatus } from "@/types/order";
import type { PaginatedResult } from "@/types/pagination";

const TABS: { label: string; value: OrderStatus | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Processing", value: "PROCESSING" },
  { label: "Shipped", value: "SHIPPED" },
  { label: "Delivered", value: "DELIVERED" },
  { label: "Cancelled", value: "CANCELLED" },
];

const ORDER_STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-gray-600 text-white",
  PROCESSING: "bg-blue-600 text-white",
  SHIPPED: "bg-purple-600 text-white",
  DELIVERED: "bg-success text-white",
  CANCELLED: "bg-error text-white",
};

export default function AdminOrdersPage() {
  const [tab, setTab] = useState<OrderStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);

  const statusQuery = tab === "ALL" ? "" : `&orderStatus=${tab}`;
  const { data, loading, error, refetch } = useAuthedQuery<PaginatedResult<Order>>(
    `/orders?page=${page}&limit=20${statusQuery}`,
  );

  const handleTabChange = (value: OrderStatus | "ALL") => {
    setTab(value);
    setPage(1);
  };

  const items = data?.items ?? [];

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-2xl font-bold tracking-tight">Orders</h2>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => handleTabChange(t.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t.value ? "bg-primary text-white" : "bg-surface text-muted shadow-soft hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyState title="No orders here" description="Nothing matches this filter right now." />
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-surface shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-black/3 text-left text-xs uppercase text-muted dark:bg-white/6">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((order) => {
                const customer = typeof order.userId === "string" ? null : order.userId;
                return (
                  <tr key={order._id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <p className="font-medium">#{order._id.slice(-8).toUpperCase()}</p>
                      <p className="text-xs text-muted">{order.items.map((i) => i.name).join(", ")}</p>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {customer ? `${customer.firstName} ${customer.lastName}` : "Unknown"}
                    </td>
                    <td className="px-4 py-3">{formatMoney(order.totalAmount, order.currency)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
                          ORDER_STATUS_STYLES[order.orderStatus] ?? "bg-gray-600 text-white"
                        }`}
                      >
                        {order.orderStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <OrderStatusUpdater
                        orderId={order._id}
                        orderStatus={order.orderStatus}
                        onUpdated={refetch}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {data && <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />}
    </div>
  );
}
