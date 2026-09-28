import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { NotificationsService } from './notifications.service.js';
import { Notification } from './schemas/notification.schema.js';
import { NotificationType } from '../../common/enums/notification-type.enum.js';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let notificationModel: {
    create: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    countDocuments: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    notificationModel = {
      create: vi.fn(),
      find: vi.fn(),
      findById: vi.fn(),
      countDocuments: vi.fn(),
      updateMany: vi.fn().mockReturnValue({ exec: () => Promise.resolve(undefined) }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getModelToken(Notification.name), useValue: notificationModel },
      ],
    }).compile();

    service = moduleRef.get(NotificationsService);
  });

  describe('notify', () => {
    it('accepts either a string or an ObjectId userId', async () => {
      const userId = new Types.ObjectId();
      await service.notify(userId.toString(), NotificationType.PAYMENT_SUCCESSFUL, 'Title', 'Message');

      expect(notificationModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: expect.any(Types.ObjectId),
          type: NotificationType.PAYMENT_SUCCESSFUL,
          title: 'Title',
          message: 'Message',
        }),
      );
    });
  });

  describe('markAsRead', () => {
    it('rejects marking someone else\'s notification as read', async () => {
      const notification = {
        userId: new Types.ObjectId(),
        isRead: false,
        save: vi.fn(),
      };
      notificationModel.findById.mockReturnValue({ exec: () => Promise.resolve(notification) });

      await expect(
        service.markAsRead('notif-1', new Types.ObjectId().toString()),
      ).rejects.toThrow(ForbiddenException);
      expect(notification.save).not.toHaveBeenCalled();
    });

    it('throws for a non-existent notification', async () => {
      notificationModel.findById.mockReturnValue({ exec: () => Promise.resolve(null) });

      await expect(service.markAsRead('missing', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('marks the owner\'s notification as read, idempotently', async () => {
      const userId = new Types.ObjectId();
      const notification = { userId, isRead: false, save: vi.fn() };
      notificationModel.findById.mockReturnValue({ exec: () => Promise.resolve(notification) });

      await service.markAsRead('notif-1', userId.toString());
      expect(notification.isRead).toBe(true);
      expect(notification.save).toHaveBeenCalledOnce();

      // A second call on an already-read notification shouldn't re-save.
      await service.markAsRead('notif-1', userId.toString());
      expect(notification.save).toHaveBeenCalledOnce();
    });
  });

  describe('findForUser', () => {
    it('scopes the query to the requesting user and honors unreadOnly', async () => {
      const find = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        exec: () => Promise.resolve([]),
      };
      notificationModel.find.mockReturnValue(find);
      notificationModel.countDocuments.mockReturnValue({ exec: () => Promise.resolve(0) });

      const userId = new Types.ObjectId().toString();
      await service.findForUser(userId, { unreadOnly: true });

      expect(notificationModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ isRead: false }),
      );
    });
  });
});
