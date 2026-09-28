import { Controller, Get, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Role } from '../../common/enums/role.enum.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Roles(Role.SELLER, Role.ADMIN)
  @Get('seller')
  async seller(@CurrentUser('userId') userId: string) {
    const data = await this.analyticsService.getSellerAnalytics(userId);
    return { message: 'Seller analytics retrieved', data };
  }

  @Roles(Role.ADMIN)
  @Get('admin')
  async admin() {
    const data = await this.analyticsService.getAdminAnalytics();
    return { message: 'Admin analytics retrieved', data };
  }
}
