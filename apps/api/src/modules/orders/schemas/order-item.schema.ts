import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ _id: false })
export class OrderItem {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ type: String, default: null })
  image?: string | null;

  @Prop({ required: true, min: 1 })
  quantity!: number;

  @Prop({ required: true, min: 1 })
  unitPrice!: number;

  @Prop({ required: true, min: 1 })
  totalPrice!: number;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);
