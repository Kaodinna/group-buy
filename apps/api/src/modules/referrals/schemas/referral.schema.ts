import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ReferralStatus } from '../../../common/enums/referral-status.enum.js';

export type ReferralDocument = HydratedDocument<Referral>;

@Schema({ timestamps: true })
export class Referral {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  referrerId!: Types.ObjectId;

  // A user can only ever be referred once - set at registration and immutable.
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true, index: true })
  referredUserId!: Types.ObjectId;

  // Set when the invite link pointed at a specific campaign rather than a
  // bare platform-level referral code.
  @Prop({ type: Types.ObjectId, ref: 'GroupBuyCampaign', default: null })
  campaignId?: Types.ObjectId | null;

  @Prop({ type: String, enum: ReferralStatus, default: ReferralStatus.PENDING, index: true })
  status!: ReferralStatus;

  // Populated once the referred user's first successful group-buy payment
  // completes the referral (Rule 4/5: never granted on registration alone).
  @Prop({ default: 0, min: 0 })
  reward!: number;

  @Prop({ type: Date, default: null })
  rewardedAt?: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ReferralSchema = SchemaFactory.createForClass(Referral);
