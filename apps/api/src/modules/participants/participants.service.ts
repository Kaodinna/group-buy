import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  GroupBuyParticipant,
  ParticipantDocument,
} from './schemas/participant.schema.js';
import { ParticipantStatus } from '../../common/enums/participant-status.enum.js';
import type { ShippingAddressDto } from '../../common/dto/shipping-address.dto.js';

const ACTIVE_STATUSES = [
  ParticipantStatus.PENDING,
  ParticipantStatus.PAID,
  ParticipantStatus.CONFIRMED,
];

export interface CreateParticipantInput {
  campaignId: Types.ObjectId;
  userId: Types.ObjectId;
  unitPrice: number;
  expiresAt: Date;
  shippingAddress?: ShippingAddressDto;
}

@Injectable()
export class ParticipantsService {
  constructor(
    @InjectModel(GroupBuyParticipant.name) private participantModel: Model<GroupBuyParticipant>,
  ) {}

  async findActiveByCampaignAndUser(
    campaignId: Types.ObjectId,
    userId: string,
  ): Promise<ParticipantDocument | null> {
    // Mongoose does not reliably auto-cast a plain string to ObjectId for a
    // non-_id ref field in a query filter here - cast explicitly or the
    // filter silently matches nothing.
    return this.participantModel
      .findOne({ campaignId, userId: new Types.ObjectId(userId), status: { $in: ACTIVE_STATUSES } })
      .exec();
  }

  async findById(participantId: string): Promise<ParticipantDocument | null> {
    return this.participantModel.findById(participantId).exec();
  }

  async linkPayment(participantId: string, paymentId: Types.ObjectId): Promise<void> {
    await this.participantModel
      .updateOne({ _id: participantId }, { $set: { paymentId } })
      .exec();
  }

  async linkOrder(participantId: string, orderId: Types.ObjectId): Promise<void> {
    await this.participantModel
      .updateOne({ _id: participantId }, { $set: { orderId } })
      .exec();
  }

  async create(input: CreateParticipantInput): Promise<ParticipantDocument> {
    return this.participantModel.create({
      campaignId: input.campaignId,
      userId: input.userId,
      quantity: 1,
      unitPrice: input.unitPrice,
      totalAmount: input.unitPrice,
      status: ParticipantStatus.PENDING,
      joinedAt: new Date(),
      expiresAt: input.expiresAt,
      shippingAddress: input.shippingAddress ?? null,
    });
  }

  async findByUser(userId: string): Promise<ParticipantDocument[]> {
    return this.participantModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('campaignId', 'title slug image status originalPrice groupPrice currentParticipants minimumParticipants maximumParticipants endDate')
      .sort({ joinedAt: -1 })
      .exec();
  }

  async findByCampaign(campaignId: string): Promise<ParticipantDocument[]> {
    return this.participantModel
      .find({ campaignId: new Types.ObjectId(campaignId) })
      .populate('userId', 'firstName lastName email avatar')
      .sort({ joinedAt: -1 })
      .exec();
  }

  /** Same as findByCampaign but without populating userId - for internal
   * callers (e.g. notification fan-out) that just need the raw ObjectId. */
  async findByCampaignRaw(campaignId: Types.ObjectId): Promise<ParticipantDocument[]> {
    return this.participantModel.find({ campaignId }).exec();
  }

  async findExpiredPending(now: Date): Promise<ParticipantDocument[]> {
    return this.participantModel
      .find({ status: ParticipantStatus.PENDING, expiresAt: { $lt: now } })
      .exec();
  }

  /** Idempotent: only transitions a still-PENDING reservation. */
  async expireParticipant(participantId: string): Promise<ParticipantDocument> {
    const participant = await this.participantModel.findById(participantId).exec();
    if (!participant) throw new NotFoundException('Participant not found');

    if (participant.status === ParticipantStatus.PENDING) {
      participant.status = ParticipantStatus.CANCELLED;
      await participant.save();
    }

    return participant;
  }

  async countPaid(campaignId: Types.ObjectId): Promise<number> {
    return this.participantModel
      .countDocuments({
        campaignId,
        status: { $in: [ParticipantStatus.PAID, ParticipantStatus.CONFIRMED] },
      })
      .exec();
  }

  /** Paid participants who don't have an Order yet - used to batch-create
   * orders for everyone who already paid the moment a campaign succeeds. */
  async findPaidWithoutOrder(campaignId: Types.ObjectId): Promise<ParticipantDocument[]> {
    return this.participantModel
      .find({
        campaignId,
        status: { $in: [ParticipantStatus.PAID, ParticipantStatus.CONFIRMED] },
        orderId: null,
      })
      .exec();
  }

  /**
   * Marks a reservation as paid. Idempotent: a webhook may deliver the same
   * payment-success event more than once, so re-confirming an already-PAID
   * participant is a no-op rather than an error.
   */
  async markAsPaid(participantId: string): Promise<ParticipantDocument> {
    const participant = await this.participantModel.findById(participantId).exec();
    if (!participant) throw new NotFoundException('Participant not found');

    if (participant.status === ParticipantStatus.PENDING) {
      participant.status = ParticipantStatus.PAID;
      await participant.save();
    }

    return participant;
  }

  /**
   * Idempotent: a duplicate refund-confirmation should never throw, it
   * should just leave the participant REFUNDED (Rule 7).
   */
  async markAsRefunded(participantId: string): Promise<ParticipantDocument> {
    const participant = await this.participantModel.findById(participantId).exec();
    if (!participant) throw new NotFoundException('Participant not found');

    if (
      participant.status === ParticipantStatus.PAID ||
      participant.status === ParticipantStatus.CONFIRMED
    ) {
      participant.status = ParticipantStatus.REFUNDED;
      await participant.save();
    }

    return participant;
  }

  /**
   * Used when a campaign is cancelled or fails. Unpaid (PENDING)
   * reservations are cancelled outright - no money was ever taken. Paid
   * (PAID/CONFIRMED) participants are left as-is and returned to the caller:
   * flipping them to CANCELLED/REFUNDED here would be dishonest before a
   * real refund has actually been processed. PaymentsService.refund() picks
   * these up and calls markAsRefunded() once the provider confirms it.
   */
  async cancelPendingAndListPaid(
    campaignId: Types.ObjectId,
  ): Promise<{ paidParticipants: ParticipantDocument[]; cancelledParticipants: ParticipantDocument[] }> {
    const [paidParticipants, cancelledParticipants] = await Promise.all([
      this.participantModel
        .find({ campaignId, status: { $in: [ParticipantStatus.PAID, ParticipantStatus.CONFIRMED] } })
        .exec(),
      this.participantModel.find({ campaignId, status: ParticipantStatus.PENDING }).exec(),
    ]);

    await this.participantModel.updateMany(
      { campaignId, status: ParticipantStatus.PENDING },
      { $set: { status: ParticipantStatus.CANCELLED } },
    );

    return { paidParticipants, cancelledParticipants };
  }
}
