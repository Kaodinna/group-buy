import {
  ConflictException,
  ForbiddenException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { QueryFilter, Model, Types } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { Payment, PaymentDocument } from './schemas/payment.schema.js';
import { InitializePaymentDto } from './dto/initialize-payment.dto.js';
import { QueryPaymentsDto } from './dto/query-payments.dto.js';
import { PAYMENT_PROVIDERS, type PaymentProviderMap } from './providers/payment-providers.token.js';
import { ParticipantsService } from '../participants/participants.service.js';
import { CampaignsService } from '../group-buys/campaigns.service.js';
import { UsersService } from '../users/users.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PaymentStatus } from '../../common/enums/payment-status.enum.js';
import { PaymentProviderName } from '../../common/enums/payment-provider-name.enum.js';
import { ParticipantStatus } from '../../common/enums/participant-status.enum.js';
import { NotificationType } from '../../common/enums/notification-type.enum.js';
import { Role } from '../../common/enums/role.enum.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import type { PaginatedResult } from '../../common/interfaces/paginated-result.interface.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';

export interface InitializePaymentResult {
  reference: string;
  authorizationUrl: string;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<Payment>,
    @Inject(PAYMENT_PROVIDERS) private readonly providers: PaymentProviderMap,
    private readonly participantsService: ParticipantsService,
    private readonly campaignsService: CampaignsService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async initialize(
    userId: string,
    dto: InitializePaymentDto,
  ): Promise<InitializePaymentResult> {
    const participant = await this.participantsService.findById(dto.participantId);
    if (!participant) throw new NotFoundException('Reservation not found');

    if (participant.userId.toString() !== userId) {
      throw new ForbiddenException('This reservation does not belong to you');
    }
    if (participant.status !== ParticipantStatus.PENDING) {
      throw new ConflictException('This reservation is not awaiting payment');
    }
    if (participant.expiresAt.getTime() < Date.now()) {
      throw new ConflictException('This reservation has expired');
    }

    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    // Price is always the amount captured on the reservation at join time -
    // never anything the client could pass in here (Rule 4).
    const reference = this.generateReference();
    const provider = this.resolveProvider(dto.provider);

    // Call the provider BEFORE persisting anything: if this fails, the
    // caller can simply retry (a fresh reference is generated next time)
    // instead of being left with an orphaned Payment record and a
    // participant wrongly linked to a checkout that never existed.
    const result = await provider.initialize({
      email: user.email,
      amount: participant.totalAmount,
      reference,
      callbackUrl: `${this.configService.get<string>('corsOrigin')}/payments/callback`,
      metadata: {
        participantId: participant._id.toString(),
        campaignId: participant.campaignId.toString(),
      },
    });

    const payment = await this.paymentModel.create({
      userId: new Types.ObjectId(userId),
      campaignId: participant.campaignId,
      provider: dto.provider,
      reference,
      amount: participant.totalAmount,
      currency: 'NGN',
      status: PaymentStatus.PENDING,
      metadata: { participantId: participant._id.toString() },
    });

    await this.participantsService.linkPayment(participant._id.toString(), payment._id);

    return { reference: payment.reference, authorizationUrl: result.authorizationUrl };
  }

  async getByReference(reference: string, requester: AuthenticatedUser): Promise<PaymentDocument> {
    const payment = await this.paymentModel.findOne({ reference }).exec();
    if (!payment) throw new NotFoundException('Payment not found');

    const isOwner = payment.userId.toString() === requester.userId;
    if (!isOwner && requester.role !== Role.ADMIN) {
      throw new ForbiddenException('You do not have permission to view this payment');
    }

    return payment;
  }

  // Admin-only - the controller guards this route with @Roles(Role.ADMIN),
  // so no per-row scoping is needed here.
  async findAll(query: QueryPaymentsDto): Promise<PaginatedResult<PaymentDocument>> {
    const filter: QueryFilter<Payment> = {};
    if (query.status) filter.status = query.status;
    if (query.provider) filter.provider = query.provider;

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [items, total] = await Promise.all([
      this.paymentModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.paymentModel.countDocuments(filter).exec(),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }

  /**
   * Handles a provider webhook. Every step is deliberately paranoid:
   *  1. Signature must verify against the raw body bytes.
   *  2. The reference must belong to a payment we actually created.
   *  3. A payment already out of PENDING is a no-op - covers duplicate
   *     webhook deliveries from the provider (Section 22, Rule 7).
   *  4. The webhook payload is NEVER trusted for the final verdict - we
   *     always re-check with the provider's verify API (Rule 5).
   */
  async handleWebhook(
    providerName: PaymentProviderName,
    rawBody: Buffer,
    signature: string | undefined,
    parsedBody: unknown,
  ): Promise<void> {
    const provider = this.resolveProvider(providerName);

    if (!provider.verifyWebhookSignature(rawBody, signature)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const event = provider.parseWebhookEvent(parsedBody);
    if (!event) {
      // An event type we don't act on (e.g. a transfer event) - nothing to do.
      return;
    }

    const payment = await this.paymentModel.findOne({ reference: event.reference }).exec();
    if (!payment) {
      this.logger.warn(`Webhook for unknown payment reference: ${event.reference}`);
      return;
    }

    if (payment.status !== PaymentStatus.PENDING) {
      // Already processed (duplicate delivery, or a stale/out-of-order event) - idempotent no-op.
      return;
    }

    if (event.status !== 'success') {
      payment.status = PaymentStatus.FAILED;
      await payment.save();
      return;
    }

    const verification = await provider.verify(event.reference);
    if (verification.status !== 'success' || verification.amount !== payment.amount) {
      payment.status = PaymentStatus.FAILED;
      payment.metadata = { ...payment.metadata, verificationFailure: verification.raw };
      await payment.save();
      return;
    }

    payment.status = PaymentStatus.SUCCESS;
    payment.paidAt = verification.paidAt ?? new Date();
    payment.metadata = {
      ...payment.metadata,
      providerTransactionId: verification.providerTransactionId,
    };
    await payment.save();

    await this.notificationsService.notify(
      payment.userId,
      NotificationType.PAYMENT_SUCCESSFUL,
      'Payment successful',
      `Your payment of ${payment.currency} ${payment.amount.toLocaleString()} was successful.`,
      { paymentId: payment._id.toString(), reference: payment.reference },
    );

    const participantId = payment.metadata.participantId as string | undefined;
    if (participantId) {
      await this.campaignsService.confirmParticipantPayment(participantId);
    }
  }

  async refund(paymentId: string, requester: AuthenticatedUser): Promise<PaymentDocument> {
    if (requester.role !== Role.ADMIN) {
      throw new ForbiddenException('Only an admin can issue a refund');
    }

    const payment = await this.paymentModel.findById(paymentId).exec();
    if (!payment) throw new NotFoundException('Payment not found');

    if (payment.status === PaymentStatus.REFUNDED) {
      // Idempotent: a repeated refund request is not an error (Rule 7).
      return payment;
    }
    if (payment.status !== PaymentStatus.SUCCESS) {
      throw new AppException(
        'Only a successful payment can be refunded',
        'PAYMENT_NOT_REFUNDABLE',
        HttpStatus.CONFLICT,
      );
    }

    const provider = this.resolveProvider(payment.provider);
    const providerTransactionId = payment.metadata.providerTransactionId as string | undefined;
    const result = await provider.refund(payment.reference, providerTransactionId);

    if (result.status !== 'success') {
      throw new AppException(
        'The payment provider was unable to process this refund',
        'REFUND_FAILED',
        HttpStatus.BAD_GATEWAY,
      );
    }

    payment.status = PaymentStatus.REFUNDED;
    payment.metadata = { ...payment.metadata, refund: result.raw };
    await payment.save();

    await this.notificationsService.notify(
      payment.userId,
      NotificationType.REFUND_PROCESSED,
      'Refund processed',
      `Your refund of ${payment.currency} ${payment.amount.toLocaleString()} has been processed.`,
      { paymentId: payment._id.toString(), reference: payment.reference },
    );

    const participantId = payment.metadata.participantId as string | undefined;
    if (participantId) {
      await this.campaignsService.refundParticipant(participantId);
    }

    return payment;
  }

  private resolveProvider(name: PaymentProviderName) {
    return this.providers[name];
  }

  private generateReference(): string {
    return `gb_${randomUUID().replace(/-/g, '')}`;
  }
}
