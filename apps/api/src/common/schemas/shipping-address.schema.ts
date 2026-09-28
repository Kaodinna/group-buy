import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class ShippingAddress {
  @Prop({ required: true, trim: true })
  street!: string;

  @Prop({ required: true, trim: true })
  city!: string;

  @Prop({ required: true, trim: true })
  state!: string;

  @Prop({ required: true, trim: true })
  country!: string;

  @Prop({ required: true, trim: true })
  phone!: string;
}

export const ShippingAddressSchema = SchemaFactory.createForClass(ShippingAddress);
