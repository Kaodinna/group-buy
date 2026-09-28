"use client";

import type { GroupBuyCampaign } from "@/types/campaign";
import { formatMoney } from "@/lib/format";

// A persistent mobile CTA so "join" is always one tap away without hunting
// for the button after scrolling through description/specs/FAQs. It scrolls
// to the real JoinGroupBuyButton instead of duplicating its auth/shipping/
// payment logic, which stays the single source of truth for joining.
export function MobileJoinBar({ campaign }: { campaign: GroupBuyCampaign }) {
  const isOpen =
    (campaign.status === "ACTIVE" || campaign.status === "SUCCESSFUL") &&
    campaign.currentParticipants < campaign.maximumParticipants;

  if (!isOpen) return null;

  const handleClick = () => {
    document.getElementById("join-panel")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 p-3 backdrop-blur-sm sm:hidden">
      <button
        onClick={handleClick}
        className="flex w-full items-center justify-between rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
      >
        <span>Join Group Buy</span>
        <span>{formatMoney(campaign.groupPrice, campaign.currency)}</span>
      </button>
    </div>
  );
}
