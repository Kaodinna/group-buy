export type ReferralStatus = "PENDING" | "COMPLETED";

export interface Referral {
  _id: string;
  referrerId: string;
  referredUserId: string | { _id: string; firstName: string; lastName: string; avatar: string | null };
  campaignId: string | null;
  status: ReferralStatus;
  reward: number;
  rewardedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReferralDashboard {
  referralCode: string;
  referralUrl: string;
  totalReferrals: number;
  completedReferrals: number;
  pendingReferrals: number;
  totalRewards: number;
  referrals: {
    items: Referral[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
