import { Test } from '@nestjs/testing';
import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { PaymentsService } from './payments.service.js';
import { Payment } from './schemas/payment.schema.js';
import { PAYMENT_PROVIDERS } from './providers/payment-providers.token.js';
import { ParticipantsService } from '../participants/participants.service.js';
import { CampaignsService } from '../group-buys/campaigns.service.js';
import { UsersService } from '../users/users.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PaymentStatus } from '../../common/enums/payment-status.enum.js';
import { PaymentProviderName } from '../../common/enums/payment-provider-name.enum.js';
import { ParticipantStatus } from '../../common/enums/participant-status.enum.js';
import { NotificationType } from '../../common/enums/notification-type.enum.js';
import { Role } from '../../common/enums/role.enum.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import type { PaymentProvider } from './interfaces/payment-provider.interface.js';

function makePaymentDoc(overrides: Record<string, unknown> = {}) {
  const doc = {
    _id: new Types.ObjectId(),
    userId: new Types.ObjectId(),
    campaignId: new Types.ObjectId(),
    provider: PaymentProviderName.PAYSTACK,
    reference: 'gb_ref_1',
    amount: 80_000,
    currency: 'NGN',
    status: PaymentStatus.PENDING,
    metadata: { participantId: 'participant-1' },
    paidAt: null,
    save: vi.fn(),
    ...overrides,
  };
  doc.save.mockImplementation(async () => doc);
  return doc;
}

function makeParticipantDoc(overrides: Record<string, unknown> = {}) {
  return {
    _id: new Types.ObjectId(),
    userId: new Types.ObjectId(),
    campaignId: new Types.ObjectId(),
    totalAmount: 80_000,
    status: ParticipantStatus.PENDING,
    expiresAt: new Date(Date.now() + 30 * 60_000),
    ...overrides,
  };
}

