import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CampaignsService } from './campaigns.service.js';

/**
 * Periodic sweeps that keep campaign/reservation state honest even when no
 * request happens to trigger it (Section 16: expired campaigns, payment
 * expiration). Kept as thin @Cron wrappers around CampaignsService so the
 * actual logic stays framework-agnostic and unit-testable without
 * @nestjs/schedule in the loop.
 */
@Injectable()
export class CampaignSchedulerService {
  private readonly logger = new Logger(CampaignSchedulerService.name);

  constructor(private readonly campaignsService: CampaignsService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async activateScheduledCampaigns(): Promise<void> {
    try {
      await this.campaignsService.activateScheduledCampaigns();
    } catch (error) {
      this.logger.error('Failed to activate scheduled campaigns', error instanceof Error ? error.stack : undefined);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processExpiredCampaigns(): Promise<void> {
    try {
      await this.campaignsService.processExpiredCampaigns();
    } catch (error) {
      this.logger.error('Failed to process expired campaigns', error instanceof Error ? error.stack : undefined);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async releaseExpiredReservations(): Promise<void> {
    try {
      await this.campaignsService.releaseExpiredReservations();
    } catch (error) {
      this.logger.error('Failed to release expired reservations', error instanceof Error ? error.stack : undefined);
    }
  }
}
