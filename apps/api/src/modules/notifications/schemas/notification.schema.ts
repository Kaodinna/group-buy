import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { NotificationType } from '../../../common/enums/notification-type.enum.js';

export type NotificationDocument = HydratedDocument<Notification>;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, enum: NotificationType, required: true, index: true })
  type!: NotificationType;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ required: true })
  message!: string;

  @Prop({ type: Object, default: {} })
  data!: Record<string, unknown>;

  @Prop({ default: false, index: true })
  isRead!: boolean;

  createdAt?: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ userId: 1, createdAt: -1 });
