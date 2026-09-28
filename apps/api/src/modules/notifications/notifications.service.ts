import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { QueryFilter, Model, Types } from 'mongoose';
import { Notification, NotificationDocument } from './schemas/notification.schema.js';
import { QueryNotificationsDto } from './dto/query-notifications.dto.js';
import { NotificationType } from '../../common/enums/notification-type.enum.js';
import type { PaginatedResult } from '../../common/interfaces/paginated-result.interface.js';

/**
 * In-app only for now. Every notification still passes through this single
 * `notify()` entry point, so adding email/push later just means teaching
 * this one method to also dispatch through those channels - callers never
 * need to change.
 */
@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<Notification>,
  ) {}

  async notify(
    userId: Types.ObjectId | string,
    type: NotificationType,
    title: string,
    message: string,
    data: Record<string, unknown> = {},
  ): Promise<void> {
    await this.notificationModel.create({
      userId: typeof userId === 'string' ? new Types.ObjectId(userId) : userId,
      type,
      title,
      message,
      data,
    });
  }

  async findForUser(
    userId: string,
    query: QueryNotificationsDto,
  ): Promise<PaginatedResult<NotificationDocument>> {
    const filter: QueryFilter<Notification> = { userId: new Types.ObjectId(userId) };
    if (query.unreadOnly) filter.isRead = false;

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [items, total] = await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.notificationModel.countDocuments(filter).exec(),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }

  async countUnread(userId: string): Promise<number> {
    return this.notificationModel
      .countDocuments({ userId: new Types.ObjectId(userId), isRead: false })
      .exec();
  }

  async markAsRead(id: string, userId: string): Promise<NotificationDocument> {
    const notification = await this.notificationModel.findById(id).exec();
    if (!notification) throw new NotFoundException('Notification not found');
    if (notification.userId.toString() !== userId) {
      throw new ForbiddenException('You do not have permission to view this notification');
    }

    if (!notification.isRead) {
      notification.isRead = true;
      await notification.save();
    }

    return notification;
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationModel
      .updateMany({ userId: new Types.ObjectId(userId), isRead: false }, { $set: { isRead: true } })
      .exec();
  }
}
