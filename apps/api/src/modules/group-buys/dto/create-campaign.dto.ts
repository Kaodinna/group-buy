import {
  IsDateString,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCampaignDto {
  @IsMongoId()
  productId!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(140)
  title!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  description!: string;

  @IsInt()
  @Min(1)
  @Max(1_000_000_000)
  groupPrice!: number;

  @IsInt()
  @Min(2)
  minimumParticipants!: number;

  @IsInt()
  @Min(2)
  maximumParticipants!: number;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsDateString()
  paymentDeadline?: string;

  @IsOptional()
  @IsUrl()
  image?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  shippingInfo?: string;
}
