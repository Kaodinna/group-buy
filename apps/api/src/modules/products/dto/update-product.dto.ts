import {
  IsArray,
  IsEnum,
  IsInt,
  IsMongoId,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ProductStatus } from '../../../common/enums/product-status.enum.js';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(140)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsMongoId()
  categoryId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1_000_000_000)
  originalPrice?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  images?: string[];

  @IsOptional()
  @IsObject()
  specifications?: Record<string, string>;

  // Only honored when the requester is an ADMIN - see ProductsService.update.
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}
