"use client";

import { useState } from "react";
import { useAuthedQuery } from "@/hooks/useAuthedQuery";
import { authFetch } from "@/lib/auth-fetch";
import { ApiError } from "@/lib/api-client";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Pagination } from "@/components/ui/Pagination";
import { formatMoney } from "@/lib/format";
import type { Payment, PaymentStatus } from "@/types/payment";
import type { PaginatedResult } from "@/types/pagination";

const TABS: { label: string; value: PaymentStatus | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Success", value: "SUCCESS" },
  { label: "Failed", value: "FAILED" },
  { label: "Refunded", value: "REFUNDED" },
];

const STATUS_STYLES: Record<PaymentStatus, string> = {
  PENDING: "bg-gray-600 text-white",
  SUCCESS: "bg-success text-white",
  FAILED: "bg-error text-white",
  REFUNDED: "bg-purple-600 text-white",
};

export default function AdminPaymentsPage() {
  const [tab, setTab] = useState<PaymentStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const statusQuery = tab === "ALL" ? "" : `&status=${tab}`;
  const { data, loading, error, refetch } = useAuthedQuery<PaginatedResult<Payment>>(
    `/payments?page=${page}&limit=20${statusQuery}`,
  );

  const handleTabChange = (value: PaymentStatus | "ALL") => {
    setTab(value);
    setPage(1);
  };

  const handleRefund = async (id: string) => {
    if (!confirm("Refund this payment? This will contact the payment provider immediately.")) return;
    setPendingId(id);
    setActionError(null);
    try {
      await authFetch.post(`/payments/${id}/refund`);
      refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not process this refund.");
    } finally {
      setPendingId(null);
    }
  };

  const items = data?.items ?? [];

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-2xl font-bold tracking-tight">Payments</h2>

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

      {actionError && <p className="text-sm text-error">{actionError}</p>}

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyState title="No payments here" description="Nothing matches this filter right now." />
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-surface shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-black/3 text-left text-xs uppercase text-muted dark:bg-white/6">
              <tr>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((payment) => (
                <tr key={payment._id} className="border-t border-border">
                  <td className="px-4 py-3 font-mono text-xs">{payment.reference}</td>
                  <td className="px-4 py-3 text-muted">{payment.provider}</td>
                  <td className="px-4 py-3">{formatMoney(payment.amount, payment.currency)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_STYLES[payment.status]}`}
                    >
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {payment.status === "SUCCESS" && (
                      <button
                        onClick={() => handleRefund(payment._id)}
                        disabled={pendingId === payment._id}
                        className="rounded-full border border-error px-3 py-1.5 text-xs font-medium text-error hover:bg-error hover:text-white disabled:opacity-60"
                      >
                        {pendingId === payment._id ? "Refunding…" : "Refund"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />}
    </div>
  );
}
