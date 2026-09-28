import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ParticipantStatus } from '../../../common/enums/participant-status.enum.js';
import {
  ShippingAddress,
  ShippingAddressSchema,
} from '../../../common/schemas/shipping-address.schema.js';

export type ParticipantDocument = HydratedDocument<GroupBuyParticipant>;

const ACTIVE_PARTICIPANT_STATUSES = [
  ParticipantStatus.PENDING,
  ParticipantStatus.PAID,
  ParticipantStatus.CONFIRMED,
];

@Schema({ timestamps: true })
export class GroupBuyParticipant {
  @Prop({ type: Types.ObjectId, ref: 'GroupBuyCampaign', required: true, index: true })
  campaignId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, min: 1, default: 1 })
  quantity!: number;

  @Prop({ required: true, min: 1 })
  unitPrice!: number;

  @Prop({ required: true, min: 1 })
  totalAmount!: number;

  @Prop({ type: String, enum: ParticipantStatus, default: ParticipantStatus.PENDING, index: true })
  status!: ParticipantStatus;

  @Prop({ type: Types.ObjectId, ref: 'Payment', default: null })
  paymentId?: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Order', default: null })
  orderId?: Types.ObjectId | null;

  @Prop({ required: true, default: () => new Date() })
  joinedAt!: Date;

  @Prop({ required: true })
  expiresAt!: Date;

  // Optionally supplied when joining - copied onto the Order automatically
  // created once the campaign succeeds and this reservation is paid.
  @Prop({ type: ShippingAddressSchema, default: null })
  shippingAddress?: ShippingAddress | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const GroupBuyParticipantSchema = SchemaFactory.createForClass(GroupBuyParticipant);

// A user may hold at most one *active* (unpaid/paid/confirmed) reservation
// per campaign, but can rejoin after a prior attempt was cancelled/refunded
// - so uniqueness is scoped to the active-status subset via a partial index.
GroupBuyParticipantSchema.index(
  { campaignId: 1, userId: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ACTIVE_PARTICIPANT_STATUSES } } },
);
