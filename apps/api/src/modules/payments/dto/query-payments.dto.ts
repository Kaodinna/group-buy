import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { PaymentStatus } from '../../../common/enums/payment-status.enum.js';
import { PaymentProviderName } from '../../../common/enums/payment-provider-name.enum.js';

export class QueryPaymentsDto {
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @IsOptional()
  @IsEnum(PaymentProviderName)
  provider?: PaymentProviderName;

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
  limit?: number = 20;
}
