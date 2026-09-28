"use client";

import { useState } from "react";
import { useAuthedQuery } from "@/hooks/useAuthedQuery";
import { StatCard, StatGrid } from "@/components/dashboard/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { formatMoney } from "@/lib/format";
import type { ReferralDashboard } from "@/types/referral";

export default function ReferralsPage() {
  const { data, loading, error, refetch } = useAuthedQuery<ReferralDashboard>("/referrals");
  const [copied, setCopied] = useState(false);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!data) return null;

  const handleCopy = () => {
    navigator.clipboard
      .writeText(data.referralUrl)
      .then(() => setCopied(true))
      .catch(() => setCopied(false));
    setTimeout(() => setCopied(false), 2000);
  };

  const shareText = encodeURIComponent(
    `Join me on GroupBuy and unlock lower prices by buying together: ${data.referralUrl}`,
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Referrals</h2>
        <p className="mt-1 text-sm text-muted">
          Invite friends with your link — you earn a reward once they complete their first purchase.
        </p>
      </div>

      <div className="rounded-2xl bg-surface p-5 shadow-soft">
        <p className="text-xs font-medium text-muted">Your referral link</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            readOnly
            value={data.referralUrl}
            className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm text-muted"
          />
          <button
            onClick={handleCopy}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={`https://wa.me/?text=${shareText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-black/3 dark:hover:bg-white/6"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-success" aria-hidden>
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.2h.01c5.46 0 9.9-4.45 9.9-9.91C21.96 6.45 17.5 2 12.04 2Zm5.8 14.06c-.24.68-1.4 1.3-1.94 1.38-.5.08-1.12.11-1.8-.12-.42-.13-.95-.31-1.64-.6-2.88-1.24-4.76-4.13-4.9-4.32-.14-.19-1.17-1.56-1.17-2.98 0-1.42.74-2.11 1-2.4.26-.29.57-.36.76-.36h.55c.17 0 .4-.06.63.48.24.56.8 1.98.87 2.13.07.14.11.31.02.5-.09.19-.14.31-.28.48-.14.17-.29.37-.42.5-.14.14-.28.29-.12.57.16.29.72 1.19 1.55 1.93 1.06.95 1.95 1.24 2.24 1.38.29.14.46.12.63-.07.17-.19.71-.83.9-1.11.19-.29.38-.24.63-.14.26.1 1.64.77 1.92.91.29.14.48.21.55.33.07.12.07.7-.17 1.38Z" />
            </svg>
            WhatsApp
          </a>
        </div>
      </div>

      <StatGrid>
        <StatCard label="Total referrals" value={data.totalReferrals} />
        <StatCard label="Completed" value={data.completedReferrals} />
        <StatCard label="Pending" value={data.pendingReferrals} />
        <StatCard label="Rewards earned" value={formatMoney(data.totalRewards)} />
      </StatGrid>

      <div>
        <h3 className="text-lg font-semibold">Your invites</h3>
        <div className="mt-3">
          {data.referrals.items.length === 0 ? (
            <EmptyState title="No referrals yet" description="Share your link to start earning rewards." />
          ) : (
            <div className="flex flex-col gap-2">
              {data.referrals.items.map((referral) => {
                const referred = typeof referral.referredUserId === "string" ? null : referral.referredUserId;
                return (
                  <div
                    key={referral._id}
                    className="flex items-center justify-between rounded-2xl bg-surface p-4 shadow-soft"
                  >
                    <span className="font-medium text-foreground">
                      {referred ? `${referred.firstName} ${referred.lastName}` : "A referred user"}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${
                        referral.status === "COMPLETED" ? "bg-success text-white" : "bg-gray-600 text-white"
                      }`}
                    >
                      {referral.status === "COMPLETED" ? `Earned ${formatMoney(referral.reward)}` : "Pending"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
