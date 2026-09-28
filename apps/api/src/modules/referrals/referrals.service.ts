import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model, Types } from 'mongoose';
import { Referral, ReferralDocument } from './schemas/referral.schema.js';
import { QueryReferralsDto } from './dto/query-referrals.dto.js';
import { UsersService } from '../users/users.service.js';
import { ReferralStatus } from '../../common/enums/referral-status.enum.js';
import type { PaginatedResult } from '../../common/interfaces/paginated-result.interface.js';

// Flat reward per converted referral - simplest defensible rule absent a
// spec-defined formula. There's no wallet/credit system yet (out of MVP
// scope), so this is a ledger entry for the dashboard, not a redeemable
// balance.
const REFERRAL_REWARD_AMOUNT = 1000;

export interface ReferrerSummary {
  firstName: string;
  lastName: string;
  avatar: string | null;
  referralCode: string;
}

export interface ReferralDashboard {
  referralCode: string;
  referralUrl: string;
  totalReferrals: number;
  completedReferrals: number;
  pendingReferrals: number;
  totalRewards: number;
  referrals: PaginatedResult<ReferralDocument>;
}

@Injectable()
export class ReferralsService {
  constructor(
    @InjectModel(Referral.name) private referralModel: Model<Referral>,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  /** Called at registration when a valid referral code was supplied. */
  async createForRegistration(
    referrerId: Types.ObjectId,
    referredUserId: Types.ObjectId,
    campaignId?: Types.ObjectId | null,
  ): Promise<void> {
    await this.referralModel.create({
      referrerId,
      referredUserId,
      campaignId: campaignId ?? null,
      status: ReferralStatus.PENDING,
      reward: 0,
    });
  }

  /**
   * Called every time a participant's payment is confirmed. Idempotent and
   * safe to call unconditionally: a no-op unless this user has a still-
   * PENDING referral, which caps the reward to their first-ever conversion
   * regardless of which campaign it happened on.
   */
  async completeReferralIfApplicable(referredUserId: string): Promise<void> {
    const referral = await this.referralModel
      .findOne({ referredUserId: new Types.ObjectId(referredUserId), status: ReferralStatus.PENDING })
      .exec();
    if (!referral) return;

    referral.status = ReferralStatus.COMPLETED;
    referral.reward = REFERRAL_REWARD_AMOUNT;
    referral.rewardedAt = new Date();
    await referral.save();
  }

  async resolveReferrerByCode(code: string): Promise<ReferrerSummary> {
    const referrer = await this.usersService.findByReferralCode(code);
    if (!referrer) throw new NotFoundException('Referral code not found');

    return {
      firstName: referrer.firstName,
      lastName: referrer.lastName,
      avatar: referrer.avatar ?? null,
      referralCode: referrer.referralCode,
    };
  }

  async getDashboard(userId: string, query: QueryReferralsDto): Promise<ReferralDashboard> {
    const referrerId = new Types.ObjectId(userId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;

    const [user, items, total, completedReferrals, rewardAgg] = await Promise.all([
      this.usersService.findById(userId),
      this.referralModel
        .find({ referrerId })
        .populate('referredUserId', 'firstName lastName avatar')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.referralModel.countDocuments({ referrerId }).exec(),
      this.referralModel.countDocuments({ referrerId, status: ReferralStatus.COMPLETED }).exec(),
      this.referralModel
        .aggregate<{ _id: null; total: number }>([
          { $match: { referrerId, status: ReferralStatus.COMPLETED } },
          { $group: { _id: null, total: { $sum: '$reward' } } },
        ])
        .exec(),
    ]);

    if (!user) throw new NotFoundException('User not found');

    return {
      referralCode: user.referralCode,
      referralUrl: `${this.configService.get<string>('corsOrigin')}/join/${user.referralCode}`,
      totalReferrals: total,
      completedReferrals,
      pendingReferrals: total - completedReferrals,
      totalRewards: rewardAgg[0]?.total ?? 0,
      referrals: { items, total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    };
  }
}
