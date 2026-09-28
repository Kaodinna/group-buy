import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ReferralsService } from './referrals.service.js';
import { Referral } from './schemas/referral.schema.js';
import { UsersService } from '../users/users.service.js';
import { ReferralStatus } from '../../common/enums/referral-status.enum.js';

describe('ReferralsService', () => {
  let service: ReferralsService;
  let referralModel: {
    create: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
    countDocuments: ReturnType<typeof vi.fn>;
    aggregate: ReturnType<typeof vi.fn>;
  };
  let usersService: { findByReferralCode: ReturnType<typeof vi.fn>; findById: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    referralModel = {
      create: vi.fn(),
      findOne: vi.fn(),
      find: vi.fn(),
      countDocuments: vi.fn(),
      aggregate: vi.fn(),
    };
    usersService = { findByReferralCode: vi.fn(), findById: vi.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ReferralsService,
        { provide: getModelToken(Referral.name), useValue: referralModel },
        { provide: UsersService, useValue: usersService },
        { provide: ConfigService, useValue: { get: () => 'http://localhost:3000' } },
      ],
    }).compile();

    service = moduleRef.get(ReferralsService);
  });

  describe('completeReferralIfApplicable', () => {
    it('completes a pending referral and records a reward exactly once', async () => {
      const referral = {
        status: ReferralStatus.PENDING,
        reward: 0,
        rewardedAt: null,
        save: vi.fn(),
      };
      referralModel.findOne.mockReturnValue({ exec: () => Promise.resolve(referral) });

      await service.completeReferralIfApplicable(new Types.ObjectId().toString());

      expect(referral.status).toBe(ReferralStatus.COMPLETED);
      expect(referral.reward).toBeGreaterThan(0);
      expect(referral.rewardedAt).toBeInstanceOf(Date);
      expect(referral.save).toHaveBeenCalledOnce();
    });

    it('only ever looks for a still-PENDING referral, so a repeat call is a no-op', async () => {
      referralModel.findOne.mockReturnValue({ exec: () => Promise.resolve(null) });

      await service.completeReferralIfApplicable(new Types.ObjectId().toString());

      expect(referralModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ status: ReferralStatus.PENDING }),
      );
    });
  });

  describe('resolveReferrerByCode', () => {
    it('throws for an unknown code', async () => {
      usersService.findByReferralCode.mockResolvedValue(null);

      await expect(service.resolveReferrerByCode('NOPE')).rejects.toThrow(NotFoundException);
    });

    it('returns only public-safe fields for a known code', async () => {
      usersService.findByReferralCode.mockResolvedValue({
        firstName: 'Ada',
        lastName: 'Lovelace',
        avatar: null,
        referralCode: 'ADAX1234',
        email: 'ada@example.com',
        phone: '+2348000000000',
      });

      const result = await service.resolveReferrerByCode('ADAX1234');

      expect(result).toEqual({
        firstName: 'Ada',
        lastName: 'Lovelace',
        avatar: null,
        referralCode: 'ADAX1234',
      });
      expect(result).not.toHaveProperty('email');
      expect(result).not.toHaveProperty('phone');
    });
  });

  describe('getDashboard', () => {
    it('aggregates totals and builds the referral URL', async () => {
      usersService.findById.mockResolvedValue({ referralCode: 'ADAX1234' });
      const find = {
        populate: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        exec: () => Promise.resolve([{ _id: 'r1' }]),
      };
      referralModel.find.mockReturnValue(find);
      referralModel.countDocuments
        .mockReturnValueOnce({ exec: () => Promise.resolve(3) }) // total
        .mockReturnValueOnce({ exec: () => Promise.resolve(2) }); // completed
      referralModel.aggregate.mockReturnValue({ exec: () => Promise.resolve([{ _id: null, total: 2000 }]) });

      const result = await service.getDashboard(new Types.ObjectId().toString(), {});

      expect(result.referralCode).toBe('ADAX1234');
      expect(result.referralUrl).toBe('http://localhost:3000/join/ADAX1234');
      expect(result.totalReferrals).toBe(3);
      expect(result.completedReferrals).toBe(2);
      expect(result.pendingReferrals).toBe(1);
      expect(result.totalRewards).toBe(2000);
    });
  });
});
