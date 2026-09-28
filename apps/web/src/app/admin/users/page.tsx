"use client";

import { useRef, useState } from "react";
import { useAuthedQuery } from "@/hooks/useAuthedQuery";
import { authFetch } from "@/lib/auth-fetch";
import { ApiError } from "@/lib/api-client";
import { SearchInput } from "@/components/ui/SearchInput";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import type { PublicUser } from "@/types/user";
import type { PaginatedResult } from "@/types/pagination";

const SEARCH_DEBOUNCE_MS = 400;

export default function AdminUsersPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const path = `/users?limit=50${search ? `&search=${encodeURIComponent(search)}` : ""}`;
  const { data, loading, error, refetch } = useAuthedQuery<PaginatedResult<PublicUser>>(path);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(value), SEARCH_DEBOUNCE_MS);
  };

  const toggleActive = async (user: PublicUser) => {
    setPendingId(user.id);
    setActionError(null);
    try {
      await authFetch.patch(`/users/${user.id}/status`, { isActive: !user.isActive });
      refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not update this user.");
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-2xl font-bold tracking-tight">Users</h2>
      <SearchInput value={searchInput} onChange={handleSearchChange} placeholder="Search by name or email…" />

      {actionError && <p className="text-sm text-error">{actionError}</p>}

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No users found" />
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-surface shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-black/3 text-left text-xs uppercase text-muted dark:bg-white/6">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {data.items.map((user) => (
                <tr key={user.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    {user.firstName} {user.lastName}
                  </td>
                  <td className="px-4 py-3 text-muted">{user.email}</td>
                  <td className="px-4 py-3">{user.role}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
                        user.isActive ? "bg-success text-white" : "bg-error text-white"
                      }`}
                    >
                      {user.isActive ? "Active" : "Suspended"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(user)}
                      disabled={pendingId === user.id}
                      className="rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-black/3 disabled:opacity-60 dark:hover:bg-white/6"
                    >
                      {user.isActive ? "Suspend" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
