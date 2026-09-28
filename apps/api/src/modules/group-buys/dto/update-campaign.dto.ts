import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

// No `status` field on purpose - status changes are only ever made by
// CampaignStateService (Rule 8), never through a generic field update.
export class UpdateCampaignDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(140)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1_000_000_000)
  groupPrice?: number;

  @IsOptional()
  @IsInt()
  @Min(2)
  minimumParticipants?: number;

  @IsOptional()
  @IsInt()
  @Min(2)
  maximumParticipants?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

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
