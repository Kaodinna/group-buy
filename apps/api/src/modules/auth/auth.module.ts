import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { UsersModule } from '../users/users.module.js';
import { ReferralsModule } from '../referrals/referrals.module.js';

// Global: JwtAuthGuard (an @nestjs/passport AuthGuard) needs PassportModule's
// providers in scope wherever it's used via @UseGuards(). Making this module
// global means every feature module can guard routes without re-importing
// PassportModule itself.
// AuthService signs access and refresh tokens with distinct secrets/TTLs on
// every call, so no default sign options are configured here.
@Global()
@Module({
  imports: [
    UsersModule,
    ReferralsModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, PassportModule],
})
export class AuthModule {}
