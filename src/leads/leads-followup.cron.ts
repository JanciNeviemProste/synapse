import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { AiService } from '../ai/ai.service';
import { InlineKeyboard } from 'grammy';
import { LeadStatus } from '@prisma/client';
import {
  bold,
  italic,
  link,
  formatDate,
  truncate,
} from '../common/utils/telegram-formatter';

@Injectable()
export class LeadsFollowupCron {
  private readonly logger = new Logger(LeadsFollowupCron.name);

  constructor(
    private prisma: PrismaService,
    private telegramService: TelegramService,
    private aiService: AiService,
  ) {}

  @Cron('* * * * *')
  async handleNewLeadReminders(): Promise<void> {
    try {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

      const unleadReminders = await this.prisma.lead.findMany({
        where: {
          status: LeadStatus.NEW,
          reminderSentAt: null,
          createdAt: { lte: tenMinutesAgo },
        },
        take: 10,
      });

      if (unleadReminders.length === 0) {
        return;
      }

      this.logger.log(
        `Sending reminders for ${unleadReminders.length} unattended leads`,
      );

      for (const lead of unleadReminders) {
        try {
          const timeSinceCreation = Math.round(
            (Date.now() - lead.createdAt.getTime()) / 60000,
          );

          const message =
            `⏰ ${bold('PRIPOMIENKA — Novy lead caka!')}\n\n` +
            `${bold('Meno:')} ${lead.authorName}\n` +
            `${bold('Skupina:')} ${lead.groupName || 'N/A'}\n` +
            `${bold('Kategoria:')} ${lead.category || 'N/A'}\n` +
            `${bold('Cas:')} pred ${timeSinceCreation} min\n` +
            `\n${italic(truncate(lead.postSummary, 300))}`;

          const keyboard = new InlineKeyboard()
            .text('Kontaktovany', `lead_contact_${lead.id}`)
            .text('Ignorovat', `lead_reject_${lead.id}`)
            .row()
            .text('+30 min', `lead_snooze_${lead.id}`);

          await this.telegramService.sendWithKeyboard(
            this.telegramService.getOwnerChatId(),
            message,
            keyboard,
          );

          await this.prisma.lead.update({
            where: { id: lead.id },
            data: { reminderSentAt: new Date() },
          });

          this.logger.log(
            `Reminder sent for lead ${lead.authorName} (waiting ${timeSinceCreation} min)`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to send reminder for lead ${lead.id}`,
            (error as Error).message,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        'Failed to process lead reminders',
        (error as Error).message,
      );
    }
  }

  @Cron('0 * * * *')
  async handleFollowUpMessages(): Promise<void> {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const leadsNeedingFollowUp = await this.prisma.lead.findMany({
        where: {
          linkOpened: true,
          contactedAt: { not: null },
          status: {
            in: [LeadStatus.CONTACTED, LeadStatus.REPLIED],
          },
          OR: [
            { followUpSentAt: null },
            { followUpSentAt: { lte: twentyFourHoursAgo } },
          ],
        },
        take: 5,
      });

      if (leadsNeedingFollowUp.length === 0) {
        return;
      }

      this.logger.log(
        `Generating follow-ups for ${leadsNeedingFollowUp.length} leads`,
      );

      for (const lead of leadsNeedingFollowUp) {
        try {
          const followUpMessage = await this.generateFollowUp(lead);

          const message =
            `🔄 ${bold('FOLLOW-UP NAVRH')} — ${lead.authorName}\n\n` +
            `${bold('Status:')} ${lead.status}\n` +
            `${bold('Heat Score:')} ${lead.heatScore}\n` +
            `${bold('Link otvoreny:')} ${lead.linkOpenedAt ? formatDate(lead.linkOpenedAt) : 'N/A'}\n` +
            `${bold('Preview views:')} ${lead.previewViews}\n` +
            `\n${bold('Navrhnuty follow-up:')}\n${followUpMessage}\n\n` +
            (lead.messengerUrl
              ? `${link('Otvorit Messenger', lead.messengerUrl)}`
              : `${italic('Messenger URL nedostupny')}`);

          const keyboard = new InlineKeyboard()
            .text('Odoslat', `lead_followup_send_${lead.id}`)
            .text('Upravit', `lead_followup_edit_${lead.id}`)
            .row()
            .text('Preskocit', `lead_followup_skip_${lead.id}`);

          await this.telegramService.sendWithKeyboard(
            this.telegramService.getOwnerChatId(),
            message,
            keyboard,
          );

          await this.prisma.lead.update({
            where: { id: lead.id },
            data: { followUpSentAt: new Date() },
          });

          this.logger.log(`Follow-up generated for ${lead.authorName}`);
        } catch (error) {
          this.logger.error(
            `Failed to generate follow-up for lead ${lead.id}`,
            (error as Error).message,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        'Failed to process follow-up messages',
        (error as Error).message,
      );
    }
  }

  private async generateFollowUp(
    lead: {
      authorName: string;
      category: string | null;
      postSummary: string;
      heatScore: number;
      previewViews: number;
      previewTotalTime: number;
    },
  ): Promise<string> {
    try {
      const systemPrompt = `Si skuseny obchodnik digitalnej agentury. Generujes follow-up spravy pre klientov ktori prejavili zaujem (otvorili link).

PRAVIDLA:
1. Pis v slovencine, priatelsky ale profesionalne
2. Odkazuj sa na ich povodny zaujem
3. Ak prezerali preview dlho, pochval ich web/projekt
4. Bud strucny — max 3 vety
5. Zakonci jasnou vyzvu k akcii (call, stretnutie)

Vrat CELY text follow-up spravy.`;

      const userMessage = `Vygeneruj follow-up pre:
Meno: ${lead.authorName}
Kategoria: ${lead.category || 'web'}
Povodny prispevok: ${truncate(lead.postSummary, 300)}
Heat Score: ${lead.heatScore}
Preview pozreti: ${lead.previewViews}
Cas na preview: ${lead.previewTotalTime}s`;

      return await this.aiService.generateText(systemPrompt, userMessage);
    } catch (error) {
      this.logger.error(
        'Failed to generate AI follow-up',
        (error as Error).message,
      );
      return `Ahoj ${lead.authorName}, chcel som sa opytat ci si mal cas pozriet tu ukazku. Radi si dohodneme kratky call a prejdeme moznosti. Kedy by ti to vyhovovalo?`;
    }
  }
}
