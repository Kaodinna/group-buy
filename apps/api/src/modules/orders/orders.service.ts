import { ForbiddenException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { QueryFilter, Model, Types } from 'mongoose';
import { Order, OrderDocument } from './schemas/order.schema.js';
import { QueryOrdersDto } from './dto/query-orders.dto.js';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';
import { ParticipantsService } from '../participants/participants.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { OrderPaymentStatus } from '../../common/enums/order-payment-status.enum.js';
import { OrderStatus } from '../../common/enums/order-status.enum.js';
import { Role } from '../../common/enums/role.enum.js';
import { NotificationType } from '../../common/enums/notification-type.enum.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import type { PaginatedResult } from '../../common/interfaces/paginated-result.interface.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import type { CampaignDocument } from '../group-buys/schemas/campaign.schema.js';
import type { ParticipantDocument } from '../participants/schemas/participant.schema.js';

const CANCELLABLE_STATUSES = [OrderStatus.PENDING, OrderStatus.PROCESSING];

// Ordinal rank of each fulfillment step - lets updateStatus reject a
// backward or repeated transition without hardcoding every valid pair.
const STATUS_RANK: Record<OrderStatus, number> = {
  [OrderStatus.PENDING]: 0,
  [OrderStatus.PROCESSING]: 1,
  [OrderStatus.SHIPPED]: 2,
  [OrderStatus.DELIVERED]: 3,
  [OrderStatus.CANCELLED]: -1,
};

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    private readonly participantsService: ParticipantsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Idempotent: if this participant already has an order (e.g. a duplicate
   * payment-confirmation call), returns the existing one instead of
   * creating a second (Rule: never create duplicate orders/participants
   * from repeated events).
   */
  async createOrderForParticipant(
    campaign: CampaignDocument,
    participant: ParticipantDocument,
  ): Promise<OrderDocument> {
    if (participant.orderId) {
      const existing = await this.orderModel.findById(participant.orderId).exec();
      if (existing) return existing;
    }

    const quantity = participant.quantity;
    const subtotal = campaign.originalPrice * quantity;
    const discount = (campaign.originalPrice - campaign.groupPrice) * quantity;
    const shippingFee = 0;
    const totalAmount = subtotal - discount + shippingFee;

    const order = await this.orderModel.create({
      userId: participant.userId,
      campaignId: campaign._id,
      productId: campaign.productId,
      sellerId: campaign.sellerId,
      items: [
        {
          productId: campaign.productId,
          name: campaign.title,
          image: campaign.image ?? null,
          quantity,
          unitPrice: participant.unitPrice,
          totalPrice: participant.totalAmount,
        },
      ],
      subtotal,
      discount,
      shippingFee,
      totalAmount,
      currency: campaign.currency,
      paymentStatus: OrderPaymentStatus.PAID,
      orderStatus: OrderStatus.PENDING,
      shippingAddress: participant.shippingAddress ?? null,
    });

    await this.participantsService.linkOrder(participant._id.toString(), order._id);
    return order;
  }

  /** Batch-creates orders for every already-paid participant the moment a campaign succeeds. */
  async createOrdersForSuccessfulCampaign(campaign: CampaignDocument): Promise<void> {
    const paidParticipants = await this.participantsService.findPaidWithoutOrder(campaign._id);
    for (const participant of paidParticipants) {
      await this.createOrderForParticipant(campaign, participant);
    }
  }

  async markRefunded(orderId: string): Promise<void> {
    await this.orderModel
      .updateOne(
        { _id: orderId },
        { $set: { paymentStatus: OrderPaymentStatus.REFUNDED, orderStatus: OrderStatus.CANCELLED } },
      )
      .exec();
  }

  async findAll(
    query: QueryOrdersDto,
    requester: AuthenticatedUser,
  ): Promise<PaginatedResult<OrderDocument>> {
    const filter: QueryFilter<Order> = {};

    // Orders are never public: customers see their own purchases, sellers
    // see their own sales, admins see everything (optionally scoped).
    if (requester.role === Role.CUSTOMER) {
      filter.userId = new Types.ObjectId(requester.userId);
    } else if (requester.role === Role.SELLER) {
      filter.sellerId = new Types.ObjectId(requester.userId);
    } else if (query.userId) {
      filter.userId = new Types.ObjectId(query.userId);
    } else if (query.sellerId) {
      filter.sellerId = new Types.ObjectId(query.sellerId);
    }

    if (query.orderStatus) filter.orderStatus = query.orderStatus;
    if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;

    const page = query.page ?? 1;
    const limit = query.limit ?? 12;

    const [items, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .populate('userId', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.orderModel.countDocuments(filter).exec(),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }

  async findById(id: string, requester: AuthenticatedUser): Promise<OrderDocument> {
    const order = await this.orderModel.findById(id).exec();
    if (!order || !this.isVisibleTo(order, requester)) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  async cancel(id: string, requester: AuthenticatedUser): Promise<OrderDocument> {
    const order = await this.orderModel.findById(id).exec();
    if (!order) throw new NotFoundException('Order not found');

    const isOwner = order.userId.toString() === requester.userId;
    if (!isOwner && requester.role !== Role.ADMIN) {
      throw new ForbiddenException('You do not have permission to cancel this order');
    }

    if (!CANCELLABLE_STATUSES.includes(order.orderStatus)) {
      throw new AppException(
        `An order that is already ${order.orderStatus.toLowerCase()} cannot be cancelled`,
        'ORDER_NOT_CANCELLABLE',
        HttpStatus.CONFLICT,
      );
    }

    order.orderStatus = OrderStatus.CANCELLED;
    await order.save();
    return order;
  }

  async updateStatus(
    id: string,
    dto: UpdateOrderStatusDto,
    requester: AuthenticatedUser,
  ): Promise<OrderDocument> {
    const order = await this.orderModel.findById(id).exec();
    if (!order) throw new NotFoundException('Order not found');

    const isOwningSeller = order.sellerId.toString() === requester.userId;
    if (requester.role !== Role.ADMIN && !(requester.role === Role.SELLER && isOwningSeller)) {
      throw new ForbiddenException('You do not have permission to update this order');
    }

    if (order.orderStatus === OrderStatus.CANCELLED) {
      throw new AppException(
        'A cancelled order cannot be updated',
        'ORDER_NOT_UPDATABLE',
        HttpStatus.CONFLICT,
      );
    }

    if (STATUS_RANK[dto.orderStatus] <= STATUS_RANK[order.orderStatus]) {
      throw new AppException(
        `Cannot move an order from ${order.orderStatus} to ${dto.orderStatus}`,
        'INVALID_ORDER_STATUS_TRANSITION',
        HttpStatus.CONFLICT,
      );
    }

    order.orderStatus = dto.orderStatus;
    await order.save();

    if (dto.orderStatus === OrderStatus.SHIPPED) {
      await this.notificationsService.notify(
        order.userId,
        NotificationType.ORDER_SHIPPED,
        'Order shipped',
        `Your order for "${order.items[0]?.name ?? 'your item'}" has shipped.`,
        { orderId: order._id.toString() },
      );
    } else if (dto.orderStatus === OrderStatus.DELIVERED) {
      await this.notificationsService.notify(
        order.userId,
        NotificationType.ORDER_DELIVERED,
        'Order delivered',
        `Your order for "${order.items[0]?.name ?? 'your item'}" has been delivered.`,
        { orderId: order._id.toString() },
      );
    }

    return order;
  }

  private isVisibleTo(order: OrderDocument, requester: AuthenticatedUser): boolean {
    if (requester.role === Role.ADMIN) return true;
    if (order.userId.toString() === requester.userId) return true;
    if (order.sellerId.toString() === requester.userId) return true;
    return false;
  }
}
