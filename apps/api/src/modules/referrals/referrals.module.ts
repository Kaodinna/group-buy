import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Referral, ReferralSchema } from './schemas/referral.schema.js';
import { ReferralsService } from './referrals.service.js';
import { ReferralsController } from './referrals.controller.js';
import { UsersModule } from '../users/users.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Referral.name, schema: ReferralSchema }]),
    UsersModule,
  ],
  controllers: [ReferralsController],
  providers: [ReferralsService],
  exports: [ReferralsService],
})
export class ReferralsModule {}
