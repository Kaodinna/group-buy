import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './schemas/order.schema.js';
import { OrdersService } from './orders.service.js';
import { OrdersController } from './orders.controller.js';
import { ParticipantsModule } from '../participants/participants.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    ParticipantsModule,
    NotificationsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
