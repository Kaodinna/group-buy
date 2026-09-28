import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CategoryDocument = HydratedDocument<Category>;

@Schema({ timestamps: true })
export class Category {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, unique: true, index: true, trim: true })
  slug!: string;

  @Prop({ type: String, default: null })
  description?: string | null;

  @Prop({ type: String, default: null })
  image?: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
