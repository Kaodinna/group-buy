import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ProductStatus } from '../../../common/enums/product-status.enum.js';

export type ProductDocument = HydratedDocument<Product>;

@Schema({ timestamps: true })
export class Product {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  sellerId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, unique: true, index: true, trim: true })
  slug!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ type: [String], default: [] })
  images!: string[];

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true, index: true })
  categoryId!: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  originalPrice!: number;

  @Prop({ default: 'NGN' })
  currency!: string;

  @Prop({ required: true, min: 0, default: 0 })
  stock!: number;

  @Prop({ type: Object, default: {} })
  specifications!: Record<string, string>;

  @Prop({ type: String, enum: ProductStatus, default: ProductStatus.PENDING, index: true })
  status!: ProductStatus;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

ProductSchema.index({ name: 'text', description: 'text' });
