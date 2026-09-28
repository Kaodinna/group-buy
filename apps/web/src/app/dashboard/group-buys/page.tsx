"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuthedQuery } from "@/hooks/useAuthedQuery";
import { ParticipationRow } from "@/components/dashboard/ParticipationRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import type { GroupBuyParticipant } from "@/types/participant";

type Tab = "ACTIVE" | "SUCCESSFUL" | "FAILED" | "CANCELLED";

const TABS: { label: string; value: Tab; statuses: string[] }[] = [
  { label: "Active", value: "ACTIVE", statuses: ["ACTIVE", "DRAFT"] },
  { label: "Successful", value: "SUCCESSFUL", statuses: ["SUCCESSFUL", "COMPLETED"] },
  { label: "Failed", value: "FAILED", statuses: ["FAILED"] },
  { label: "Cancelled", value: "CANCELLED", statuses: ["CANCELLED"] },
];

export default function MyGroupBuysPage() {
  const { data, loading, error, refetch } = useAuthedQuery<GroupBuyParticipant[]>("/participants/me");
  const [tab, setTab] = useState<Tab>("ACTIVE");

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const items = data ?? [];
  const activeTab = TABS.find((t) => t.value === tab)!;
  const filtered = items.filter((p) => {
    const campaign = typeof p.campaignId === "string" ? null : p.campaignId;
    return campaign && activeTab.statuses.includes(campaign.status);
  });

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-2xl font-bold tracking-tight">My Group Buys</h2>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t.value
                ? "bg-primary text-white"
                : "bg-surface text-muted shadow-soft hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="You haven't joined any group buys yet"
          description="Browse live deals and join one to get started."
          action={
            <Link
              href="/group-buys"
              className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
            >
              Browse group buys
            </Link>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState title={`No ${activeTab.label.toLowerCase()} group buys`} description="Nothing to show here yet." />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((p) => (
            <ParticipationRow key={p._id} participant={p} />
          ))}
        </div>
      )}
    </div>
  );
}
