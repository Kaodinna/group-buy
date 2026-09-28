import { Controller, Get, UseGuards } from '@nestjs/common';
import { ParticipantsService } from './participants.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@UseGuards(JwtAuthGuard)
@Controller('participants')
export class ParticipantsController {
  constructor(private readonly participantsService: ParticipantsService) {}

  @Get('me')
  async findMine(@CurrentUser('userId') userId: string) {
    const participations = await this.participantsService.findByUser(userId);
    return { message: 'Your group buys retrieved', data: participations };
  }
}
