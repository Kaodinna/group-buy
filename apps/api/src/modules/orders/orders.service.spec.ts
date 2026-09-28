import { Test } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { OrdersService } from './orders.service.js';
import { Order } from './schemas/order.schema.js';
import { ParticipantsService } from '../participants/participants.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { OrderPaymentStatus } from '../../common/enums/order-payment-status.enum.js';
import { OrderStatus } from '../../common/enums/order-status.enum.js';
import { ParticipantStatus } from '../../common/enums/participant-status.enum.js';
import { Role } from '../../common/enums/role.enum.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';

function makeCampaign(overrides: Record<string, unknown> = {}) {
  return {
    _id: new Types.ObjectId(),
    productId: new Types.ObjectId(),
    sellerId: new Types.ObjectId(),
    title: 'iPhone 15 Group Buy',
    image: 'https://example.com/iphone.jpg',
    originalPrice: 1_000_000,
    groupPrice: 850_000,
    currency: 'NGN',
    ...overrides,
  };
}

function makeParticipant(overrides: Record<string, unknown> = {}) {
  return {
    _id: new Types.ObjectId(),
    userId: new Types.ObjectId(),
    campaignId: new Types.ObjectId(),
    quantity: 1,
    unitPrice: 850_000,
    totalAmount: 850_000,
    status: ParticipantStatus.PAID,
    orderId: null,
    shippingAddress: null,
    ...overrides,
  };
}

