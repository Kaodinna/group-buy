"use client";

import Link from "next/link";
import { useAuthedQuery } from "@/hooks/useAuthedQuery";
import { useAuthStore } from "@/store/auth-store";
import { StatCard, StatGrid } from "@/components/dashboard/StatCard";
import { ParticipationRow } from "@/components/dashboard/ParticipationRow";
import { GroupBuyCard } from "@/components/group-buys/GroupBuyCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { formatMoney } from "@/lib/format";
import type { GroupBuyParticipant } from "@/types/participant";
import type { GroupBuyCampaign } from "@/types/campaign";
import type { PaginatedResult } from "@/types/pagination";

const PAID_STATUSES = new Set(["PAID", "CONFIRMED"]);

export default function CustomerDashboardPage() {
  const user = useAuthStore((state) => state.user);
  const { data: participations, loading, error, refetch } = useAuthedQuery<GroupBuyParticipant[]>(
    "/participants/me",
  );
  const { data: recommended } = useAuthedQuery<PaginatedResult<GroupBuyCampaign>>(
    "/group-buys?sort=most_joined&limit=3",
  );

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const items = participations ?? [];
  let activeCount = 0;
  let successfulCount = 0;
  let failedCount = 0;
  let totalSavings = 0;

  for (const p of items) {
    const campaign = typeof p.campaignId === "string" ? null : p.campaignId;
    if (!campaign) continue;

    if (campaign.status === "ACTIVE") activeCount += 1;
    else if (campaign.status === "SUCCESSFUL" || campaign.status === "COMPLETED") successfulCount += 1;
    else if (campaign.status === "FAILED" || campaign.status === "CANCELLED") failedCount += 1;

    if (PAID_STATUSES.has(p.status)) {
      totalSavings += (campaign.originalPrice - campaign.groupPrice) * p.quantity;
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Welcome back{user ? `, ${user.firstName}` : ""}</h2>
        <p className="mt-1 text-sm text-muted">A snapshot of your group buy activity.</p>
      </div>

      <StatGrid>
        <StatCard label="Active" value={activeCount} />
        <StatCard label="Successful" value={successfulCount} />
        <StatCard label="Failed / Cancelled" value={failedCount} />
        <StatCard label="Total saved" value={formatMoney(totalSavings)} />
      </StatGrid>

      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Recent group buys</h3>
          <Link href="/dashboard/group-buys" className="text-sm font-medium text-primary-dark hover:underline">
            View all
          </Link>
        </div>
        <div className="mt-3 flex flex-col gap-2">
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
          ) : (
            items.slice(0, 5).map((p) => <ParticipationRow key={p._id} participant={p} />)
          )}
        </div>
      </div>

      {recommended && recommended.items.length > 0 && (
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Recommended for you</h3>
            <Link href="/group-buys" className="text-sm font-medium text-primary-dark hover:underline">
              Browse all
            </Link>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recommended.items.map((campaign) => (
              <GroupBuyCard key={campaign._id} campaign={campaign} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
