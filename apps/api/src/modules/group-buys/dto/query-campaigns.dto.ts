import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsMongoId, IsOptional, IsString, Max, Min } from 'class-validator';
import { CampaignStatus } from '../../../common/enums/campaign-status.enum.js';

export class QueryCampaignsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @IsOptional()
  @IsMongoId()
  categoryId?: string;

  @IsOptional()
  @IsMongoId()
  sellerId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxPrice?: number;

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

  @IsOptional()
  @IsIn(['newest', 'ending_soon', 'most_joined', 'price_asc', 'price_desc'])
  sort?: 'newest' | 'ending_soon' | 'most_joined' | 'price_asc' | 'price_desc' = 'newest';
}
