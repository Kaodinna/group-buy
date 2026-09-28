import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { CampaignsService } from './campaigns.service.js';
import { CampaignStateService } from './campaign-state.service.js';
import { GroupBuyCampaign } from './schemas/campaign.schema.js';
import { ParticipantsService } from '../participants/participants.service.js';
import { ProductsService } from '../products/products.service.js';
import { OrdersService } from '../orders/orders.service.js';
import { ReferralsService } from '../referrals/referrals.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { NotificationType } from '../../common/enums/notification-type.enum.js';
import { CampaignStatus } from '../../common/enums/campaign-status.enum.js';
import { ProductStatus } from '../../common/enums/product-status.enum.js';
import { Role } from '../../common/enums/role.enum.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';

function makeCampaignDoc(overrides: Record<string, unknown> = {}) {
  return {
    _id: new Types.ObjectId(),
    sellerId: new Types.ObjectId(),
    productId: new Types.ObjectId(),
    status: CampaignStatus.ACTIVE,
    startDate: new Date(Date.now() - 60_000),
    endDate: new Date(Date.now() + 60 * 60_000),
    groupPrice: 850_000,
    minimumParticipants: 2,
    maximumParticipants: 10,
    currentParticipants: 0,
    paymentDeadline: null,
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeProductDoc(overrides: Record<string, unknown> = {}) {
  return {
    _id: new Types.ObjectId(),
    stock: 50,
    status: ProductStatus.ACTIVE,
    ...overrides,
  };
}

describe('CampaignsService.join', () => {
  let service: CampaignsService;
  let campaignModel: {
    find: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    findOneAndUpdate: ReturnType<typeof vi.fn>;
    updateOne: ReturnType<typeof vi.fn>;
  };
  let participantsService: {
    findActiveByCampaignAndUser: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    markAsPaid: ReturnType<typeof vi.fn>;
    markAsRefunded: ReturnType<typeof vi.fn>;
    countPaid: ReturnType<typeof vi.fn>;
    findByCampaignRaw: ReturnType<typeof vi.fn>;
    findExpiredPending: ReturnType<typeof vi.fn>;
    expireParticipant: ReturnType<typeof vi.fn>;
    cancelPendingAndListPaid: ReturnType<typeof vi.fn>;
  };
  let productsService: { findByIdOrSlug: ReturnType<typeof vi.fn> };
  let ordersService: {
    createOrderForParticipant: ReturnType<typeof vi.fn>;
    createOrdersForSuccessfulCampaign: ReturnType<typeof vi.fn>;
    markRefunded: ReturnType<typeof vi.fn>;
  };
  let referralsService: { completeReferralIfApplicable: ReturnType<typeof vi.fn> };
  let notificationsService: { notify: ReturnType<typeof vi.fn> };

  const buyer: AuthenticatedUser = {
    userId: new Types.ObjectId().toString(),
    email: 'buyer@example.com',
    role: Role.CUSTOMER,
    tokenVersion: 0,
  };

  beforeEach(async () => {
    campaignModel = {
      find: vi.fn(),
      findById: vi.fn(),
      findOneAndUpdate: vi.fn(),
      updateOne: vi.fn().mockReturnValue({ exec: () => Promise.resolve(undefined) }),
    };
    participantsService = {
      findActiveByCampaignAndUser: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      markAsPaid: vi.fn(),
      markAsRefunded: vi.fn(),
      countPaid: vi.fn(),
      findByCampaignRaw: vi.fn().mockResolvedValue([]),
      findExpiredPending: vi.fn(),
      expireParticipant: vi.fn(),
      cancelPendingAndListPaid: vi.fn(),
    };
    productsService = {
      findByIdOrSlug: vi.fn().mockResolvedValue(makeProductDoc()),
    };
    ordersService = {
      createOrderForParticipant: vi.fn(),
      createOrdersForSuccessfulCampaign: vi.fn(),
      markRefunded: vi.fn(),
    };
    referralsService = { completeReferralIfApplicable: vi.fn() };
    notificationsService = { notify: vi.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CampaignsService,
        CampaignStateService,
        { provide: getModelToken(GroupBuyCampaign.name), useValue: campaignModel },
        { provide: ParticipantsService, useValue: participantsService },
        { provide: ProductsService, useValue: productsService },
        { provide: ReferralsService, useValue: referralsService },
        { provide: OrdersService, useValue: ordersService },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = moduleRef.get(CampaignsService);
  });

  it('rejects a user who already has an active reservation', async () => {
    participantsService.findActiveByCampaignAndUser.mockResolvedValue({ _id: 'existing' });

    await expect(
      service.join(new Types.ObjectId().toString(), buyer),
    ).rejects.toThrow(AppException);

    expect(campaignModel.findById).not.toHaveBeenCalled();
  });

  it('rejects the campaign owner joining their own campaign', async () => {
    const campaign = makeCampaignDoc({ sellerId: new Types.ObjectId(buyer.userId) });
    campaignModel.findById.mockReturnValue({ exec: () => Promise.resolve(campaign) });

    await expect(
      service.join(campaign._id.toString(), buyer),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects when the campaign is already full at the atomic-claim step', async () => {
    const campaign = makeCampaignDoc();
    campaignModel.findById.mockReturnValue({ exec: () => Promise.resolve(campaign) });
    // Simulates the atomic filter (currentParticipants < maximumParticipants)
    // failing to match - e.g. a concurrent request just took the last slot.
    campaignModel.findOneAndUpdate.mockReturnValue({ exec: () => Promise.resolve(null) });

    await expect(service.join(campaign._id.toString(), buyer)).rejects.toThrow(AppException);
    expect(participantsService.create).not.toHaveBeenCalled();
  });

  it('creates a reservation at the campaign group price on success', async () => {
    const campaign = makeCampaignDoc();
    campaignModel.findById.mockReturnValue({ exec: () => Promise.resolve(campaign) });
    const claimed = { ...campaign, currentParticipants: 1 };
    campaignModel.findOneAndUpdate.mockReturnValue({ exec: () => Promise.resolve(claimed) });
    participantsService.create.mockResolvedValue({ _id: 'new-participant' });

    const result = await service.join(campaign._id.toString(), buyer);

    expect(result).toEqual({ _id: 'new-participant' });
    expect(participantsService.create).toHaveBeenCalledWith(
      expect.objectContaining({ unitPrice: campaign.groupPrice }),
    );
  });

  it('releases the claimed slot when participant creation fails', async () => {
    const campaign = makeCampaignDoc();
    campaignModel.findById.mockReturnValue({ exec: () => Promise.resolve(campaign) });
    const claimed = { ...campaign, currentParticipants: 1 };
    campaignModel.findOneAndUpdate.mockReturnValue({ exec: () => Promise.resolve(claimed) });

    const duplicateKeyError = Object.assign(new Error('duplicate'), { code: 11000 });
    participantsService.create.mockRejectedValue(duplicateKeyError);

    await expect(service.join(campaign._id.toString(), buyer)).rejects.toThrow(AppException);

    expect(campaignModel.updateOne).toHaveBeenCalledWith(
      { _id: claimed._id },
      { $inc: { currentParticipants: -1 } },
    );
  });

  it('rejects joining a campaign that has not started or already ended', async () => {
    const campaign = makeCampaignDoc({ startDate: new Date(Date.now() + 60 * 60_000) });
    campaignModel.findById.mockReturnValue({ exec: () => Promise.resolve(campaign) });

    await expect(service.join(campaign._id.toString(), buyer)).rejects.toThrow(AppException);
  });

  it('rejects joining when the campaign does not exist', async () => {
    campaignModel.findById.mockReturnValue({ exec: () => Promise.resolve(null) });

    await expect(
      service.join(new Types.ObjectId().toString(), buyer),
    ).rejects.toThrow(NotFoundException);
  });

  describe('confirmParticipantPayment', () => {
    it('batch-creates orders for everyone already paid once the minimum is crossed', async () => {
      const campaign = makeCampaignDoc({ status: CampaignStatus.ACTIVE, minimumParticipants: 5 });
      const participant = { campaignId: campaign._id, orderId: null, userId: new Types.ObjectId() };
      participantsService.markAsPaid.mockResolvedValue(participant);
      campaignModel.findById.mockReturnValue({ exec: () => Promise.resolve(campaign) });
      participantsService.countPaid.mockResolvedValue(5);

      await service.confirmParticipantPayment('participant-1');

      expect(campaign.status).toBe(CampaignStatus.SUCCESSFUL);
      expect(ordersService.createOrdersForSuccessfulCampaign).toHaveBeenCalledWith(campaign);
      expect(ordersService.createOrderForParticipant).not.toHaveBeenCalled();
      expect(referralsService.completeReferralIfApplicable).toHaveBeenCalledWith(
        participant.userId.toString(),
      );
      expect(notificationsService.notify).toHaveBeenCalledWith(
        campaign.sellerId,
        NotificationType.CAMPAIGN_SUCCESSFUL,
        expect.any(String),
        expect.any(String),
        expect.any(Object),
      );
    });

    it('does not trigger SUCCESSFUL or order creation while still below the minimum', async () => {
      const campaign = makeCampaignDoc({ status: CampaignStatus.ACTIVE, minimumParticipants: 5 });
      const participant = { campaignId: campaign._id, orderId: null, userId: new Types.ObjectId() };
      participantsService.markAsPaid.mockResolvedValue(participant);
      campaignModel.findById.mockReturnValue({ exec: () => Promise.resolve(campaign) });
      participantsService.countPaid.mockResolvedValue(2);

      await service.confirmParticipantPayment('participant-1');

      expect(campaign.status).toBe(CampaignStatus.ACTIVE);
      expect(ordersService.createOrdersForSuccessfulCampaign).not.toHaveBeenCalled();
    });

    it('creates just one order for a later joiner paying after the campaign already succeeded', async () => {
      const campaign = makeCampaignDoc({ status: CampaignStatus.SUCCESSFUL });
      const participant = { campaignId: campaign._id, orderId: null, userId: new Types.ObjectId() };
      participantsService.markAsPaid.mockResolvedValue(participant);
      campaignModel.findById.mockReturnValue({ exec: () => Promise.resolve(campaign) });

      await service.confirmParticipantPayment('participant-1');

      expect(ordersService.createOrderForParticipant).toHaveBeenCalledWith(campaign, participant);
      expect(ordersService.createOrdersForSuccessfulCampaign).not.toHaveBeenCalled();
    });
  });

  describe('refundParticipant', () => {
    it('marks the linked order refunded when one exists', async () => {
      const orderId = new Types.ObjectId();
      participantsService.markAsRefunded.mockResolvedValue({ orderId });

      await service.refundParticipant('participant-1');

      expect(ordersService.markRefunded).toHaveBeenCalledWith(orderId.toString());
    });

    it('does nothing order-related when the participant never had an order', async () => {
      participantsService.markAsRefunded.mockResolvedValue({ orderId: null });

      await service.refundParticipant('participant-1');

      expect(ordersService.markRefunded).not.toHaveBeenCalled();
    });
  });

  describe('activateScheduledCampaigns', () => {
    it('activates every DRAFT campaign whose startDate has arrived', async () => {
      const scheduled = [
        makeCampaignDoc({ status: CampaignStatus.DRAFT }),
        makeCampaignDoc({ status: CampaignStatus.DRAFT }),
      ];
      campaignModel.find.mockReturnValue({ exec: () => Promise.resolve(scheduled) });

      await service.activateScheduledCampaigns();

      expect(scheduled[0].status).toBe(CampaignStatus.ACTIVE);
      expect(scheduled[1].status).toBe(CampaignStatus.ACTIVE);
    });
  });

  describe('processExpiredCampaigns', () => {
    it('fails a campaign that never reached its minimum and notifies everyone involved', async () => {
      const campaign = makeCampaignDoc({ status: CampaignStatus.ACTIVE, minimumParticipants: 5 });
      campaignModel.find.mockReturnValue({ exec: () => Promise.resolve([campaign]) });
      participantsService.countPaid.mockResolvedValue(2);

      const paidParticipant = { userId: new Types.ObjectId(), status: 'PAID' };
      const cancelledParticipant = { userId: new Types.ObjectId(), status: 'CANCELLED' };
      participantsService.cancelPendingAndListPaid.mockResolvedValue({
        paidParticipants: [paidParticipant],
        cancelledParticipants: [cancelledParticipant],
      });

      await service.processExpiredCampaigns();

      expect(campaign.status).toBe(CampaignStatus.FAILED);
      expect(participantsService.cancelPendingAndListPaid).toHaveBeenCalledWith(campaign._id);
      expect(notificationsService.notify).toHaveBeenCalledWith(
        paidParticipant.userId,
        NotificationType.CAMPAIGN_FAILED,
        expect.any(String),
        expect.any(String),
        expect.any(Object),
      );
      expect(notificationsService.notify).toHaveBeenCalledWith(
        cancelledParticipant.userId,
        NotificationType.CAMPAIGN_FAILED,
        expect.any(String),
        expect.any(String),
        expect.any(Object),
      );
      expect(notificationsService.notify).toHaveBeenCalledWith(
        campaign.sellerId,
        NotificationType.CAMPAIGN_FAILED,
        expect.any(String),
        expect.any(String),
        expect.any(Object),
      );
    });

    it('defensively succeeds an expired campaign that did reach its minimum after all', async () => {
      const campaign = makeCampaignDoc({ status: CampaignStatus.ACTIVE, minimumParticipants: 2 });
      campaignModel.find.mockReturnValue({ exec: () => Promise.resolve([campaign]) });
      participantsService.countPaid.mockResolvedValue(2);

      await service.processExpiredCampaigns();

      expect(campaign.status).toBe(CampaignStatus.SUCCESSFUL);
      expect(ordersService.createOrdersForSuccessfulCampaign).toHaveBeenCalledWith(campaign);
      expect(participantsService.cancelPendingAndListPaid).not.toHaveBeenCalled();
    });
  });

  describe('releaseExpiredReservations', () => {
    it('expires each stale PENDING reservation and frees its campaign slot', async () => {
      const campaignId = new Types.ObjectId();
      const expired = [
        { _id: new Types.ObjectId(), campaignId },
        { _id: new Types.ObjectId(), campaignId },
      ];
      participantsService.findExpiredPending.mockResolvedValue(expired);

      await service.releaseExpiredReservations();

      expect(participantsService.expireParticipant).toHaveBeenCalledTimes(2);
      expect(campaignModel.updateOne).toHaveBeenCalledWith(
        { _id: campaignId },
        { $inc: { currentParticipants: -1 } },
      );
      expect(campaignModel.updateOne).toHaveBeenCalledTimes(2);
    });
  });
});
