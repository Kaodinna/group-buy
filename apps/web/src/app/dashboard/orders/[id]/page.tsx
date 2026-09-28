"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useAuthedQuery } from "@/hooks/useAuthedQuery";
import { authFetch } from "@/lib/auth-fetch";
import { ApiError } from "@/lib/api-client";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { formatMoney } from "@/lib/format";
import type { Order, OrderStatus } from "@/types/order";

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: "PENDING", label: "Order placed" },
  { status: "PROCESSING", label: "Processing" },
  { status: "SHIPPED", label: "Shipped" },
  { status: "DELIVERED", label: "Delivered" },
];

function stepIndex(status: OrderStatus): number {
  return STEPS.findIndex((s) => s.status === status);
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: order, loading, error, refetch } = useAuthedQuery<Order>(`/orders/${id}`);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const handleCancel = async () => {
    if (!confirm("Cancel this order?")) return;
    setCancelling(true);
    setCancelError(null);
    try {
      await authFetch.post(`/orders/${id}/cancel`);
      refetch();
    } catch (err) {
      setCancelError(err instanceof ApiError ? err.message : "Could not cancel this order.");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error || !order) return <ErrorState message={error ?? undefined} onRetry={refetch} />;

  const canCancel = order.orderStatus === "PENDING" || order.orderStatus === "PROCESSING";
  const currentStep = stepIndex(order.orderStatus);
  const paymentConfirmed = order.paymentStatus === "PAID" || order.paymentStatus === "REFUNDED";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/dashboard/orders" className="text-sm text-muted hover:text-foreground">
          &larr; Back to orders
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Order #{order._id.slice(-8).toUpperCase()}</h1>
        <p className="mt-1 text-sm text-muted">
          Placed{" "}
          {new Date(order.createdAt).toLocaleDateString("en-NG", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      <div className="rounded-3xl bg-surface p-6 shadow-soft">
        {order.orderStatus === "CANCELLED" ? (
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-error-light">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-error" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </span>
            <div>
              <p className="font-semibold text-foreground">This order was cancelled</p>
              <p className="text-sm text-muted">
                {order.paymentStatus === "REFUNDED" ? "Your payment has been refunded." : "No further action is needed."}
              </p>
            </div>
          </div>
        ) : (
          <ol className="flex flex-col gap-0 sm:flex-row sm:items-start">
            {STEPS.map((step, index) => {
              const done = paymentConfirmed && index <= currentStep;
              const isLast = index === STEPS.length - 1;
              return (
                <li key={step.status} className="flex flex-1 items-start gap-3 sm:flex-col sm:items-center sm:gap-2">
                  <div className="flex items-center sm:w-full">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        done ? "bg-primary text-white" : "bg-black/5 text-muted dark:bg-white/10"
                      }`}
                    >
                      {done ? (
                        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        index + 1
                      )}
                    </span>
                    {!isLast && (
                      <span
                        className={`ml-2 hidden h-0.5 flex-1 sm:block ${done && index < currentStep ? "bg-primary" : "bg-black/5 dark:bg-white/10"}`}
                      />
                    )}
                  </div>
                  <span className={`text-xs font-medium sm:text-center ${done ? "text-foreground" : "text-muted"}`}>
                    {step.label}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <div className="rounded-3xl bg-surface p-6 shadow-soft">
            <h2 className="text-lg font-semibold">Items</h2>
            <div className="mt-4 flex flex-col divide-y divide-border">
              {order.items.map((item) => (
                <div key={item.productId} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-muted">Qty {item.quantity}</p>
                  </div>
                  <span className="font-medium text-foreground">{formatMoney(item.totalPrice, order.currency)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-col gap-1.5 border-t border-border pt-4 text-sm">
              <div className="flex justify-between text-muted">
                <span>Subtotal</span>
                <span>{formatMoney(order.subtotal, order.currency)}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Group discount</span>
                <span>-{formatMoney(order.discount, order.currency)}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Shipping</span>
                <span>{order.shippingFee > 0 ? formatMoney(order.shippingFee, order.currency) : "Free"}</span>
              </div>
              <div className="mt-1 flex justify-between border-t border-border pt-2 text-base font-bold text-foreground">
                <span>Total</span>
                <span>{formatMoney(order.totalAmount, order.currency)}</span>
              </div>
            </div>
          </div>

          {order.shippingAddress && (
            <div className="rounded-3xl bg-surface p-6 shadow-soft">
              <h2 className="text-lg font-semibold">Shipping address</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {order.shippingAddress.street}
                <br />
                {order.shippingAddress.city}, {order.shippingAddress.state}
                <br />
                {order.shippingAddress.country}
                <br />
                {order.shippingAddress.phone}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-3xl bg-surface p-6 shadow-soft">
            <h2 className="text-lg font-semibold">Payment</h2>
            <dl className="mt-3 flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Status</dt>
                <dd className="font-medium text-foreground">{order.paymentStatus}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Order status</dt>
                <dd className="font-medium text-foreground">{order.orderStatus}</dd>
              </div>
            </dl>
          </div>

          {canCancel && (
            <div className="rounded-3xl bg-surface p-6 shadow-soft">
              {cancelError && <p className="mb-3 text-sm text-error">{cancelError}</p>}
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="w-full rounded-full border border-error px-5 py-2.5 text-sm font-semibold text-error transition-colors hover:bg-error hover:text-white disabled:opacity-60"
              >
                {cancelling ? "Cancelling…" : "Cancel order"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
