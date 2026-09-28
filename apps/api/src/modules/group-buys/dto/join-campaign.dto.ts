import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ShippingAddressDto } from '../../../common/dto/shipping-address.dto.js';

export class JoinCampaignDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress?: ShippingAddressDto;
}