describe('PaymentsService', () => {
  let service: PaymentsService;
  let paymentModel: {
    findOne: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
    countDocuments: ReturnType<typeof vi.fn>;
  };
  let mockProvider: {
    name: PaymentProviderName;
    initialize: ReturnType<typeof vi.fn>;
    verify: ReturnType<typeof vi.fn>;
    verifyWebhookSignature: ReturnType<typeof vi.fn>;
    parseWebhookEvent: ReturnType<typeof vi.fn>;
    refund: ReturnType<typeof vi.fn>;
  };
  let participantsService: {
    findById: ReturnType<typeof vi.fn>;
    linkPayment: ReturnType<typeof vi.fn>;
  };
  let campaignsService: {
    confirmParticipantPayment: ReturnType<typeof vi.fn>;
    refundParticipant: ReturnType<typeof vi.fn>;
  };
  let usersService: { findById: ReturnType<typeof vi.fn> };
  let notificationsService: { notify: ReturnType<typeof vi.fn> };

  const admin: AuthenticatedUser = {
    userId: new Types.ObjectId().toString(),
    email: 'admin@example.com',
    role: Role.ADMIN,
    tokenVersion: 0,
  };

  beforeEach(async () => {
    paymentModel = {
      findOne: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      find: vi.fn(),
      countDocuments: vi.fn(),
    };
    mockProvider = {
      name: PaymentProviderName.PAYSTACK,
      initialize: vi.fn(),
      verify: vi.fn(),
      verifyWebhookSignature: vi.fn(),
      parseWebhookEvent: vi.fn(),
      refund: vi.fn(),
    };
    participantsService = { findById: vi.fn(), linkPayment: vi.fn() };
    campaignsService = {
      confirmParticipantPayment: vi.fn(),
      refundParticipant: vi.fn(),
    };
    usersService = { findById: vi.fn() };
    notificationsService = { notify: vi.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: getModelToken(Payment.name), useValue: paymentModel },
        {
          provide: PAYMENT_PROVIDERS,
          useValue: { [PaymentProviderName.PAYSTACK]: mockProvider as unknown as PaymentProvider },
        },
        { provide: ParticipantsService, useValue: participantsService },
        { provide: CampaignsService, useValue: campaignsService },
        { provide: UsersService, useValue: usersService },
        { provide: ConfigService, useValue: { get: () => 'http://localhost:3000' } },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = moduleRef.get(PaymentsService);
  });

  describe('initialize', () => {
    it('rejects a reservation that does not belong to the caller', async () => {
      const participant = makeParticipantDoc();
      participantsService.findById.mockResolvedValue(participant);

      await expect(
        service.initialize('someone-else', {
          participantId: participant._id.toString(),
          provider: PaymentProviderName.PAYSTACK,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects a reservation that already has a payment outcome', async () => {
      const userId = new Types.ObjectId().toString();
      const participant = makeParticipantDoc({
        userId: new Types.ObjectId(userId),
        status: ParticipantStatus.PAID,
      });
      participantsService.findById.mockResolvedValue(participant);

      await expect(
        service.initialize(userId, {
          participantId: participant._id.toString(),
          provider: PaymentProviderName.PAYSTACK,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects an expired reservation', async () => {
      const userId = new Types.ObjectId().toString();
      const participant = makeParticipantDoc({
        userId: new Types.ObjectId(userId),
        expiresAt: new Date(Date.now() - 1000),
      });
      participantsService.findById.mockResolvedValue(participant);

      await expect(
        service.initialize(userId, {
          participantId: participant._id.toString(),
          provider: PaymentProviderName.PAYSTACK,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('charges exactly the amount captured on the reservation, never a client-supplied one', async () => {
      const userId = new Types.ObjectId().toString();
      const participant = makeParticipantDoc({ userId: new Types.ObjectId(userId) });
      participantsService.findById.mockResolvedValue(participant);
      usersService.findById.mockResolvedValue({ email: 'buyer@example.com' });

      const createdPayment = makePaymentDoc({ amount: participant.totalAmount });
      paymentModel.create.mockResolvedValue(createdPayment);
      mockProvider.initialize.mockResolvedValue({
        authorizationUrl: 'https://paystack.test/pay/abc',
        reference: createdPayment.reference,
      });

      const result = await service.initialize(userId, {
        participantId: participant._id.toString(),
        provider: PaymentProviderName.PAYSTACK,
      });

      expect(paymentModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ amount: participant.totalAmount }),
      );
      expect(mockProvider.initialize).toHaveBeenCalledWith(
        expect.objectContaining({ amount: participant.totalAmount }),
      );
      expect(result.authorizationUrl).toBe('https://paystack.test/pay/abc');
      expect(participantsService.linkPayment).toHaveBeenCalledWith(
        participant._id.toString(),
        createdPayment._id,
      );
    });
  });

  describe('findAll', () => {
    it('paginates and applies status/provider filters', async () => {
      const items = [{ _id: new Types.ObjectId() }];
      paymentModel.find.mockReturnValue({
        sort: () => ({
          skip: () => ({ limit: () => ({ exec: () => Promise.resolve(items) }) }),
        }),
      });
      paymentModel.countDocuments.mockReturnValue({ exec: () => Promise.resolve(1) });

      const result = await service.findAll({
        status: PaymentStatus.SUCCESS,
        provider: PaymentProviderName.PAYSTACK,
        page: 1,
        limit: 20,
      });

      expect(paymentModel.find).toHaveBeenCalledWith({
        status: PaymentStatus.SUCCESS,
        provider: PaymentProviderName.PAYSTACK,
      });
      expect(result).toEqual({ items, total: 1, page: 1, limit: 20, totalPages: 1 });
    });

    it('defaults to no filters when none are given', async () => {
      paymentModel.find.mockReturnValue({
        sort: () => ({
          skip: () => ({ limit: () => ({ exec: () => Promise.resolve([]) }) }),
        }),
      });
      paymentModel.countDocuments.mockReturnValue({ exec: () => Promise.resolve(0) });

      await service.findAll({});

      expect(paymentModel.find).toHaveBeenCalledWith({});
    });
  });

  describe('handleWebhook', () => {
    it('rejects a webhook with an invalid signature and mutates nothing', async () => {
      mockProvider.verifyWebhookSignature.mockReturnValue(false);

      await expect(
        service.handleWebhook(PaymentProviderName.PAYSTACK, Buffer.from('{}'), 'bad-sig', {}),
      ).rejects.toThrow(UnauthorizedException);

      expect(paymentModel.findOne).not.toHaveBeenCalled();
    });

    it('ignores a webhook for a reference it does not recognize', async () => {
      mockProvider.verifyWebhookSignature.mockReturnValue(true);
      mockProvider.parseWebhookEvent.mockReturnValue({ reference: 'unknown', status: 'success' });
      paymentModel.findOne.mockReturnValue({ exec: () => Promise.resolve(null) });

      await expect(
        service.handleWebhook(PaymentProviderName.PAYSTACK, Buffer.from('{}'), 'sig', {}),
      ).resolves.toBeUndefined();

      expect(mockProvider.verify).not.toHaveBeenCalled();
    });

    it('marks payment SUCCESS and confirms the participant after independent verification', async () => {
      const payment = makePaymentDoc();
      mockProvider.verifyWebhookSignature.mockReturnValue(true);
      mockProvider.parseWebhookEvent.mockReturnValue({ reference: payment.reference, status: 'success' });
      paymentModel.findOne.mockReturnValue({ exec: () => Promise.resolve(payment) });
      mockProvider.verify.mockResolvedValue({
        reference: payment.reference,
        status: 'success',
        amount: payment.amount,
        currency: 'NGN',
        paidAt: new Date(),
        providerTransactionId: 'txn_1',
        raw: {},
      });

      await service.handleWebhook(PaymentProviderName.PAYSTACK, Buffer.from('{}'), 'sig', {});

      expect(payment.status).toBe(PaymentStatus.SUCCESS);
      expect(campaignsService.confirmParticipantPayment).toHaveBeenCalledWith('participant-1');
      expect(notificationsService.notify).toHaveBeenCalledWith(
        payment.userId,
        NotificationType.PAYMENT_SUCCESSFUL,
        expect.any(String),
        expect.any(String),
        expect.any(Object),
      );
    });

    it('marks payment FAILED when independent verification disagrees with the webhook', async () => {
      const payment = makePaymentDoc();
      mockProvider.verifyWebhookSignature.mockReturnValue(true);
      mockProvider.parseWebhookEvent.mockReturnValue({ reference: payment.reference, status: 'success' });
      paymentModel.findOne.mockReturnValue({ exec: () => Promise.resolve(payment) });
      mockProvider.verify.mockResolvedValue({
        reference: payment.reference,
        status: 'failed',
        amount: payment.amount,
        currency: 'NGN',
        paidAt: null,
        raw: {},
      });

      await service.handleWebhook(PaymentProviderName.PAYSTACK, Buffer.from('{}'), 'sig', {});

      expect(payment.status).toBe(PaymentStatus.FAILED);
      expect(campaignsService.confirmParticipantPayment).not.toHaveBeenCalled();
    });

    it('is idempotent under a duplicate webhook delivery', async () => {
      const payment = makePaymentDoc({ status: PaymentStatus.SUCCESS });
      mockProvider.verifyWebhookSignature.mockReturnValue(true);
      mockProvider.parseWebhookEvent.mockReturnValue({ reference: payment.reference, status: 'success' });
      paymentModel.findOne.mockReturnValue({ exec: () => Promise.resolve(payment) });

      await service.handleWebhook(PaymentProviderName.PAYSTACK, Buffer.from('{}'), 'sig', {});

      expect(mockProvider.verify).not.toHaveBeenCalled();
      expect(campaignsService.confirmParticipantPayment).not.toHaveBeenCalled();
      expect(payment.save).not.toHaveBeenCalled();
    });
  });

  describe('refund', () => {
    it('rejects a refund request from a non-admin', async () => {
      const nonAdmin: AuthenticatedUser = { ...admin, role: Role.CUSTOMER };
      await expect(service.refund('payment-id', nonAdmin)).rejects.toThrow(ForbiddenException);
    });

    it('refunds a successful payment and settles the participant', async () => {
      const payment = makePaymentDoc({ status: PaymentStatus.SUCCESS });
      paymentModel.findById.mockReturnValue({ exec: () => Promise.resolve(payment) });
      mockProvider.refund.mockResolvedValue({ status: 'success', raw: {} });

      const result = await service.refund(payment._id.toString(), admin);

      expect(result.status).toBe(PaymentStatus.REFUNDED);
      expect(campaignsService.refundParticipant).toHaveBeenCalledWith('participant-1');
      expect(notificationsService.notify).toHaveBeenCalledWith(
        payment.userId,
        NotificationType.REFUND_PROCESSED,
        expect.any(String),
        expect.any(String),
        expect.any(Object),
      );
    });

    it('is idempotent under a duplicate refund request', async () => {
      const payment = makePaymentDoc({ status: PaymentStatus.REFUNDED });
      paymentModel.findById.mockReturnValue({ exec: () => Promise.resolve(payment) });

      const result = await service.refund(payment._id.toString(), admin);

      expect(result).toBe(payment);
      expect(mockProvider.refund).not.toHaveBeenCalled();
      expect(campaignsService.refundParticipant).not.toHaveBeenCalled();
    });

    it('rejects refunding a payment that never succeeded', async () => {
      const payment = makePaymentDoc({ status: PaymentStatus.PENDING });
      paymentModel.findById.mockReturnValue({ exec: () => Promise.resolve(payment) });

      await expect(service.refund(payment._id.toString(), admin)).rejects.toThrow(AppException);
    });
  });
});
