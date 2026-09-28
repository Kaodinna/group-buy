import Link from "next/link";
import { apiClient, ApiError } from "@/lib/api-client";

interface ReferrerSummary {
  firstName: string;
  lastName: string;
  avatar: string | null;
  referralCode: string;
}

export default async function JoinWithReferralPage({
  params,
}: PageProps<"/join/[code]">) {
  const { code } = await params;

  let referrer: ReferrerSummary | null = null;
  try {
    referrer = await apiClient.get<ReferrerSummary>(`/referrals/${encodeURIComponent(code)}`);
  } catch (err) {
    if (!(err instanceof ApiError)) throw err;
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
      {referrer ? (
        <>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-xl font-bold text-primary-dark">
            {referrer.firstName[0]}
            {referrer.lastName[0]}
          </div>
          <h1 className="mt-4 text-2xl font-bold">
            {referrer.firstName} invited you to GroupBuy!
          </h1>
          <p className="mt-2 text-sm text-muted">
            Sign up with their invite to start saving on group buys together.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-bold">Join GroupBuy</h1>
          <p className="mt-2 text-sm text-muted">
            This invite link looks invalid or has expired, but you can still create an account.
          </p>
        </>
      )}

      <Link
        href={referrer ? `/register?ref=${encodeURIComponent(code)}` : "/register"}
        className="mt-6 w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
      >
        Create your account
      </Link>
    </div>
  );
}
