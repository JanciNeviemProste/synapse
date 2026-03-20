import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { HeatScoreService } from './heat-score.service';
import { v4 as uuid } from 'uuid';
import { LeadActivity } from '@prisma/client';

interface EventMetadata {
  [key: string]: string | number | boolean | null;
}

@Injectable()
export class TrackingService {
  private readonly logger = new Logger(TrackingService.name);

  constructor(
    private prisma: PrismaService,
    private heatScoreService: HeatScoreService,
  ) {}

  async recordEvent(
    leadId: string,
    event: string,
    metadata?: EventMetadata,
  ): Promise<void> {
    try {
      await this.prisma.leadActivity.create({
        data: {
          id: uuid(),
          leadId,
          event,
          metadata: metadata ? JSON.stringify(metadata) : null,
        },
      });

      await this.updateLeadFields(leadId, event, metadata);
      await this.heatScoreService.updateHeatScore(leadId, event);

      this.logger.log(`Recorded event "${event}" for lead ${leadId}`);
    } catch (error) {
      this.logger.error(
        `Failed to record event "${event}" for lead ${leadId}`,
        (error as Error).message,
      );
    }
  }

  async getActivities(leadId: string): Promise<LeadActivity[]> {
    try {
      return await this.prisma.leadActivity.findMany({
        where: { leadId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(
        `Failed to get activities for lead ${leadId}`,
        (error as Error).message,
      );
      return [];
    }
  }

  private async updateLeadFields(
    leadId: string,
    event: string,
    metadata?: EventMetadata,
  ): Promise<void> {
    try {
      switch (event) {
        case 'link_opened':
          await this.prisma.lead.update({
            where: { id: leadId },
            data: {
              linkOpened: true,
              linkOpenedAt: new Date(),
            },
          });
          break;

        case 'form_started':
          await this.prisma.lead.update({
            where: { id: leadId },
            data: { formStarted: true },
          });
          break;

        case 'form_completed':
          await this.prisma.lead.update({
            where: { id: leadId },
            data: { formCompleted: true },
          });
          break;

        case 'preview_viewed':
          await this.prisma.lead.update({
            where: { id: leadId },
            data: {
              previewViews: { increment: 1 },
              lastPreviewViewAt: new Date(),
            },
          });
          break;

        case 'preview_time_long': {
          const timeSpent =
            metadata && typeof metadata.timeSpent === 'number'
              ? metadata.timeSpent
              : 0;
          await this.prisma.lead.update({
            where: { id: leadId },
            data: {
              previewTotalTime: { increment: timeSpent },
            },
          });
          break;
        }

        case 'preview_revisit':
          await this.prisma.lead.update({
            where: { id: leadId },
            data: {
              previewViews: { increment: 1 },
              lastPreviewViewAt: new Date(),
            },
          });
          break;

        default:
          break;
      }
    } catch (error) {
      this.logger.error(
        `Failed to update lead fields for event "${event}"`,
        (error as Error).message,
      );
    }
  }
}
