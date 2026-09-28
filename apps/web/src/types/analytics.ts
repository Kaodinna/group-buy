export interface SellerAnalytics {
  totalRevenue: number;
  activeCampaigns: number;
  successfulCampaigns: number;
  failedCampaigns: number;
  totalParticipants: number;
  averageParticipantsPerCampaign: number;
  totalOrders: number;
}

export interface AdminAnalytics {
  totalUsers: number;
  totalSellers: number;
  activeGroupBuys: number;
  successfulGroupBuys: number;
  failedGroupBuys: number;
  totalOrders: number;
  totalRevenue: number;
  totalRefunds: number;
  conversionRate: number;
  averageGroupSize: number;
}
