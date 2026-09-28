import Link from "next/link";
import type { Order } from "@/types/order";
import { formatMoney } from "@/lib/format";

const ORDER_STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-gray-600 text-white",
  PROCESSING: "bg-blue-600 text-white",
  SHIPPED: "bg-purple-600 text-white",
  DELIVERED: "bg-success text-white",
  CANCELLED: "bg-error text-white",
};

export function OrderCard({ order, onCancel }: { order: Order; onCancel?: (id: string) => void }) {
  const canCancel = order.orderStatus === "PENDING" || order.orderStatus === "PROCESSING";

  return (
    <div className="rounded-2xl bg-surface p-5 shadow-soft">
      <Link href={`/dashboard/orders/${order._id}`} className="block">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-muted">Order #{order._id.slice(-8).toUpperCase()}</p>
            <p className="mt-1 font-medium text-foreground hover:text-primary-dark">
              {order.items.map((item) => item.name).join(", ")}
            </p>
            <p className="mt-1 text-sm text-muted">
              {new Date(order.createdAt).toLocaleDateString("en-NG", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
          <span
            className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-bold ${
              ORDER_STATUS_STYLES[order.orderStatus] ?? "bg-gray-600 text-white"
            }`}
          >
            {order.orderStatus}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <span className="text-sm text-muted">Total</span>
          <span className="font-semibold">{formatMoney(order.totalAmount, order.currency)}</span>
        </div>
      </Link>

      {canCancel && onCancel && (
        <button
          onClick={() => onCancel(order._id)}
          className="mt-3 w-full rounded-full border border-border py-2 text-sm font-medium hover:bg-black/3 dark:hover:bg-white/6"
        >
          Cancel order
        </button>
      )}
    </div>
  );
}
