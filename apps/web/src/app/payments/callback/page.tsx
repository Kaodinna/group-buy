"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { authFetch } from "@/lib/auth-fetch";
import type { Payment } from "@/types/payment";
import { LoadingState } from "@/components/ui/LoadingState";

const POLL_INTERVAL_MS = 3000;
const MAX_ATTEMPTS = 20;

function CallbackContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference") ?? searchParams.get("trxref");
  const [payment, setPayment] = useState<Payment | null>(null);
  const [attempts, setAttempts] = useState(0);
  const stoppedRef = useRef(false);

  useEffect(() => {
    if (!reference || stoppedRef.current) return;

    const poll = () => {
      authFetch
        .get<Payment>(`/payments/${reference}`)
        .then((data) => {
          setPayment(data);
          if (data.status !== "PENDING") stoppedRef.current = true;
        })
        .catch(() => {
          // Keep retrying until MAX_ATTEMPTS - a transient error shouldn't stop polling.
        })
        .finally(() => setAttempts((a) => a + 1));
    };

    poll();
    const interval = setInterval(() => {
      if (stoppedRef.current || attempts >= MAX_ATTEMPTS) {
        clearInterval(interval);
        return;
      }
      poll();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference]);

  if (!reference) {
    return (
      <StatusCard
        title="Missing payment reference"
        description="We couldn't find a payment to check. If you completed a payment, check your dashboard."
      />
    );
  }

  if (!payment || (payment.status === "PENDING" && attempts < MAX_ATTEMPTS)) {
    return <LoadingState label="Confirming your payment…" />;
  }

  if (payment.status === "SUCCESS") {
    return (
      <StatusCard
        tone="success"
        title="Payment successful!"
        description="Your spot is confirmed. We'll notify you once the group buy succeeds."
      />
    );
  }

  if (payment.status === "PENDING") {
    return (
      <StatusCard
        title="Still confirming…"
        description="This is taking longer than expected. We'll notify you as soon as it's confirmed - no need to wait here."
      />
    );
  }

  return (
    <StatusCard
      tone="error"
      title="Payment did not go through"
      description="Your payment was not successful. You can try joining again from the campaign page."
    />
  );
}

function StatusCard({
  title,
  description,
  tone = "neutral",
}: {
  title: string;
  description: string;
  tone?: "success" | "error" | "neutral";
}) {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
      <div className="rounded-3xl bg-surface p-8 shadow-soft">
        <StatusIcon tone={tone} />
        <h1 className="mt-4 text-xl font-bold text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted">{description}</p>
        <Link
          href="/dashboard/group-buys"
          className="mt-6 inline-block rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
        >
          Go to my group buys
        </Link>
      </div>
    </div>
  );
}

function StatusIcon({ tone }: { tone: "success" | "error" | "neutral" }) {
  if (tone === "success") {
    return (
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-light">
        <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 text-success" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    );
  }
  if (tone === "error") {
    return (
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-error-light">
        <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 text-error" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </div>
    );
  }
  return (
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-warning-light">
      <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 text-warning" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a1 1 0 0 0 .86 1.5h18.64a1 1 0 0 0 .86-1.5L13.71 3.86a1 1 0 0 0-1.72 0Z" />
      </svg>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={<LoadingState label="Confirming your payment…" />}>
      <CallbackContent />
    </Suspense>
  );
}
