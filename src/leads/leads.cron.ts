import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { LeadsService } from './leads.service';
import { GmailService } from '../gmail/gmail.service';
import { PrismaService } from '../database/prisma.service';
import { DesignTaskStatus } from '@prisma/client';

const FIGMA_URL_REGEX = /https:\/\/(?:www\.)?figma\.com\/design\/([a-zA-Z0-9]+)\/[^?\s]*/g;

@Injectable()
export class LeadsCron {
  private readonly logger = new Logger(LeadsCron.name);
  private isProcessing = false;

  constructor(
    private leadsService: LeadsService,
    private gmailService: GmailService,
    private prisma: PrismaService,
  ) {}

  @Cron('*/5 * * * *')
  async handleLeadProcessing(): Promise<void> {
    if (this.isProcessing) {
      this.logger.debug('Lead processing already in progress, skipping');
      return;
    }

    this.isProcessing = true;

    try {
      this.logger.debug('Starting lead processing cron');
      await this.leadsService.processNewLeads();
      await this.detectFigmaEmails();
      this.logger.debug('Lead processing cron completed');
    } catch (error) {
      this.logger.error(
        'Lead processing cron failed',
        (error as Error).message,
      );
    } finally {
      this.isProcessing = false;
    }
  }

  private async detectFigmaEmails(): Promise<void> {
    try {
      const emails = await this.gmailService.fetchUnreadFacebookEmails();

      for (const email of emails) {
        const content = email.htmlBody || email.snippet || '';
        const figmaMatches = content.matchAll(FIGMA_URL_REGEX);

        for (const match of figmaMatches) {
          const figmaUrl = match[0];
          const fileKey = match[1];

          const existing = await this.prisma.designTask.findFirst({
            where: { figmaUrl },
          });

          if (!existing) {
            const nodeIdMatch = figmaUrl.match(/node-id=([^&\s]+)/);
            await this.prisma.designTask.create({
              data: {
                figmaUrl,
                figmaFileKey: fileKey,
                figmaNodeIds: nodeIdMatch?.[1] || null,
                submittedBy: 'email-auto',
                status: DesignTaskStatus.PENDING,
              },
            });
            this.logger.log(`Auto-detected Figma design from email: ${figmaUrl}`);
          }
        }
      }
    } catch (error) {
      this.logger.debug('Figma email detection skipped', (error as Error).message);
    }
  }
}
