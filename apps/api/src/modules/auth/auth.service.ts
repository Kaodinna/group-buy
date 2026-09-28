import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import { UsersService, PublicUser } from '../users/users.service.js';
import { UserDocument } from '../users/schemas/user.schema.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { ReferralsService } from '../referrals/referrals.service.js';
import { Role } from '../../common/enums/role.enum.js';
import { hashPassword, comparePassword } from '../../common/utils/password.util.js';

interface TokenPayload {
  sub: string;
  email: string;
  role: Role;
  tokenVersion: number;
}

interface AuthResult {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly referralsService: ReferralsService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    let referrer = null;
    if (dto.referralCode) {
      referrer = await this.usersService.findByReferralCode(dto.referralCode);
    }

    const passwordHash = await hashPassword(dto.password);

    const user = await this.usersService.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
      passwordHash,
      role: dto.role ?? Role.CUSTOMER,
      referredBy: referrer?._id ?? null,
    });

    if (referrer) {
      await this.referralsService.createForRegistration(
        referrer._id,
        user._id,
        dto.campaignId ? new Types.ObjectId(dto.campaignId) : null,
      );
    }

    return this.issueAuthResult(user);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.usersService.findByEmail(dto.email, true);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isValid = await comparePassword(dto.password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.issueAuthResult(user);
  }

  async refreshTokens(refreshToken: string): Promise<Omit<AuthResult, 'user'>> {
    let payload: TokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<TokenPayload>(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive || user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const { accessToken, refreshToken: newRefreshToken } = this.signTokens(user);
    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(userId: string): Promise<void> {
    await this.usersService.incrementTokenVersion(userId);
  }

  private async issueAuthResult(user: UserDocument): Promise<AuthResult> {
    const { accessToken, refreshToken } = this.signTokens(user);
    return { user: this.usersService.toPublicUser(user), accessToken, refreshToken };
  }

  private signTokens(user: UserDocument): { accessToken: string; refreshToken: string } {
    const payload: TokenPayload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.secret'),
      expiresIn: this.durationOf('jwt.expiresIn'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
      expiresIn: this.durationOf('jwt.refreshExpiresIn'),
    });

    return { accessToken, refreshToken };
  }

  // Config values are validated duration strings (e.g. "15m", "7d") from env,
  // but @nestjs/jwt's type only accepts a narrow `ms`-library template type.
  private durationOf(key: string): JwtSignOptions['expiresIn'] {
    return this.configService.get<string>(key) as JwtSignOptions['expiresIn'];
  }
}
