import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { QueryNotificationsDto } from './dto/query-notifications.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findAll(
    @Query() query: QueryNotificationsDto,
    @CurrentUser('userId') userId: string,
  ) {
    const result = await this.notificationsService.findForUser(userId, query);
    return { message: 'Notifications retrieved', data: result };
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser('userId') userId: string) {
    const count = await this.notificationsService.countUnread(userId);
    return { message: 'Unread count retrieved', data: { count } };
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    const notification = await this.notificationsService.markAsRead(id, userId);
    return { message: 'Notification marked as read', data: notification };
  }

  @Patch('read-all')
  async markAllAsRead(@CurrentUser('userId') userId: string) {
    await this.notificationsService.markAllAsRead(userId);
    return { message: 'All notifications marked as read', data: null };
  }
}
