"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuthStore } from "@/store/auth-store";
import { useAuthedQuery } from "@/hooks/useAuthedQuery";
import { CampaignStatusBadge } from "@/components/group-buys/CampaignStatusBadge";
import { GroupBuyProgress } from "@/components/group-buys/GroupBuyProgress";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { formatMoney } from "@/lib/format";
import type { GroupBuyCampaign } from "@/types/campaign";
import type { PaginatedResult } from "@/types/pagination";

export default function SellerCampaignsPage() {
  const user = useAuthStore((s) => s.user);
  const { data, loading, error, refetch } = useAuthedQuery<PaginatedResult<GroupBuyCampaign>>(
    `/group-buys?sellerId=${user?.id ?? ""}&limit=50`,
    !!user,
  );

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const items = data?.items ?? [];

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-2xl font-bold tracking-tight">My Campaigns</h2>
      {items.length === 0 ? (
        <EmptyState
          title="You haven't created a campaign yet"
          description="Create your first group buy to start selling."
          action={
            <Link
              href="/seller/campaigns/create"
              className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
            >
              Create campaign
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((campaign) => (
            <Link
              key={campaign._id}
              href={`/seller/campaigns/${campaign._id}`}
              className="flex items-center gap-4 rounded-2xl bg-surface p-4 shadow-soft transition-shadow hover:shadow-soft-hover"
            >
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-black/5 dark:bg-white/5">
                {campaign.image && (
                  <Image src={campaign.image} alt={campaign.title} fill className="object-cover" sizes="64px" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium text-foreground">{campaign.title}</p>
                  <CampaignStatusBadge status={campaign.status} />
                </div>
                <p className="mt-1 text-sm text-muted">{formatMoney(campaign.groupPrice, campaign.currency)}</p>
                <div className="mt-2 max-w-xs">
                  <GroupBuyProgress
                    currentParticipants={campaign.currentParticipants}
                    minimumParticipants={campaign.minimumParticipants}
                    maximumParticipants={campaign.maximumParticipants}
                    isActive={campaign.status === "ACTIVE"}
                  />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
