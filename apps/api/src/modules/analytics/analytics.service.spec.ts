import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AnalyticsService } from './analytics.service.js';
import { User } from '../users/schemas/user.schema.js';
import { GroupBuyCampaign } from '../group-buys/schemas/campaign.schema.js';
import { Order } from '../orders/schemas/order.schema.js';
import { Payment } from '../payments/schemas/payment.schema.js';

function makeModel(overrides: Record<string, unknown> = {}) {
  return {
    countDocuments: () => Promise.resolve(0),
    aggregate: () => Promise.resolve([]),
    ...overrides,
  };
}

describe('AnalyticsService', () => {
  let userModel: ReturnType<typeof makeModel>;
  let campaignModel: ReturnType<typeof makeModel>;
  let orderModel: ReturnType<typeof makeModel>;
  let paymentModel: ReturnType<typeof makeModel>;
  let service: AnalyticsService;

  beforeEach(async () => {
    userModel = makeModel();
    campaignModel = makeModel();
    orderModel = makeModel();
    paymentModel = makeModel();

    const moduleRef = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: getModelToken(GroupBuyCampaign.name), useValue: campaignModel },
        { provide: getModelToken(Order.name), useValue: orderModel },
        { provide: getModelToken(Payment.name), useValue: paymentModel },
      ],
    }).compile();

    service = moduleRef.get(AnalyticsService);
  });

  describe('getAdminAnalytics', () => {
    it('does not divide by zero when no campaigns have settled yet', async () => {
      const result = await service.getAdminAnalytics();

      expect(result.conversionRate).toBe(0);
      expect(result.averageGroupSize).toBe(0);
    });

    it('computes conversion rate from settled (successful + failed) campaigns only', async () => {
      let call = 0;
      // Call order in the service: activeGroupBuys, successfulGroupBuys, failedGroupBuys (after the two user counts).
      campaignModel.countDocuments = () => {
        call += 1;
        if (call === 1) return Promise.resolve(2); // activeGroupBuys
        if (call === 2) return Promise.resolve(6); // successfulGroupBuys
        if (call === 3) return Promise.resolve(2); // failedGroupBuys
        return Promise.resolve(0);
      };

      const result = await service.getAdminAnalytics();

      // 6 successful / (6 successful + 2 failed) = 75%, ignoring the 2 still-active ones.
      expect(result.conversionRate).toBe(75);
    });

    it('rounds average group size to one decimal place', async () => {
      campaignModel.aggregate = () => Promise.resolve([{ _id: null, avg: 7.849 }]);

      const result = await service.getAdminAnalytics();

      expect(result.averageGroupSize).toBe(7.8);
    });
  });

  describe('getSellerAnalytics', () => {
    it('does not divide by zero when the seller has no campaigns', async () => {
      const result = await service.getSellerAnalytics('507f1f77bcf86cd799439011');

      expect(result.averageParticipantsPerCampaign).toBe(0);
    });

    it('rounds average participants per campaign', async () => {
      let call = 0;
      campaignModel.countDocuments = () => {
        call += 1;
        return Promise.resolve(call <= 3 ? 0 : 3); // last call is the total campaign count
      };
      campaignModel.aggregate = () => Promise.resolve([{ _id: null, total: 10 }]);

      const result = await service.getSellerAnalytics('507f1f77bcf86cd799439011');

      // 10 total participants / 3 campaigns = 3.33 -> rounds to 3
      expect(result.averageParticipantsPerCampaign).toBe(3);
    });
  });
});
