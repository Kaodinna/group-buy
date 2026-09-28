"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";
import { authFetch } from "@/lib/auth-fetch";
import { ApiError } from "@/lib/api-client";
import { formatMoney } from "@/lib/format";
import type { GroupBuyCampaign } from "@/types/campaign";
import type { GroupBuyParticipant, ShippingAddress } from "@/types/participant";
import type { InitializePaymentResult } from "@/types/payment";

const EMPTY_ADDRESS: ShippingAddress = { street: "", city: "", state: "", country: "Nigeria", phone: "" };

export function JoinGroupBuyButton({ campaign }: { campaign: GroupBuyCampaign }) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);

  const [showForm, setShowForm] = useState(false);
  const [includeAddress, setIncludeAddress] = useState(false);
  const [address, setAddress] = useState<ShippingAddress>(EMPTY_ADDRESS);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A coarse, render-pure heuristic (status + slots only, no Date.now() here)
  // - it only decides whether to *show* the button. The backend is always
  // the authoritative check (Rule 4/5): a join right at the expiry instant
  // is rejected there with a clear error, which the form below surfaces.
  const isOpen =
    (campaign.status === "ACTIVE" || campaign.status === "SUCCESSFUL") &&
    campaign.currentParticipants < campaign.maximumParticipants;

  if (!user) {
    return (
      <Link
        href={`/login?redirect=${encodeURIComponent(pathname)}`}
        className="flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
      >
        Log in to join
      </Link>
    );
  }

  if (user.id === campaign.sellerId) {
    return (
      <p className="rounded-full border border-border px-6 py-3 text-center text-sm text-muted">
        This is your campaign
      </p>
    );
  }

  if (!isOpen) {
    return (
      <button
        disabled
        className="w-full rounded-full bg-black/10 px-6 py-3 text-sm font-semibold text-muted dark:bg-white/10"
      >
        {campaign.currentParticipants >= campaign.maximumParticipants ? "Campaign full" : "Not open for joining"}
      </button>
    );
  }

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const participant = await authFetch.post<GroupBuyParticipant>(`/group-buys/${campaign._id}/join`, {
        shippingAddress: includeAddress ? address : undefined,
      });

      const payment = await authFetch.post<InitializePaymentResult>("/payments/initialize", {
        participantId: participant._id,
        provider: "PAYSTACK",
      });

      window.location.href = payment.authorizationUrl;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Something went wrong. Please try again.";
      setError(message);
      setSubmitting(false);
    }
  };

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
      >
        Join Group Buy
      </button>
    );
  }

  return (
    <div className="rounded-3xl bg-surface p-5 shadow-soft">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <span className="text-sm text-muted">You&apos;re joining at</span>
        <span className="text-lg font-bold text-foreground">
          {formatMoney(campaign.groupPrice, campaign.currency)}
        </span>
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm font-medium text-foreground">
        <input
          type="checkbox"
          checked={includeAddress}
          onChange={(e) => setIncludeAddress(e.target.checked)}
          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
        />
        Add a shipping address now
      </label>

      {includeAddress && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <input
            placeholder="Street"
            value={address.street}
            onChange={(e) => setAddress({ ...address, street: e.target.value })}
            className="col-span-2 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            placeholder="City"
            value={address.city}
            onChange={(e) => setAddress({ ...address, city: e.target.value })}
            className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            placeholder="State"
            value={address.state}
            onChange={(e) => setAddress({ ...address, state: e.target.value })}
            className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            placeholder="Country"
            value={address.country}
            onChange={(e) => setAddress({ ...address, country: e.target.value })}
            className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            placeholder="Phone"
            value={address.phone}
            onChange={(e) => setAddress({ ...address, phone: e.target.value })}
            className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
      )}

      {error && <p className="mt-3 text-sm text-error">{error}</p>}

      <button
        onClick={submit}
        disabled={
          submitting ||
          (includeAddress && Object.values(address).some((v) => v.trim().length === 0))
        }
        className="mt-4 w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Redirecting to payment…" : `Pay ${formatMoney(campaign.groupPrice, campaign.currency)}`}
      </button>
      <p className="mt-2 flex items-center justify-center gap-1 text-xs text-muted">
        <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2Zm10-10V7a4 4 0 1 0-8 0v2" />
        </svg>
        Secure checkout — your price is locked in the moment you pay
      </p>
    </div>
  );
}
