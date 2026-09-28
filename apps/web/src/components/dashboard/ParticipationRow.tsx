import Link from "next/link";
import Image from "next/image";
import type { GroupBuyParticipant } from "@/types/participant";
import { CampaignStatusBadge } from "@/components/group-buys/CampaignStatusBadge";
import { formatMoney } from "@/lib/format";
import type { CampaignStatus } from "@/types/campaign";

const PARTICIPANT_STATUS_LABEL: Record<string, string> = {
  PENDING: "Awaiting payment",
  PAID: "Paid",
  CONFIRMED: "Confirmed",
  REFUNDED: "Refunded",
  CANCELLED: "Cancelled",
};

export function ParticipationRow({ participant }: { participant: GroupBuyParticipant }) {
  const campaign = typeof participant.campaignId === "string" ? null : participant.campaignId;

  if (!campaign) return null;

  return (
    <Link
      href={`/group-buys/${campaign.slug}`}
      className="flex items-center gap-4 rounded-2xl bg-surface p-3 shadow-soft transition-shadow hover:shadow-soft-hover"
    >
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-black/5 dark:bg-white/5">
        {campaign.image && <Image src={campaign.image} alt={campaign.title} fill className="object-cover" sizes="64px" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">{campaign.title}</p>
        <p className="text-sm text-muted">
          {formatMoney(participant.totalAmount)} · {PARTICIPANT_STATUS_LABEL[participant.status]}
        </p>
      </div>
      <CampaignStatusBadge status={campaign.status as CampaignStatus} />
    </Link>
  );
}
