import { Module, forwardRef } from '@nestjs/common';
import { TelegramModule } from '../telegram/telegram.module';
import { AiModule } from '../ai/ai.module';
import { GmailModule } from '../gmail/gmail.module';
import { ResearchModule } from '../research/research.module';
import { TrackingModule } from '../tracking/tracking.module';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { LeadsCron } from './leads.cron';
import { LeadsFollowupCron } from './leads-followup.cron';
import { LeadsReportCron } from './leads-report.cron';
import { LeadsTelegramHandler } from './leads-telegram.handler';

@Module({
  imports: [
    TelegramModule,
    AiModule,
    GmailModule,
    ResearchModule,
    forwardRef(() => TrackingModule),
  ],
  controllers: [LeadsController],
  providers: [LeadsService, LeadsCron, LeadsFollowupCron, LeadsReportCron, LeadsTelegramHandler],
  exports: [LeadsService],
})
export class LeadsModule {}
