import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { PaymentStatus } from '../../../common/enums/payment-status.enum.js';
import { PaymentProviderName } from '../../../common/enums/payment-provider-name.enum.js';

export type PaymentDocument = HydratedDocument<Payment>;

@Schema({ timestamps: true })
export class Payment {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'GroupBuyCampaign', required: true, index: true })
  campaignId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Order', default: null })
  orderId?: Types.ObjectId | null;

  @Prop({ type: String, enum: PaymentProviderName, required: true })
  provider!: PaymentProviderName;

  @Prop({ required: true, unique: true, index: true })
  reference!: string;

  @Prop({ required: true, min: 1 })
  amount!: number;

  @Prop({ default: 'NGN' })
  currency!: string;

  @Prop({ type: String, enum: PaymentStatus, default: PaymentStatus.PENDING, index: true })
  status!: PaymentStatus;

  // Holds the originating participantId and, once verified, the provider's
  // own transaction id (needed for Flutterwave refunds, which key off their
  // numeric id rather than our reference).
  @Prop({ type: Object, default: {} })
  metadata!: Record<string, unknown>;

  @Prop({ type: Date, default: null })
  paidAt?: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
