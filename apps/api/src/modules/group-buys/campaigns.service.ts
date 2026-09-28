import {
  BadRequestException,
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { QueryFilter, Model, Types } from 'mongoose';
import { GroupBuyCampaign, CampaignDocument } from './schemas/campaign.schema.js';
import { CreateCampaignDto } from './dto/create-campaign.dto.js';
import { UpdateCampaignDto } from './dto/update-campaign.dto.js';
import { QueryCampaignsDto } from './dto/query-campaigns.dto.js';
import { CampaignStateService } from './campaign-state.service.js';
import { ParticipantsService } from '../participants/participants.service.js';
import { ProductsService } from '../products/products.service.js';
import { OrdersService } from '../orders/orders.service.js';
import { ReferralsService } from '../referrals/referrals.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { CampaignStatus } from '../../common/enums/campaign-status.enum.js';
import { ProductStatus } from '../../common/enums/product-status.enum.js';
import { ParticipantStatus } from '../../common/enums/participant-status.enum.js';
import { NotificationType } from '../../common/enums/notification-type.enum.js';
import { Role } from '../../common/enums/role.enum.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import { slugify, randomSlugSuffix } from '../../common/utils/slugify.util.js';
import type { PaginatedResult } from '../../common/interfaces/paginated-result.interface.js';
import type { ShippingAddressDto } from '../../common/dto/shipping-address.dto.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import type { ParticipantDocument } from '../participants/schemas/participant.schema.js';

const PUBLIC_STATUSES = [
  CampaignStatus.ACTIVE,
  CampaignStatus.SUCCESSFUL,
  CampaignStatus.FAILED,
  CampaignStatus.COMPLETED,
];

const CRITICAL_FIELDS = [
  'groupPrice',
  'minimumParticipants',
  'maximumParticipants',
  'startDate',
  'endDate',
  'paymentDeadline',
] as const;

const RESERVATION_WINDOW_MS = 30 * 60 * 1000;

@Injectable()
export class CampaignsService {
  constructor(
    @InjectModel(GroupBuyCampaign.name) private campaignModel: Model<GroupBuyCampaign>,
    private readonly campaignStateService: CampaignStateService,
    private readonly participantsService: ParticipantsService,
    private readonly productsService: ProductsService,
    private readonly ordersService: OrdersService,
    private readonly referralsService: ReferralsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateCampaignDto, requester: AuthenticatedUser): Promise<CampaignDocument> {
    const product = await this.productsService.findByIdOrSlug(dto.productId, requester);

    const isOwner = product.sellerId.toString() === requester.userId;
    if (!isOwner && requester.role !== Role.ADMIN) {
      throw new ForbiddenException('You do not own this product');
    }
    if (product.status !== ProductStatus.ACTIVE) {
      throw new BadRequestException(
        'Product must be approved before it can be used in a campaign',
      );
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    const paymentDeadline = dto.paymentDeadline ? new Date(dto.paymentDeadline) : null;
    const now = new Date();

    if (dto.groupPrice >= product.originalPrice) {
      throw new BadRequestException('Group price must be less than the original price');
    }
    if (dto.maximumParticipants < dto.minimumParticipants) {
      throw new BadRequestException(
        'Maximum participants must be greater than or equal to minimum participants',
      );
    }
    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }
    if (endDate <= now) {
      throw new BadRequestException('End date must be in the future');
    }
    if (paymentDeadline && paymentDeadline > endDate) {
      throw new BadRequestException('Payment deadline cannot be after the campaign end date');
    }

    const slug = await this.generateUniqueSlug(dto.title);

    const campaign = await this.campaignModel.create({
      productId: product._id,
      sellerId: product.sellerId,
      categoryId: product.categoryId,
      title: dto.title,
      slug,
      description: dto.description,
      originalPrice: product.originalPrice,
      groupPrice: dto.groupPrice,
      minimumParticipants: dto.minimumParticipants,
      maximumParticipants: dto.maximumParticipants,
      startDate,
      endDate,
      paymentDeadline,
      image: dto.image ?? null,
      shippingInfo: dto.shippingInfo ?? null,
      status: CampaignStatus.DRAFT,
    });

    // Common case: an immediately-running campaign. A campaign scheduled to
    // start later stays DRAFT until a background job (Phase 8) activates it.
    if (startDate <= now) {
      return this.campaignStateService.transition(campaign, CampaignStatus.ACTIVE);
    }

    return campaign;
  }

  async findAll(
    query: QueryCampaignsDto,
    requester?: AuthenticatedUser,
  ): Promise<PaginatedResult<CampaignDocument>> {
    const filter: QueryFilter<GroupBuyCampaign> = {};

    if (query.categoryId) filter.categoryId = new Types.ObjectId(query.categoryId);
    if (query.sellerId) filter.sellerId = new Types.ObjectId(query.sellerId);
    if (query.search) filter.$text = { $search: query.search };

    if (query.minPrice || query.maxPrice) {
      filter.groupPrice = {
        ...(query.minPrice ? { $gte: query.minPrice } : {}),
        ...(query.maxPrice ? { $lte: query.maxPrice } : {}),
      };
    }

    this.applyVisibilityScope(filter, query.status, requester, query.sellerId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 12;
    const sort = this.resolveSort(query.sort);

    const [items, total] = await Promise.all([
      this.campaignModel
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.campaignModel.countDocuments(filter).exec(),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }

  async findByIdOrSlug(
    idOrSlug: string,
    requester?: AuthenticatedUser,
  ): Promise<CampaignDocument> {
    const isObjectId = Types.ObjectId.isValid(idOrSlug);
    const campaign = await this.campaignModel
      .findOne(isObjectId ? { _id: idOrSlug } : { slug: idOrSlug })
      .exec();

    if (!campaign || !this.isVisibleTo(campaign, requester)) {
      throw new NotFoundException('Campaign not found');
    }

    return campaign;
  }

  async update(
    id: string,
    dto: UpdateCampaignDto,
    requester: AuthenticatedUser,
  ): Promise<CampaignDocument> {
    const campaign = await this.findOwnedOrAdmin(id, requester);
    const isDraft = campaign.status === CampaignStatus.DRAFT;

    for (const field of CRITICAL_FIELDS) {
      if (dto[field] !== undefined && !isDraft) {
        throw new AppException(
          `Cannot change ${field} once a campaign has left DRAFT status`,
          'CAMPAIGN_LOCKED',
          HttpStatus.CONFLICT,
        );
      }
    }

    if (dto.title !== undefined) campaign.title = dto.title;
    if (dto.description !== undefined) campaign.description = dto.description;
    if (dto.image !== undefined) campaign.image = dto.image;
    if (dto.shippingInfo !== undefined) campaign.shippingInfo = dto.shippingInfo;

    if (isDraft) {
      if (dto.groupPrice !== undefined) campaign.groupPrice = dto.groupPrice;
      if (dto.minimumParticipants !== undefined) {
        campaign.minimumParticipants = dto.minimumParticipants;
      }
      if (dto.maximumParticipants !== undefined) {
        campaign.maximumParticipants = dto.maximumParticipants;
      }
      if (dto.startDate !== undefined) campaign.startDate = new Date(dto.startDate);
      if (dto.endDate !== undefined) campaign.endDate = new Date(dto.endDate);
      if (dto.paymentDeadline !== undefined) {
        campaign.paymentDeadline = new Date(dto.paymentDeadline);
      }

      if (campaign.groupPrice >= campaign.originalPrice) {
        throw new BadRequestException('Group price must be less than the original price');
      }
      if (campaign.maximumParticipants < campaign.minimumParticipants) {
        throw new BadRequestException(
          'Maximum participants must be greater than or equal to minimum participants',
        );
      }
      if (campaign.endDate <= campaign.startDate) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    await campaign.save();
    return campaign;
  }

  async remove(id: string, requester: AuthenticatedUser): Promise<void> {
    const campaign = await this.findOwnedOrAdmin(id, requester);

    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new AppException(
        'Only draft campaigns can be deleted - cancel an active campaign instead',
        'CAMPAIGN_NOT_DRAFT',
        HttpStatus.CONFLICT,
      );
    }

    await this.campaignModel.deleteOne({ _id: campaign._id }).exec();
  }

  async cancel(id: string, requester: AuthenticatedUser): Promise<CampaignDocument> {
    const campaign = await this.findOwnedOrAdmin(id, requester);
    await this.campaignStateService.transition(campaign, CampaignStatus.CANCELLED);

    // Unpaid reservations are cancelled immediately; already-paid ones are
    // left for Phase 5's refund flow to pick up and settle.
    await this.participantsService.cancelPendingAndListPaid(campaign._id);

    return campaign;
  }

  async listParticipants(id: string, requester: AuthenticatedUser): Promise<ParticipantDocument[]> {
    await this.findOwnedOrAdmin(id, requester);
    return this.participantsService.findByCampaign(id);
  }

  /**
   * Called by PaymentsService once a provider has independently confirmed a
   * charge succeeded (never on the webhook payload alone - Rule 5). This is
   * the only place SUCCESSFUL gets triggered, per the payment flow in the
   * spec: reservations alone never count toward the minimum, only paid ones.
   *
   * Order creation follows the same rule: a paid reservation only becomes a
   * real Order once we know the deal is actually happening.
   *  - If this payment is what pushes the campaign over the minimum, every
   *    already-paid participant gets their order created in one batch.
   *  - If the campaign had already succeeded (a later joiner, still within
   *    maximumParticipants), just this one participant's order is created.
   *  - If the campaign is still short of the minimum, no order yet - it'll
   *    be picked up by the batch once/if the campaign does succeed.
   */
  async confirmParticipantPayment(participantId: string): Promise<ParticipantDocument> {
    const participant = await this.participantsService.markAsPaid(participantId);

    // A referral only converts on the referred user's first real purchase,
    // never on registration alone - see ReferralsService for the guard.
    await this.referralsService.completeReferralIfApplicable(participant.userId.toString());

    const campaign = await this.campaignModel.findById(participant.campaignId).exec();
    if (!campaign) return participant;

    if (campaign.status === CampaignStatus.ACTIVE) {
      const paidCount = await this.participantsService.countPaid(campaign._id);
      if (paidCount >= campaign.minimumParticipants) {
        await this.campaignStateService.transition(campaign, CampaignStatus.SUCCESSFUL);
        await this.ordersService.createOrdersForSuccessfulCampaign(campaign);
        await this.notifyCampaignSuccessful(campaign);
      }
    } else if (campaign.status === CampaignStatus.SUCCESSFUL) {
      await this.ordersService.createOrderForParticipant(campaign, participant);
    }

    return participant;
  }

  /** Called by PaymentsService once a refund has actually been processed. */
  async refundParticipant(participantId: string): Promise<ParticipantDocument> {
    const participant = await this.participantsService.markAsRefunded(participantId);
    if (participant.orderId) {
      await this.ordersService.markRefunded(participant.orderId.toString());
    }
    return participant;
  }

  async join(
    campaignId: string,
    requester: AuthenticatedUser,
    shippingAddress?: ShippingAddressDto,
  ): Promise<ParticipantDocument> {
    if (!Types.ObjectId.isValid(campaignId)) {
      throw new NotFoundException('Campaign not found');
    }

    const now = new Date();

    const existing = await this.participantsService.findActiveByCampaignAndUser(
      new Types.ObjectId(campaignId),
      requester.userId,
    );
    if (existing) {
      throw new AppException(
        'You have already joined this campaign',
        'ALREADY_JOINED',
        HttpStatus.CONFLICT,
      );
    }

    // Best-effort pre-checks for a specific, friendly error message. The
    // atomic findOneAndUpdate below is what actually guarantees correctness
    // under concurrent joins (Section 13) - these checks can race and be
    // stale, but the update's own filter can't.
    const preCheck = await this.campaignModel.findById(campaignId).exec();
    if (!preCheck) throw new NotFoundException('Campaign not found');

    if (preCheck.sellerId.toString() === requester.userId) {
      throw new ForbiddenException('You cannot join your own campaign');
    }
    if (![CampaignStatus.ACTIVE, CampaignStatus.SUCCESSFUL].includes(preCheck.status)) {
      throw new AppException(
        'This campaign is not open for joining',
        'CAMPAIGN_NOT_JOINABLE',
        HttpStatus.CONFLICT,
      );
    }
    if (now < preCheck.startDate || now >= preCheck.endDate) {
      throw new AppException(
        'This campaign is not currently active',
        'CAMPAIGN_NOT_ACTIVE',
        HttpStatus.CONFLICT,
      );
    }

    let product;
    try {
      product = await this.productsService.findByIdOrSlug(preCheck.productId.toString(), requester);
    } catch {
      throw new AppException(
        'This product is no longer available',
        'PRODUCT_UNAVAILABLE',
        HttpStatus.CONFLICT,
      );
    }
    if (product.stock < 1) {
      throw new AppException(
        'This product is currently out of stock',
        'OUT_OF_STOCK',
        HttpStatus.CONFLICT,
      );
    }

    const campaign = await this.campaignModel
      .findOneAndUpdate(
        {
          _id: campaignId,
          status: { $in: [CampaignStatus.ACTIVE, CampaignStatus.SUCCESSFUL] },
          startDate: { $lte: now },
          endDate: { $gt: now },
          $expr: { $lt: ['$currentParticipants', '$maximumParticipants'] },
        },
        { $inc: { currentParticipants: 1 } },
        { returnDocument: 'after' },
      )
      .exec();

    if (!campaign) {
      throw new AppException(
        'This campaign is full or no longer accepting participants',
        'CAMPAIGN_FULL',
        HttpStatus.CONFLICT,
      );
    }

    await this.notifyIfAlmostComplete(campaign);

    try {
      return await this.participantsService.create({
        campaignId: campaign._id,
        userId: new Types.ObjectId(requester.userId),
        unitPrice: campaign.groupPrice,
        expiresAt: this.computeReservationExpiry(campaign, now),
        shippingAddress,
      });
    } catch (error) {
      // Release the slot we just claimed - most likely a duplicate-key race
      // where two requests from the same user slipped past the pre-check.
      await this.campaignModel
        .updateOne({ _id: campaign._id }, { $inc: { currentParticipants: -1 } })
        .exec();

      if (this.isDuplicateKeyError(error)) {
        throw new AppException(
          'You have already joined this campaign',
          'ALREADY_JOINED',
          HttpStatus.CONFLICT,
        );
      }
      throw error;
    }
  }

  /** Activates DRAFT campaigns whose scheduled startDate has now arrived. */
  async activateScheduledCampaigns(): Promise<void> {
    const now = new Date();
    const scheduled = await this.campaignModel
      .find({ status: CampaignStatus.DRAFT, startDate: { $lte: now } })
      .exec();

    for (const campaign of scheduled) {
      await this.campaignStateService.transition(campaign, CampaignStatus.ACTIVE);
    }
  }

  /**
   * Scans for campaigns whose endDate has passed while still ACTIVE and
   * settles them one way or the other. Meant to be driven by a periodic
   * background job (CampaignSchedulerService), not called from a request.
   *
   * Reaching SUCCESSFUL here should be rare in practice - confirmParticipant
   * Payment already flips the status the moment the minimum is crossed in
   * real time - but this is a defensive fallback for any edge case where
   * that never fired (e.g. a payment confirmed right at the wire).
   */
  async processExpiredCampaigns(): Promise<void> {
    const now = new Date();
    const expired = await this.campaignModel
      .find({ status: CampaignStatus.ACTIVE, endDate: { $lt: now } })
      .exec();

    for (const campaign of expired) {
      const paidCount = await this.participantsService.countPaid(campaign._id);

      if (paidCount >= campaign.minimumParticipants) {
        await this.campaignStateService.transition(campaign, CampaignStatus.SUCCESSFUL);
        await this.ordersService.createOrdersForSuccessfulCampaign(campaign);
        await this.notifyCampaignSuccessful(campaign);
        continue;
      }

      await this.campaignStateService.transition(campaign, CampaignStatus.FAILED);
      const { paidParticipants, cancelledParticipants } =
        await this.participantsService.cancelPendingAndListPaid(campaign._id);
      await this.notifyCampaignFailed(campaign, [...paidParticipants, ...cancelledParticipants]);
    }
  }

  /** Releases PENDING reservations whose payment window has passed, freeing
   * their slot back up. Meant to be driven by a periodic background job. */
  async releaseExpiredReservations(): Promise<void> {
    const now = new Date();
    const expired = await this.participantsService.findExpiredPending(now);

    for (const participant of expired) {
      await this.participantsService.expireParticipant(participant._id.toString());
      await this.campaignModel
        .updateOne({ _id: participant.campaignId }, { $inc: { currentParticipants: -1 } })
        .exec();
    }
  }

  private async notifyCampaignSuccessful(campaign: CampaignDocument): Promise<void> {
    const participants = await this.participantsService.findByCampaignRaw(campaign._id);
    const paidUserIds = participants
      .filter((p) => p.status === ParticipantStatus.PAID || p.status === ParticipantStatus.CONFIRMED)
      .map((p) => p.userId);

    for (const userId of paidUserIds) {
      await this.notificationsService.notify(
        userId,
        NotificationType.CAMPAIGN_SUCCESSFUL,
        'Your group buy succeeded!',
        `"${campaign.title}" reached its minimum and is now confirmed. Your order is being prepared.`,
        { campaignId: campaign._id.toString() },
      );
    }

    await this.notificationsService.notify(
      campaign.sellerId,
      NotificationType.CAMPAIGN_SUCCESSFUL,
      'Your campaign succeeded!',
      `"${campaign.title}" reached its minimum participants and is now confirmed.`,
      { campaignId: campaign._id.toString() },
    );
  }

  private async notifyCampaignFailed(
    campaign: CampaignDocument,
    participants: ParticipantDocument[],
  ): Promise<void> {
    for (const participant of participants) {
      const wasPaid = participant.status === ParticipantStatus.PAID || participant.status === ParticipantStatus.CONFIRMED;
      await this.notificationsService.notify(
        participant.userId,
        NotificationType.CAMPAIGN_FAILED,
        'Group buy did not reach its minimum',
        wasPaid
          ? `"${campaign.title}" didn't reach enough participants before it ended. Your payment will be refunded.`
          : `"${campaign.title}" didn't reach enough participants before it ended.`,
        { campaignId: campaign._id.toString() },
      );
    }

    await this.notificationsService.notify(
      campaign.sellerId,
      NotificationType.CAMPAIGN_FAILED,
      'Your campaign did not succeed',
      `"${campaign.title}" didn't reach its minimum participants before it ended.`,
      { campaignId: campaign._id.toString() },
    );
  }

  private async notifyIfAlmostComplete(campaign: CampaignDocument): Promise<void> {
    if (campaign.status !== CampaignStatus.ACTIVE) return;

    const remaining = campaign.minimumParticipants - campaign.currentParticipants;
    if (remaining < 1 || remaining > 2) return;

    await this.notificationsService.notify(
      campaign.sellerId,
      NotificationType.CAMPAIGN_ALMOST_COMPLETE,
      'Your campaign is almost there!',
      `"${campaign.title}" only needs ${remaining} more participant${remaining === 1 ? '' : 's'} to succeed.`,
      { campaignId: campaign._id.toString() },
    );
  }

  private async findOwnedOrAdmin(
    id: string,
    requester: AuthenticatedUser,
  ): Promise<CampaignDocument> {
    const campaign = await this.campaignModel.findById(id).exec();
    if (!campaign) throw new NotFoundException('Campaign not found');

    const isOwner = campaign.sellerId.toString() === requester.userId;
    if (!isOwner && requester.role !== Role.ADMIN) {
      throw new ForbiddenException('You do not have permission to modify this campaign');
    }

    return campaign;
  }

  private applyVisibilityScope(
    filter: QueryFilter<GroupBuyCampaign>,
    requestedStatus: CampaignStatus | undefined,
    requester: AuthenticatedUser | undefined,
    requestedSellerId: string | undefined,
  ): void {
    const isAdmin = requester?.role === Role.ADMIN;
    const isOwnSellerListing =
      requester && requestedSellerId && requester.userId === requestedSellerId;

    if (isAdmin || isOwnSellerListing) {
      if (requestedStatus) filter.status = requestedStatus;
      return;
    }

    if (requestedStatus && PUBLIC_STATUSES.includes(requestedStatus)) {
      filter.status = requestedStatus;
      return;
    }

    // A non-owner explicitly asking for DRAFT/CANCELLED gets an empty
    // result rather than an error, so listings never leak existence.
    filter.status = requestedStatus ? { $in: [] } : CampaignStatus.ACTIVE;
  }

  private isVisibleTo(campaign: CampaignDocument, requester?: AuthenticatedUser): boolean {
    if (PUBLIC_STATUSES.includes(campaign.status)) return true;
    if (!requester) return false;
    if (requester.role === Role.ADMIN) return true;
    return campaign.sellerId.toString() === requester.userId;
  }

  private resolveSort(sort: QueryCampaignsDto['sort']): Record<string, 1 | -1> {
    switch (sort) {
      case 'ending_soon':
        return { endDate: 1 };
      case 'most_joined':
        return { currentParticipants: -1 };
      case 'price_asc':
        return { groupPrice: 1 };
      case 'price_desc':
        return { groupPrice: -1 };
      default:
        return { createdAt: -1 };
    }
  }

  private computeReservationExpiry(campaign: CampaignDocument, now: Date): Date {
    const windowExpiry = new Date(now.getTime() + RESERVATION_WINDOW_MS);
    const hardCutoff = campaign.paymentDeadline ?? campaign.endDate;
    return windowExpiry < hardCutoff ? windowExpiry : hardCutoff;
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: unknown }).code === 11000
    );
  }

  private async generateUniqueSlug(title: string): Promise<string> {
    const base = slugify(title) || 'campaign';

    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = attempt === 0 ? base : `${base}-${randomSlugSuffix()}`;
      const existing = await this.campaignModel.exists({ slug: candidate });
      if (!existing) return candidate;
    }

    return `${base}-${randomSlugSuffix(10)}`;
  }
}
