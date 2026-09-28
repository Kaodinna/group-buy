import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsMongoId, IsOptional, Max, Min } from 'class-validator';
import { OrderStatus } from '../../../common/enums/order-status.enum.js';
import { OrderPaymentStatus } from '../../../common/enums/order-payment-status.enum.js';

export class QueryOrdersDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  orderStatus?: OrderStatus;

  @IsOptional()
  @IsEnum(OrderPaymentStatus)
  paymentStatus?: OrderPaymentStatus;

  // Only honored for an ADMIN requester - customers/sellers are always
  // scoped to their own orders regardless of what's passed here.
  @IsOptional()
  @IsMongoId()
  userId?: string;

  @IsOptional()
  @IsMongoId()
  sellerId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 12;
}
