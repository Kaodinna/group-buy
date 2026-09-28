import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { OrderItem, OrderItemSchema } from './order-item.schema.js';
import { OrderPaymentStatus } from '../../../common/enums/order-payment-status.enum.js';
import { OrderStatus } from '../../../common/enums/order-status.enum.js';
import {
  ShippingAddress,
  ShippingAddressSchema,
} from '../../../common/schemas/shipping-address.schema.js';

export type OrderDocument = HydratedDocument<Order>;

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'GroupBuyCampaign', required: true, index: true })
  campaignId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true, index: true })
  productId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  sellerId!: Types.ObjectId;

  @Prop({ type: [OrderItemSchema], required: true })
  items!: OrderItem[];

  @Prop({ required: true, min: 1 })
  subtotal!: number;

  @Prop({ required: true, min: 0 })
  discount!: number;

  @Prop({ required: true, min: 0, default: 0 })
  shippingFee!: number;

  @Prop({ required: true, min: 1 })
  totalAmount!: number;

  @Prop({ default: 'NGN' })
  currency!: string;

  @Prop({ type: String, enum: OrderPaymentStatus, default: OrderPaymentStatus.PENDING, index: true })
  paymentStatus!: OrderPaymentStatus;

  @Prop({ type: String, enum: OrderStatus, default: OrderStatus.PENDING, index: true })
  orderStatus!: OrderStatus;

  @Prop({ type: ShippingAddressSchema, default: null })
  shippingAddress?: ShippingAddress | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
