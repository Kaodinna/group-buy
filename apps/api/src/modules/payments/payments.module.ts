import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Payment, PaymentSchema } from './schemas/payment.schema.js';
import { PaymentsService } from './payments.service.js';
import { PaymentsController } from './payments.controller.js';
import { PaystackProvider } from './providers/paystack.provider.js';
import { FlutterwaveProvider } from './providers/flutterwave.provider.js';
import { PAYMENT_PROVIDERS } from './providers/payment-providers.token.js';
import { PaymentProviderName } from '../../common/enums/payment-provider-name.enum.js';
import { ParticipantsModule } from '../participants/participants.module.js';
import { GroupBuysModule } from '../group-buys/group-buys.module.js';
import { UsersModule } from '../users/users.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Payment.name, schema: PaymentSchema }]),
    ParticipantsModule,
    GroupBuysModule,
    UsersModule,
    NotificationsModule,
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PaystackProvider,
    FlutterwaveProvider,
    {
      provide: PAYMENT_PROVIDERS,
      useFactory: (paystack: PaystackProvider, flutterwave: FlutterwaveProvider) => ({
        [PaymentProviderName.PAYSTACK]: paystack,
        [PaymentProviderName.FLUTTERWAVE]: flutterwave,
      }),
      inject: [PaystackProvider, FlutterwaveProvider],
    },
  ],
})
export class PaymentsModule {}
