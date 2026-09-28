import Link from "next/link";
import Image from "next/image";
import type { GroupBuyCampaign } from "@/types/campaign";
import { PriceDisplay } from "@/components/group-buys/PriceDisplay";
import { DiscountBadge } from "@/components/group-buys/DiscountBadge";
import { GroupBuyProgress } from "@/components/group-buys/GroupBuyProgress";
import { CountdownTimer } from "@/components/group-buys/CountdownTimer";

export function GroupBuyCard({ campaign }: { campaign: GroupBuyCampaign }) {
  const isAlmostFull =
    campaign.currentParticipants < campaign.minimumParticipants &&
    campaign.currentParticipants / campaign.minimumParticipants >= 0.8;

  return (
    <Link
      href={`/group-buys/${campaign.slug}`}
      className="group flex flex-col overflow-hidden rounded-3xl bg-surface shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft-hover"
    >
      <div className="relative aspect-4/3 overflow-hidden bg-black/5 dark:bg-white/5">
        {campaign.image ? (
          <Image
            src={campaign.image}
            alt={campaign.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted">No image</div>
        )}
        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          <DiscountBadge originalPrice={campaign.originalPrice} groupPrice={campaign.groupPrice} />
          {isAlmostFull && (
            <span className="inline-flex items-center rounded-full bg-warning px-2.5 py-1 text-xs font-bold text-white">
              Almost full
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="line-clamp-2 font-semibold text-foreground">{campaign.title}</h3>
        <PriceDisplay
          originalPrice={campaign.originalPrice}
          groupPrice={campaign.groupPrice}
          currency={campaign.currency}
          size="sm"
        />
        <GroupBuyProgress
          currentParticipants={campaign.currentParticipants}
          minimumParticipants={campaign.minimumParticipants}
          maximumParticipants={campaign.maximumParticipants}
        />
        <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
          <span className="text-xs text-muted">Ends in</span>
          <CountdownTimer endDate={campaign.endDate} compact />
        </div>
      </div>
    </Link>
  );
}
