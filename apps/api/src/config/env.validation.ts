import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @Min(0)
  @IsOptional()
  PORT: number = 4000;

  @IsString()
  @IsNotEmpty()
  MONGODB_URI!: string;

  @IsString()
  @MinLength(32, { message: 'JWT_SECRET must be at least 32 characters long' })
  JWT_SECRET!: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN: string = '15m';

  // Required (not just optional-with-fallback) - reusing JWT_SECRET for
  // both access and refresh tokens would mean a leaked access token
  // secret also compromises the longer-lived refresh tokens.
  @IsString()
  @MinLength(32, { message: 'JWT_REFRESH_SECRET must be at least 32 characters long' })
  JWT_REFRESH_SECRET!: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRES_IN: string = '7d';

  @IsUrl({ require_tld: false })
  @IsOptional()
  APP_URL?: string;

  @IsString()
  @IsOptional()
  CORS_ORIGIN: string = 'http://localhost:3000';

  @IsString()
  @IsOptional()
  CLOUDINARY_CLOUD_NAME?: string;

  @IsString()
  @IsOptional()
  CLOUDINARY_API_KEY?: string;

  @IsString()
  @IsOptional()
  CLOUDINARY_API_SECRET?: string;

  @IsString()
  @IsOptional()
  PAYSTACK_SECRET_KEY?: string;

  @IsString()
  @IsOptional()
  PAYSTACK_PUBLIC_KEY?: string;

  @IsString()
  @IsOptional()
  FLUTTERWAVE_SECRET_KEY?: string;

  @IsString()
  @IsOptional()
  FLUTTERWAVE_PUBLIC_KEY?: string;

  @IsString()
  @IsOptional()
  FLUTTERWAVE_WEBHOOK_HASH?: string;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    const messages = errors
      .map((error) => Object.values(error.constraints ?? {}).join(', '))
      .join('; ');
    throw new Error(`Invalid environment configuration: ${messages}`);
  }

  return validatedConfig;
}
