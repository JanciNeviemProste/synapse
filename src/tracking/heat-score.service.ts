import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { InlineKeyboard } from 'grammy';
import { bold, formatDate } from '../common/utils/telegram-formatter';

export const HEAT_SCORE_MAP: Record<string, number> = {
  link_opened: 15,
  form_started: 20,
  form_completed: 20,
  preview_viewed: 10,
  preview_time_long: 10,
  preview_revisit: 15,
};

export const HOT_LEAD_THRESHOLD = 70;

/** True only when the score crosses the hot threshold with this update. */
export function crossedHotThreshold(
  previousScore: number,
  newScore: number,
): boolean {
  return newScore >= HOT_LEAD_THRESHOLD && previousScore < HOT_LEAD_THRESHOLD;
}

@Injectable()
export class HeatScoreService {
  private readonly logger = new Logger(HeatScoreService.name);

  constructor(
    private prisma: PrismaService,
    private telegramService: TelegramService,
  ) {}

  async updateHeatScore(leadId: string, event: string): Promise<void> {
    try {
      const scoreIncrement = HEAT_SCORE_MAP[event] ?? 0;
      if (scoreIncrement === 0) {
        return;
      }

      const lead = await this.prisma.lead.update({
        where: { id: leadId },
        data: {
          heatScore: { increment: scoreIncrement },
        },
      });

      this.logger.log(
        `Heat score for lead ${leadId} updated by +${scoreIncrement} (now ${lead.heatScore})`,
      );

      if (crossedHotThreshold(lead.heatScore - scoreIncrement, lead.heatScore)) {
        await this.sendHotLeadAlert(lead.id, lead.authorName, lead.heatScore);
      }
    } catch (error) {
      this.logger.error(
        `Failed to update heat score for lead ${leadId}`,
        (error as Error).message,
      );
    }
  }

  private async sendHotLeadAlert(
    leadId: string,
    authorName: string,
    heatScore: number,
  ): Promise<void> {
    try {
      const message =
        `🔥 ${bold('HOT LEAD ALERT!')}\n\n` +
        `${bold('Meno:')} ${authorName}\n` +
        `${bold('Heat Score:')} ${heatScore}/100\n` +
        `${bold('Cas:')} ${formatDate(new Date())}\n\n` +
        `Tento lead prejavil vysoky zaujem!`;

      const keyboard = new InlineKeyboard()
        .text('Kontaktovat', `lead_contact_${leadId}`)
        .text('Detail', `lead_detail_${leadId}`);

      await this.telegramService.sendWithKeyboard(
        this.telegramService.getOwnerChatId(),
        message,
        keyboard,
      );

      this.logger.log(`Hot lead alert sent for ${authorName} (score: ${heatScore})`);
    } catch (error) {
      this.logger.error(
        `Failed to send hot lead alert for ${leadId}`,
        (error as Error).message,
      );
    }
  }
}
