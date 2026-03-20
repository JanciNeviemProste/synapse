import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Res,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { TrackingService } from './tracking.service';
import { PrismaService } from '../database/prisma.service';

interface TrackingEventBody {
  ref: string;
  event: string;
  metadata?: Record<string, string | number | boolean | null>;
}

@Controller()
export class TrackingController {
  private readonly logger = new Logger(TrackingController.name);

  constructor(
    private trackingService: TrackingService,
    private prisma: PrismaService,
  ) {}

  @Get('t/:ref')
  async handleTrackingRedirect(
    @Param('ref') ref: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const cloneRequest = await this.prisma.cloneRequest.findUnique({
        where: { trackingRef: ref },
      });

      if (!cloneRequest) {
        throw new NotFoundException(`Tracking reference "${ref}" not found`);
      }

      if (cloneRequest.leadId) {
        await this.trackingService.recordEvent(cloneRequest.leadId, 'link_opened', {
          trackingRef: ref,
          sourceUrl: cloneRequest.sourceUrl,
        });
      }

      const targetUrl = cloneRequest.previewUrl || cloneRequest.sourceUrl;
      this.logger.log(`Tracking redirect: ref=${ref} -> ${targetUrl}`);
      res.redirect(targetUrl);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to handle tracking redirect for ref="${ref}"`,
        (error as Error).message,
      );
      res.status(500).send('Internal server error');
    }
  }

  @Post('api/tracking/event')
  async recordTrackingEvent(
    @Body() body: TrackingEventBody,
  ): Promise<{ success: boolean }> {
    try {
      const cloneRequest = await this.prisma.cloneRequest.findUnique({
        where: { trackingRef: body.ref },
      });

      if (!cloneRequest) {
        throw new NotFoundException(`Tracking reference "${body.ref}" not found`);
      }

      if (!cloneRequest.leadId) {
        this.logger.warn(`Clone request ${cloneRequest.id} has no associated lead`);
        return { success: false };
      }

      await this.trackingService.recordEvent(
        cloneRequest.leadId,
        body.event,
        body.metadata,
      );

      return { success: true };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to record tracking event for ref="${body.ref}"`,
        (error as Error).message,
      );
      return { success: false };
    }
  }
}
