"use client";

import Link from "next/link";
import { useAuthedQuery } from "@/hooks/useAuthedQuery";
import { StatCard, StatGrid } from "@/components/dashboard/StatCard";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { formatMoney } from "@/lib/format";
import type { SellerAnalytics } from "@/types/analytics";

export default function SellerOverviewPage() {
  const { data, loading, error, refetch } = useAuthedQuery<SellerAnalytics>("/analytics/seller");

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!data) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Overview</h2>
          <p className="mt-1 text-sm text-muted">Performance across all of your group buy campaigns.</p>
        </div>
        <Link
          href="/seller/campaigns/create"
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
        >
          Create campaign
        </Link>
      </div>

      <StatGrid>
        <StatCard label="Total revenue" value={formatMoney(data.totalRevenue)} />
        <StatCard label="Active campaigns" value={data.activeCampaigns} />
        <StatCard label="Successful campaigns" value={data.successfulCampaigns} />
        <StatCard label="Failed campaigns" value={data.failedCampaigns} />
        <StatCard label="Total participants" value={data.totalParticipants} />
        <StatCard label="Avg. participants / campaign" value={data.averageParticipantsPerCampaign} />
        <StatCard label="Total orders" value={data.totalOrders} />
      </StatGrid>
    </div>
  );
}
