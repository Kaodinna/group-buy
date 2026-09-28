import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsMongoId, IsOptional, IsString, Max, Min } from 'class-validator';
import { ProductStatus } from '../../../common/enums/product-status.enum.js';

export class QueryProductsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsMongoId()
  categoryId?: string;

  @IsOptional()
  @IsMongoId()
  sellerId?: string;

  // Only honored for an ADMIN requester - see ProductsService.applyVisibilityScope.
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

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
  @IsIn(['newest', 'price_asc', 'price_desc'])
  sort?: 'newest' | 'price_asc' | 'price_desc' = 'newest';
}
