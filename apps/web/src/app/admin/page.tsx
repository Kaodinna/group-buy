"use client";

import { useAuthedQuery } from "@/hooks/useAuthedQuery";
import { StatCard, StatGrid } from "@/components/dashboard/StatCard";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { formatMoney } from "@/lib/format";
import type { AdminAnalytics } from "@/types/analytics";

export default function AdminOverviewPage() {
  const { data, loading, error, refetch } = useAuthedQuery<AdminAnalytics>("/analytics/admin");

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!data) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Platform Overview</h2>
        <p className="mt-1 text-sm text-muted">Marketplace-wide activity and performance.</p>
      </div>

      <StatGrid>
        <StatCard label="Total users" value={data.totalUsers} />
        <StatCard label="Total sellers" value={data.totalSellers} />
        <StatCard label="Active group buys" value={data.activeGroupBuys} />
        <StatCard label="Successful group buys" value={data.successfulGroupBuys} />
        <StatCard label="Failed group buys" value={data.failedGroupBuys} />
        <StatCard label="Total orders" value={data.totalOrders} />
        <StatCard label="Total revenue" value={formatMoney(data.totalRevenue)} />
        <StatCard label="Total refunds" value={formatMoney(data.totalRefunds)} />
        <StatCard label="Conversion rate" value={`${data.conversionRate}%`} />
        <StatCard label="Avg. group size" value={data.averageGroupSize} />
      </StatGrid>
    </div>
  );
}
