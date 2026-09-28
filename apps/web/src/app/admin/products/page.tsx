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
import type { Product, ProductStatus } from "@/types/product";
import type { PaginatedResult } from "@/types/pagination";

const TABS: { label: string; value: ProductStatus | "ALL" }[] = [
  { label: "Pending", value: "PENDING" },
  { label: "Active", value: "ACTIVE" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Archived", value: "ARCHIVED" },
  { label: "All", value: "ALL" },
];

const STATUS_STYLES: Record<ProductStatus, string> = {
  PENDING: "bg-warning text-white",
  ACTIVE: "bg-success text-white",
  REJECTED: "bg-error text-white",
  ARCHIVED: "bg-gray-600 text-white",
};

export default function AdminProductsPage() {
  const [tab, setTab] = useState<ProductStatus | "ALL">("PENDING");
  const [page, setPage] = useState(1);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const statusQuery = tab === "ALL" ? "" : `&status=${tab}`;
  const { data, loading, error, refetch } = useAuthedQuery<PaginatedResult<Product>>(
    `/products?page=${page}&limit=20${statusQuery}`,
  );

  const handleTabChange = (value: ProductStatus | "ALL") => {
    setTab(value);
    setPage(1);
  };

  const setStatus = async (id: string, status: ProductStatus) => {
    setPendingId(id);
    setActionError(null);
    try {
      await authFetch.patch(`/products/${id}`, { status });
      refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not update this product.");
    } finally {
      setPendingId(null);
    }
  };

  const items = data?.items ?? [];

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-2xl font-bold tracking-tight">Products</h2>

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
        <EmptyState title="No products here" description="Nothing matches this filter right now." />
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-surface shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-black/3 text-left text-xs uppercase text-muted dark:bg-white/6">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Seller</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((product) => {
                const seller = typeof product.sellerId === "string" ? null : product.sellerId;
                const isPending = pendingId === product._id;
                return (
                  <tr key={product._id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{product.name}</td>
                    <td className="px-4 py-3 text-muted">
                      {seller ? `${seller.firstName} ${seller.lastName}` : "Unknown"}
                    </td>
                    <td className="px-4 py-3">{formatMoney(product.originalPrice, product.currency)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_STYLES[product.status]}`}
                      >
                        {product.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {product.status !== "ACTIVE" && (
                          <button
                            onClick={() => setStatus(product._id, "ACTIVE")}
                            disabled={isPending}
                            className="rounded-full border border-primary px-3 py-1.5 text-xs font-medium text-primary-dark hover:bg-primary hover:text-white disabled:opacity-60"
                          >
                            Approve
                          </button>
                        )}
                        {product.status !== "REJECTED" && (
                          <button
                            onClick={() => setStatus(product._id, "REJECTED")}
                            disabled={isPending}
                            className="rounded-full border border-error px-3 py-1.5 text-xs font-medium text-error hover:bg-error hover:text-white disabled:opacity-60"
                          >
                            Reject
                          </button>
                        )}
                      </div>
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
