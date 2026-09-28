import { HttpStatus, Injectable } from '@nestjs/common';
import { CampaignStatus } from '../../common/enums/campaign-status.enum.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import type { CampaignDocument } from './schemas/campaign.schema.js';

const ALLOWED_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  [CampaignStatus.DRAFT]: [CampaignStatus.ACTIVE],
  [CampaignStatus.ACTIVE]: [
    CampaignStatus.SUCCESSFUL,
    CampaignStatus.FAILED,
    CampaignStatus.CANCELLED,
  ],
  [CampaignStatus.SUCCESSFUL]: [CampaignStatus.COMPLETED],
  [CampaignStatus.FAILED]: [],
  [CampaignStatus.CANCELLED]: [],
  [CampaignStatus.COMPLETED]: [],
};

/**
 * The single authority for campaign status changes (Rule 8). No controller
 * or service should assign `campaign.status = ...` directly - every
 * transition must go through here so the valid-transition table in section
 * 23 of the spec is enforced everywhere, not just at the edges callers
 * happen to remember to check.
 */
@Injectable()
export class CampaignStateService {
  canTransition(from: CampaignStatus, to: CampaignStatus): boolean {
    return ALLOWED_TRANSITIONS[from].includes(to);
  }

  async transition(campaign: CampaignDocument, to: CampaignStatus): Promise<CampaignDocument> {
    if (!this.canTransition(campaign.status, to)) {
      throw new AppException(
        `Cannot transition campaign from ${campaign.status} to ${to}`,
        'INVALID_CAMPAIGN_TRANSITION',
        HttpStatus.CONFLICT,
      );
    }

    campaign.status = to;
    await campaign.save();
    return campaign;
  }
}
