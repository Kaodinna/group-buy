import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ReferralsService } from './referrals.service.js';
import { QueryReferralsDto } from './dto/query-referrals.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@Controller('referrals')
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async findMine(
    @Query() query: QueryReferralsDto,
    @CurrentUser('userId') userId: string,
  ) {
    const dashboard = await this.referralsService.getDashboard(userId, query);
    return { message: 'Referral dashboard retrieved', data: dashboard };
  }

  @Get(':code')
  async findByCode(@Param('code') code: string) {
    const referrer = await this.referralsService.resolveReferrerByCode(code);
    return { message: 'Referrer found', data: referrer };
  }
}
