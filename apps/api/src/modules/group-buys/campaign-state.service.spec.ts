import { CampaignStateService } from './campaign-state.service.js';
import { CampaignStatus } from '../../common/enums/campaign-status.enum.js';
import { AppException } from '../../common/exceptions/app.exception.js';

function makeCampaign(status: CampaignStatus) {
  return {
    status,
    save: vi.fn().mockResolvedValue(undefined),
  };
}

describe('CampaignStateService', () => {
  const service = new CampaignStateService();

  it.each([
    [CampaignStatus.DRAFT, CampaignStatus.ACTIVE],
    [CampaignStatus.ACTIVE, CampaignStatus.SUCCESSFUL],
    [CampaignStatus.ACTIVE, CampaignStatus.FAILED],
    [CampaignStatus.ACTIVE, CampaignStatus.CANCELLED],
    [CampaignStatus.SUCCESSFUL, CampaignStatus.COMPLETED],
  ])('allows %s -> %s', (from, to) => {
    expect(service.canTransition(from, to)).toBe(true);
  });

  it.each([
    [CampaignStatus.DRAFT, CampaignStatus.SUCCESSFUL],
    [CampaignStatus.DRAFT, CampaignStatus.CANCELLED],
    [CampaignStatus.SUCCESSFUL, CampaignStatus.ACTIVE],
    [CampaignStatus.SUCCESSFUL, CampaignStatus.CANCELLED],
    [CampaignStatus.FAILED, CampaignStatus.ACTIVE],
    [CampaignStatus.CANCELLED, CampaignStatus.ACTIVE],
    [CampaignStatus.COMPLETED, CampaignStatus.ACTIVE],
  ])('rejects %s -> %s', (from, to) => {
    expect(service.canTransition(from, to)).toBe(false);
  });

  it('applies and persists a valid transition', async () => {
    const campaign = makeCampaign(CampaignStatus.ACTIVE);

    // @ts-expect-error - test double, only the fields the service touches
    const result = await service.transition(campaign, CampaignStatus.SUCCESSFUL);

    expect(result.status).toBe(CampaignStatus.SUCCESSFUL);
    expect(campaign.save).toHaveBeenCalledOnce();
  });

  it('throws and does not persist an invalid transition', async () => {
    const campaign = makeCampaign(CampaignStatus.FAILED);

    await expect(
      // @ts-expect-error - test double, only the fields the service touches
      service.transition(campaign, CampaignStatus.ACTIVE),
    ).rejects.toThrow(AppException);

    expect(campaign.save).not.toHaveBeenCalled();
    expect(campaign.status).toBe(CampaignStatus.FAILED);
  });
});
