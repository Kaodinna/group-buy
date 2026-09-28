import {
  IsArray,
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

export class CreateProductDto {
  @IsString()
  @MinLength(3)
  @MaxLength(140)
  name!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  description!: string;

  @IsMongoId()
  categoryId!: string;

  @IsInt()
  @Min(1)
  @Max(1_000_000_000)
  originalPrice!: number;

  @IsInt()
  @Min(0)
  stock!: number;

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  images?: string[];

  @IsOptional()
  @IsObject()
  specifications?: Record<string, string>;
}
