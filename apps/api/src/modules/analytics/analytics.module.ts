import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../users/schemas/user.schema.js';
import { GroupBuyCampaign, GroupBuyCampaignSchema } from '../group-buys/schemas/campaign.schema.js';
import { Order, OrderSchema } from '../orders/schemas/order.schema.js';
import { Payment, PaymentSchema } from '../payments/schemas/payment.schema.js';
import { AnalyticsService } from './analytics.service.js';
import { AnalyticsController } from './analytics.controller.js';

// Registers the schemas it needs to report on directly (a standard pattern
// for a cross-cutting reporting module) rather than depending on each
// feature module, which would pull in unrelated business logic/DI graphs
// just to run read-only aggregations.
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: GroupBuyCampaign.name, schema: GroupBuyCampaignSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Payment.name, schema: PaymentSchema },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
