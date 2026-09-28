"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useAuthedQuery } from "@/hooks/useAuthedQuery";
import { authFetch } from "@/lib/auth-fetch";
import { ApiError } from "@/lib/api-client";
import { CampaignStatusBadge } from "@/components/group-buys/CampaignStatusBadge";
import { GroupBuyProgress } from "@/components/group-buys/GroupBuyProgress";
import { StatCard, StatGrid } from "@/components/dashboard/StatCard";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatMoney } from "@/lib/format";
import type { GroupBuyCampaign } from "@/types/campaign";
import type { GroupBuyParticipant } from "@/types/participant";

const PARTICIPANT_STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-gray-600 text-white",
  PAID: "bg-success text-white",
  CONFIRMED: "bg-blue-600 text-white",
  REFUNDED: "bg-purple-600 text-white",
  CANCELLED: "bg-error text-white",
};

export default function SellerCampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const {
    data: campaign,
    loading: campaignLoading,
    error: campaignError,
    refetch: refetchCampaign,
  } = useAuthedQuery<GroupBuyCampaign>(`/group-buys/${id}`);
  const { data: participants, loading: participantsLoading } = useAuthedQuery<GroupBuyParticipant[]>(
    `/group-buys/${id}/participants`,
  );

  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const handleCancel = async () => {
    if (!confirm("Cancel this campaign? Paid participants will be eligible for a refund.")) return;
    setCancelling(true);
    setCancelError(null);
    try {
      await authFetch.post(`/group-buys/${id}/cancel`);
      refetchCampaign();
    } catch (err) {
      setCancelError(err instanceof ApiError ? err.message : "Could not cancel this campaign.");
    } finally {
      setCancelling(false);
    }
  };

  if (campaignLoading) return <LoadingState />;
  if (campaignError || !campaign) return <ErrorState message={campaignError ?? undefined} onRetry={refetchCampaign} />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/seller/campaigns" className="text-sm text-muted hover:text-foreground">
          &larr; Back to campaigns
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-bold tracking-tight">{campaign.title}</h2>
          <CampaignStatusBadge status={campaign.status} />
        </div>
      </div>

      <StatGrid>
        <StatCard label="Group price" value={formatMoney(campaign.groupPrice, campaign.currency)} />
        <StatCard label="Participants" value={`${campaign.currentParticipants} / ${campaign.maximumParticipants}`} />
        <StatCard label="Minimum needed" value={campaign.minimumParticipants} />
        <StatCard
          label="Ends"
          value={new Date(campaign.endDate).toLocaleDateString("en-NG", { month: "short", day: "numeric" })}
        />
      </StatGrid>

      <div className="max-w-sm rounded-2xl bg-surface p-5 shadow-soft">
        <GroupBuyProgress
          currentParticipants={campaign.currentParticipants}
          minimumParticipants={campaign.minimumParticipants}
          maximumParticipants={campaign.maximumParticipants}
          isActive={campaign.status === "ACTIVE"}
        />
      </div>

      {campaign.status === "ACTIVE" && (
        <div>
          {cancelError && <p className="mb-2 text-sm text-error">{cancelError}</p>}
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="rounded-full border border-error px-5 py-2.5 text-sm font-semibold text-error transition-colors hover:bg-error hover:text-white disabled:opacity-60"
          >
            {cancelling ? "Cancelling…" : "Cancel campaign"}
          </button>
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold">Participants</h3>
        <div className="mt-3">
          {participantsLoading ? (
            <LoadingState />
          ) : !participants || participants.length === 0 ? (
            <EmptyState title="No participants yet" description="Once people join, they'll show up here." />
          ) : (
            <div className="overflow-x-auto rounded-2xl bg-surface shadow-soft">
              <table className="w-full text-sm">
                <thead className="bg-black/3 text-left text-xs uppercase text-muted dark:bg-white/6">
                  <tr>
                    <th className="px-4 py-3">Participant</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((p) => {
                    const person = typeof p.userId === "string" ? null : p.userId;
                    return (
                      <tr key={p._id} className="border-t border-border">
                        <td className="px-4 py-3">
                          {person ? `${person.firstName} ${person.lastName}` : "Unknown"}
                        </td>
                        <td className="px-4 py-3">{formatMoney(p.totalAmount)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${PARTICIPANT_STATUS_STYLES[p.status]}`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {new Date(p.joinedAt).toLocaleDateString("en-NG", { month: "short", day: "numeric" })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