describe('OrdersService', () => {
  let service: OrdersService;
  let orderModel: {
    findById: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    updateOne: ReturnType<typeof vi.fn>;
  };
  let participantsService: {
    linkOrder: ReturnType<typeof vi.fn>;
    findPaidWithoutOrder: ReturnType<typeof vi.fn>;
  };
  let notificationsService: { notify: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    orderModel = {
      findById: vi.fn(),
      create: vi.fn(),
      updateOne: vi.fn().mockReturnValue({ exec: () => Promise.resolve(undefined) }),
    };
    participantsService = { linkOrder: vi.fn(), findPaidWithoutOrder: vi.fn() };
    notificationsService = { notify: vi.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getModelToken(Order.name), useValue: orderModel },
        { provide: ParticipantsService, useValue: participantsService },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = moduleRef.get(OrdersService);
  });

  describe('createOrderForParticipant', () => {
    it('prices the order off the campaign snapshot, discount included', async () => {
      const campaign = makeCampaign();
      const participant = makeParticipant();
      const created = { _id: new Types.ObjectId() };
      orderModel.create.mockResolvedValue(created);

      // @ts-expect-error - test doubles, only the fields the service reads
      await service.createOrderForParticipant(campaign, participant);

      expect(orderModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          subtotal: 1_000_000,
          discount: 150_000,
          shippingFee: 0,
          totalAmount: 850_000,
          paymentStatus: OrderPaymentStatus.PAID,
          orderStatus: OrderStatus.PENDING,
        }),
      );
      expect(participantsService.linkOrder).toHaveBeenCalledWith(
        participant._id.toString(),
        created._id,
      );
    });

    it('is idempotent: returns the existing order instead of creating a duplicate', async () => {
      const campaign = makeCampaign();
      const existingOrderId = new Types.ObjectId();
      const participant = makeParticipant({ orderId: existingOrderId });
      const existingOrder = { _id: existingOrderId };
      orderModel.findById.mockReturnValue({ exec: () => Promise.resolve(existingOrder) });

      // @ts-expect-error - test doubles
      const result = await service.createOrderForParticipant(campaign, participant);

      expect(result).toBe(existingOrder);
      expect(orderModel.create).not.toHaveBeenCalled();
    });
  });

  describe('createOrdersForSuccessfulCampaign', () => {
    it('creates one order per already-paid participant without an order yet', async () => {
      const campaign = makeCampaign();
      const participants = [makeParticipant(), makeParticipant()];
      participantsService.findPaidWithoutOrder.mockResolvedValue(participants);
      orderModel.create.mockResolvedValue({ _id: new Types.ObjectId() });

      // @ts-expect-error - test doubles
      await service.createOrdersForSuccessfulCampaign(campaign);

      expect(orderModel.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('cancel', () => {
    const owner: AuthenticatedUser = {
      userId: new Types.ObjectId().toString(),
      email: 'buyer@example.com',
      role: Role.CUSTOMER,
      tokenVersion: 0,
    };

    it('rejects a non-owner, non-admin trying to cancel', async () => {
      const order = {
        userId: new Types.ObjectId(),
        orderStatus: OrderStatus.PENDING,
        save: vi.fn(),
      };
      orderModel.findById.mockReturnValue({ exec: () => Promise.resolve(order) });

      await expect(service.cancel('order-1', owner)).rejects.toThrow(ForbiddenException);
    });

    it('rejects cancelling an order that already shipped', async () => {
      const order = {
        userId: new Types.ObjectId(owner.userId),
        orderStatus: OrderStatus.SHIPPED,
        save: vi.fn(),
      };
      orderModel.findById.mockReturnValue({ exec: () => Promise.resolve(order) });

      await expect(service.cancel('order-1', owner)).rejects.toThrow(AppException);
    });

    it('cancels a pending order for its owner', async () => {
      const order = {
        userId: new Types.ObjectId(owner.userId),
        orderStatus: OrderStatus.PENDING,
        save: vi.fn(),
      };
      orderModel.findById.mockReturnValue({ exec: () => Promise.resolve(order) });

      const result = await service.cancel('order-1', owner);

      expect(result.orderStatus).toBe(OrderStatus.CANCELLED);
      expect(order.save).toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    const seller: AuthenticatedUser = {
      userId: new Types.ObjectId().toString(),
      email: 'seller@example.com',
      role: Role.SELLER,
      tokenVersion: 0,
    };
    const admin: AuthenticatedUser = {
      userId: new Types.ObjectId().toString(),
      email: 'admin@example.com',
      role: Role.ADMIN,
      tokenVersion: 0,
    };

    it('rejects a seller who does not own the order', async () => {
      const order = {
        sellerId: new Types.ObjectId(),
        orderStatus: OrderStatus.PENDING,
        save: vi.fn(),
      };
      orderModel.findById.mockReturnValue({ exec: () => Promise.resolve(order) });

      await expect(
        service.updateStatus('order-1', { orderStatus: OrderStatus.PROCESSING }, seller),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects a backward or repeated transition', async () => {
      const order = {
        sellerId: new Types.ObjectId(seller.userId),
        userId: new Types.ObjectId(),
        orderStatus: OrderStatus.SHIPPED,
        items: [{ name: 'iPhone 15' }],
        save: vi.fn(),
      };
      orderModel.findById.mockReturnValue({ exec: () => Promise.resolve(order) });

      await expect(
        service.updateStatus('order-1', { orderStatus: OrderStatus.PROCESSING }, seller),
      ).rejects.toThrow(AppException);
    });

    it('rejects updating a cancelled order', async () => {
      const order = {
        sellerId: new Types.ObjectId(seller.userId),
        orderStatus: OrderStatus.CANCELLED,
        save: vi.fn(),
      };
      orderModel.findById.mockReturnValue({ exec: () => Promise.resolve(order) });

      await expect(
        service.updateStatus('order-1', { orderStatus: OrderStatus.SHIPPED }, seller),
      ).rejects.toThrow(AppException);
    });

    it('advances the order and notifies the customer when marked shipped', async () => {
      const customerId = new Types.ObjectId();
      const order = {
        _id: new Types.ObjectId(),
        sellerId: new Types.ObjectId(seller.userId),
        userId: customerId,
        orderStatus: OrderStatus.PROCESSING,
        items: [{ name: 'iPhone 15' }],
        save: vi.fn(),
      };
      orderModel.findById.mockReturnValue({ exec: () => Promise.resolve(order) });

      const result = await service.updateStatus(
        'order-1',
        { orderStatus: OrderStatus.SHIPPED },
        seller,
      );

      expect(result.orderStatus).toBe(OrderStatus.SHIPPED);
      expect(order.save).toHaveBeenCalled();
      expect(notificationsService.notify).toHaveBeenCalledWith(
        customerId,
        'ORDER_SHIPPED',
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ orderId: expect.any(String) }),
      );
    });

    it('allows an admin to update an order they do not own', async () => {
      const order = {
        _id: new Types.ObjectId(),
        sellerId: new Types.ObjectId(),
        userId: new Types.ObjectId(),
        orderStatus: OrderStatus.SHIPPED,
        items: [{ name: 'iPhone 15' }],
        save: vi.fn(),
      };
      orderModel.findById.mockReturnValue({ exec: () => Promise.resolve(order) });

      const result = await service.updateStatus(
        'order-1',
        { orderStatus: OrderStatus.DELIVERED },
        admin,
      );

      expect(result.orderStatus).toBe(OrderStatus.DELIVERED);
    });
  });

  describe('markRefunded', () => {
    it('sets both paymentStatus and orderStatus', async () => {
      await service.markRefunded('order-1');

      expect(orderModel.updateOne).toHaveBeenCalledWith(
        { _id: 'order-1' },
        {
          $set: {
            paymentStatus: OrderPaymentStatus.REFUNDED,
            orderStatus: OrderStatus.CANCELLED,
          },
        },
      );
    });
  });
});
