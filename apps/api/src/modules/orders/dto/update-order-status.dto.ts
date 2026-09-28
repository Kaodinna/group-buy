import { IsIn } from 'class-validator';
import { OrderStatus } from '../../../common/enums/order-status.enum.js';

// PENDING is the initial state and CANCELLED has its own dedicated endpoint -
// this DTO only covers the forward fulfillment steps a seller/admin drives.
const UPDATABLE_STATUSES = [
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
] as const;

export class UpdateOrderStatusDto {
  @IsIn(UPDATABLE_STATUSES)
  orderStatus!: OrderStatus;
}
