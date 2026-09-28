"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiClient, ApiError } from "@/lib/api-client";
import type { GroupBuyCampaign } from "@/types/campaign";
import type { Category } from "@/types/product";
import type { PaginatedResult } from "@/types/pagination";
import { GroupBuyCard } from "@/components/group-buys/GroupBuyCard";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { CardSkeletonGrid } from "@/components/ui/LoadingState";

type SortOption = "newest" | "ending_soon" | "most_joined" | "price_asc" | "price_desc";

const SEARCH_DEBOUNCE_MS = 400;
const SORT_LABELS: Record<SortOption, string> = {
  newest: "Newest",
  ending_soon: "Ending soon",
  most_joined: "Most popular",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
};

function isSortOption(value: string | null): value is SortOption {
  return !!value && value in SORT_LABELS;
}

function GroupBuysPageContent() {
  const searchParams = useSearchParams();
  const initialCategoryId = searchParams.get("categoryId") ?? "";
  const initialSort = searchParams.get("sort");
  const initialSearch = searchParams.get("search") ?? "";

  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [sort, setSort] = useState<SortOption>(isSortOption(initialSort) ? initialSort : "newest");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  const [categories, setCategories] = useState<Category[]>([]);
  const [result, setResult] = useState<PaginatedResult<GroupBuyCampaign> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    apiClient
      .get<Category[]>("/categories")
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  // Every state transition that should show a loading spinner originates
  // here, in event handlers - never as a synchronous setState inside the
  // fetch effect below, which only ever sets state from promise callbacks.
  useEffect(() => {
    let cancelled = false;

    const params = new URLSearchParams({ page: String(page), limit: "12", sort });
    if (search) params.set("search", search);
    if (categoryId) params.set("categoryId", categoryId);

    apiClient
      .get<PaginatedResult<GroupBuyCampaign>>(`/group-buys?${params.toString()}`)
      .then((data) => {
        if (cancelled) return;
        setResult(data);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Failed to load group buys");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [search, categoryId, sort, page, reloadKey]);

  const handleSearchInputChange = (value: string) => {
    setSearchInput(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setLoading(true);
      setPage(1);
      setSearch(value);
    }, SEARCH_DEBOUNCE_MS);
  };

  const handleCategoryChange = (value: string) => {
    setLoading(true);
    setPage(1);
    setCategoryId(value);
  };

  const handleSortChange = (value: SortOption) => {
    setLoading(true);
    setPage(1);
    setSort(value);
  };

  const handlePageChange = (nextPage: number) => {
    setLoading(true);
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRetry = () => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  const activeCategory = categories.find((c) => c._id === categoryId);

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
      <div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Browse Group Buys</h1>
        <p className="mt-2 text-base text-muted">
          {activeCategory ? `Live deals in ${activeCategory.name}.` : "Join a deal with other shoppers to unlock the group price."}
        </p>
      </div>

      <div className="sticky top-16 z-10 -mx-4 mt-6 bg-background/95 px-4 py-3 backdrop-blur-sm sm:mx-0 sm:rounded-2xl sm:border sm:border-border sm:bg-surface/80 sm:px-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <SearchInput value={searchInput} onChange={handleSearchInputChange} placeholder="Search group buys…" />
          <select
            value={categoryId}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="rounded-full border border-border bg-surface px-4 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => handleSortChange(e.target.value as SortOption)}
            className="rounded-full border border-border bg-surface px-4 py-2 text-sm outline-none focus:border-primary"
          >
            {(Object.keys(SORT_LABELS) as SortOption[]).map((option) => (
              <option key={option} value={option}>
                {SORT_LABELS[option]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-8">
        {loading ? (
          <CardSkeletonGrid />
        ) : error ? (
          <ErrorState message={error} onRetry={handleRetry} />
        ) : !result || result.items.length === 0 ? (
          <EmptyState
            title="No group buys found"
            description="Try a different search term or check back soon for new deals."
          />
        ) : (
          <>
            <p className="mb-4 text-sm text-muted">{result.total} live group buys</p>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {result.items.map((campaign) => (
                <GroupBuyCard key={campaign._id} campaign={campaign} />
              ))}
            </div>
            <Pagination page={result.page} totalPages={result.totalPages} onPageChange={handlePageChange} />
          </>
        )}
      </div>
    </div>
  );
}

export default function GroupBuysPage() {
  return (
    <Suspense>
      <GroupBuysPageContent />
    </Suspense>
  );
}
