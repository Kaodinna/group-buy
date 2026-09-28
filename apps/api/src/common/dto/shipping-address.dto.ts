import { IsString, MaxLength } from 'class-validator';

export class ShippingAddressDto {
  @IsString()
  @MaxLength(200)
  street!: string;

  @IsString()
  @MaxLength(100)
  city!: string;

  @IsString()
  @MaxLength(100)
  state!: string;

  @IsString()
  @MaxLength(100)
  country!: string;

  @IsString()
  @MaxLength(20)
  phone!: string;
}
