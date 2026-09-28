import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GroupBuyCampaign, GroupBuyCampaignSchema } from './schemas/campaign.schema.js';
import { CampaignsService } from './campaigns.service.js';
import { CampaignsController } from './campaigns.controller.js';
import { CampaignStateService } from './campaign-state.service.js';
import { CampaignSchedulerService } from './campaign-scheduler.service.js';
import { ParticipantsModule } from '../participants/participants.module.js';
import { ProductsModule } from '../products/products.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { ReferralsModule } from '../referrals/referrals.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: GroupBuyCampaign.name, schema: GroupBuyCampaignSchema }]),
    ParticipantsModule,
    ProductsModule,
    OrdersModule,
    ReferralsModule,
    NotificationsModule,
  ],
  controllers: [CampaignsController],
  providers: [CampaignsService, CampaignStateService, CampaignSchedulerService],
  exports: [CampaignsService, CampaignStateService],
})
export class GroupBuysModule {}
