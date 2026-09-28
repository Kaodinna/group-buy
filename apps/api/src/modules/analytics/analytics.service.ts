import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '../users/schemas/user.schema.js';
import { GroupBuyCampaign } from '../group-buys/schemas/campaign.schema.js';
import { Order } from '../orders/schemas/order.schema.js';
import { Payment } from '../payments/schemas/payment.schema.js';
import { Role } from '../../common/enums/role.enum.js';
import { CampaignStatus } from '../../common/enums/campaign-status.enum.js';
import { OrderPaymentStatus } from '../../common/enums/order-payment-status.enum.js';
import { PaymentStatus } from '../../common/enums/payment-status.enum.js';

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

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(GroupBuyCampaign.name) private campaignModel: Model<GroupBuyCampaign>,
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(Payment.name) private paymentModel: Model<Payment>,
  ) {}

  async getSellerAnalytics(sellerId: string): Promise<SellerAnalytics> {
    const sellerObjectId = new Types.ObjectId(sellerId);

    const [
      activeCampaigns,
      successfulCampaigns,
      failedCampaigns,
      totalOrders,
      revenueAgg,
      participantsAgg,
      campaignCount,
    ] = await Promise.all([
      this.campaignModel.countDocuments({ sellerId: sellerObjectId, status: CampaignStatus.ACTIVE }),
      this.campaignModel.countDocuments({ sellerId: sellerObjectId, status: CampaignStatus.SUCCESSFUL }),
      this.campaignModel.countDocuments({ sellerId: sellerObjectId, status: CampaignStatus.FAILED }),
      this.orderModel.countDocuments({ sellerId: sellerObjectId }),
      this.orderModel.aggregate<{ _id: null; total: number }>([
        { $match: { sellerId: sellerObjectId, paymentStatus: OrderPaymentStatus.PAID } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      this.campaignModel.aggregate<{ _id: null; total: number }>([
        { $match: { sellerId: sellerObjectId } },
        { $group: { _id: null, total: { $sum: '$currentParticipants' } } },
      ]),
      this.campaignModel.countDocuments({ sellerId: sellerObjectId }),
    ]);

    const totalParticipants = participantsAgg[0]?.total ?? 0;

    return {
      totalRevenue: revenueAgg[0]?.total ?? 0,
      activeCampaigns,
      successfulCampaigns,
      failedCampaigns,
      totalParticipants,
      averageParticipantsPerCampaign: campaignCount > 0 ? Math.round(totalParticipants / campaignCount) : 0,
      totalOrders,
    };
  }

  async getAdminAnalytics(): Promise<AdminAnalytics> {
    const [
      totalUsers,
      totalSellers,
      activeGroupBuys,
      successfulGroupBuys,
      failedGroupBuys,
      totalOrders,
      revenueAgg,
      refundsAgg,
      groupSizeAgg,
    ] = await Promise.all([
      this.userModel.countDocuments({}),
      this.userModel.countDocuments({ role: Role.SELLER }),
      this.campaignModel.countDocuments({ status: CampaignStatus.ACTIVE }),
      this.campaignModel.countDocuments({ status: CampaignStatus.SUCCESSFUL }),
      this.campaignModel.countDocuments({ status: CampaignStatus.FAILED }),
      this.orderModel.countDocuments({}),
      this.paymentModel.aggregate<{ _id: null; total: number }>([
        { $match: { status: PaymentStatus.SUCCESS } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      this.paymentModel.aggregate<{ _id: null; total: number; count: number }>([
        { $match: { status: PaymentStatus.REFUNDED } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      this.campaignModel.aggregate<{ _id: null; avg: number }>([
        { $match: { status: { $in: [CampaignStatus.SUCCESSFUL, CampaignStatus.COMPLETED] } } },
        { $group: { _id: null, avg: { $avg: '$currentParticipants' } } },
      ]),
    ]);

    const settledCampaigns = successfulGroupBuys + failedGroupBuys;

    return {
      totalUsers,
      totalSellers,
      activeGroupBuys,
      successfulGroupBuys,
      failedGroupBuys,
      totalOrders,
      totalRevenue: revenueAgg[0]?.total ?? 0,
      totalRefunds: refundsAgg[0]?.total ?? 0,
      conversionRate: settledCampaigns > 0 ? Math.round((successfulGroupBuys / settledCampaigns) * 100) : 0,
      averageGroupSize: groupSizeAgg[0]?.avg ? Math.round(groupSizeAgg[0].avg * 10) / 10 : 0,
    };
  }
}
