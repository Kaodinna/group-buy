import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { CampaignStatus } from '../../../common/enums/campaign-status.enum.js';

export type CampaignDocument = HydratedDocument<GroupBuyCampaign>;

@Schema({ timestamps: true })
export class GroupBuyCampaign {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true, index: true })
  productId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  sellerId!: Types.ObjectId;

  // Denormalized from the product at creation time so listing queries can
  // filter by category without a $lookup on every request.
  @Prop({ type: Types.ObjectId, ref: 'Category', required: true, index: true })
  categoryId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ required: true, unique: true, index: true, trim: true })
  slug!: string;

  @Prop({ required: true })
  description!: string;

  // Snapshotted from the product at creation time - never re-read from the
  // product afterwards, so a later price change on the product can't alter
  // an in-flight campaign's economics.
  @Prop({ required: true, min: 1 })
  originalPrice!: number;

  @Prop({ required: true, min: 1 })
  groupPrice!: number;

  @Prop({ default: 'NGN' })
  currency!: string;

  @Prop({ required: true, min: 2 })
  minimumParticipants!: number;

  @Prop({ required: true, min: 2 })
  maximumParticipants!: number;

  // Count of active (non-cancelled/non-refunded) reservations. This gates
  // capacity atomically at join time - it is NOT the source of truth for
  // "did the campaign succeed", which is derived from PAID participant
  // records instead (see ParticipantsService.countPaid). Rule 9.
  @Prop({ default: 0, min: 0 })
  currentParticipants!: number;

  @Prop({ required: true })
  startDate!: Date;

  @Prop({ required: true })
  endDate!: Date;

  @Prop({ type: String, enum: CampaignStatus, default: CampaignStatus.DRAFT, index: true })
  status!: CampaignStatus;

  // Absolute cutoff for participants to complete payment. Defaults to
  // endDate when not explicitly set by the seller.
  @Prop({ type: Date, default: null })
  paymentDeadline?: Date | null;

  @Prop({ type: String, default: null })
  image?: string | null;

  @Prop({ type: String, default: null })
  shippingInfo?: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const GroupBuyCampaignSchema = SchemaFactory.createForClass(GroupBuyCampaign);

GroupBuyCampaignSchema.index({ status: 1, endDate: 1 });
GroupBuyCampaignSchema.index({ title: 'text', description: 'text' });
