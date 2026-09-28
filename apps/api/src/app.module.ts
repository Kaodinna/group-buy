import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './config/configuration.js';
import { validateEnv } from './config/env.validation.js';
import { DatabaseModule } from './database/database.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CategoriesModule } from './modules/categories/categories.module.js';
import { ProductsModule } from './modules/products/products.module.js';
import { ParticipantsModule } from './modules/participants/participants.module.js';
import { OrdersModule } from './modules/orders/orders.module.js';
import { ReferralsModule } from './modules/referrals/referrals.module.js';
import { GroupBuysModule } from './modules/group-buys/group-buys.module.js';
import { PaymentsModule } from './modules/payments/payments.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { AnalyticsModule } from './modules/analytics/analytics.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      load: [configuration],
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    ScheduleModule.forRoot(),
    DatabaseModule,
    UsersModule,
    AuthModule,
    CategoriesModule,
    ProductsModule,
    ParticipantsModule,
    OrdersModule,
    ReferralsModule,
    NotificationsModule,
    GroupBuysModule,
    PaymentsModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
