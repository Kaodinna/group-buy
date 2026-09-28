import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Role } from '../../../common/enums/role.enum.js';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  firstName!: string;

  @Prop({ required: true, trim: true })
  lastName!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  email!: string;

  @Prop({ required: true, trim: true })
  phone!: string;

  @Prop({ required: true, select: false })
  password!: string;

  @Prop({ type: String, enum: Role, default: Role.CUSTOMER })
  role!: Role;

  @Prop({ type: String, default: null })
  avatar?: string | null;

  @Prop({ default: false })
  isVerified!: boolean;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ required: true, unique: true, index: true })
  referralCode!: string;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  referredBy?: Types.ObjectId | null;

  @Prop({ default: 0 })
  tokenVersion!: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
