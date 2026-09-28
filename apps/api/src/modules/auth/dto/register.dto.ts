import {
  IsEmail,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Role } from '../../../common/enums/role.enum.js';

// Only self-registrable roles - ADMIN accounts are created/promoted separately.
const RegistrableRole = { CUSTOMER: Role.CUSTOMER, SELLER: Role.SELLER } as const;

export class RegisterDto {
  @IsString()
  @MaxLength(60)
  firstName!: string;

  @IsString()
  @MaxLength(60)
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @Matches(/^[+0-9()\-\s]{7,20}$/, { message: 'phone must be a valid phone number' })
  phone!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @IsOptional()
  @IsEnum(RegistrableRole)
  role?: Role.CUSTOMER | Role.SELLER;

  @IsOptional()
  @IsString()
  referralCode?: string;

  // Set when the invite link pointed at a specific campaign rather than a
  // bare platform-level referral link - tracked on the Referral record only.
  @IsOptional()
  @IsMongoId()
  campaignId?: string;
}
