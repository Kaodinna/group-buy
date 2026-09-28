import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { CookieOptions, Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { UsersService } from '../users/users.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

const REFRESH_COOKIE = 'refresh_token';

// Tighter than the app-wide default (100/min) - these are the endpoints a
// credential-stuffing or brute-force script would actually hit.
const AUTH_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  @Throttle(AUTH_THROTTLE)
  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const { user, accessToken, refreshToken } = await this.authService.register(dto);
    this.setRefreshCookie(res, refreshToken);
    return { message: 'Registration successful', data: { user, accessToken } };
  }

  @Throttle(AUTH_THROTTLE)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { user, accessToken, refreshToken } = await this.authService.login(dto);
    this.setRefreshCookie(res, refreshToken);
    return { message: 'Login successful', data: { user, accessToken } };
  }

  @Throttle(AUTH_THROTTLE)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!token) throw new UnauthorizedException('Missing refresh token');

    const { accessToken, refreshToken } = await this.authService.refreshTokens(token);
    this.setRefreshCookie(res, refreshToken);
    return { message: 'Token refreshed', data: { accessToken } };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser('userId') userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(userId);
    res.clearCookie(REFRESH_COOKIE, this.cookieOptions());
    return { message: 'Logged out successfully', data: null };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser('userId') userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');
    return { message: 'Profile retrieved', data: this.usersService.toPublicUser(user) };
  }

  private setRefreshCookie(res: Response, token: string): void {
    res.cookie(REFRESH_COOKIE, token, this.cookieOptions());
  }

  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.configService.get<string>('nodeEnv') === 'production',
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };
  }
}
