import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { TelegramUpdate } from '../telegram/telegram.update';
import { TelegramService } from '../telegram/telegram.service';
import { ClonerService } from './cloner.service';
import { PrismaService } from '../database/prisma.service';
import { CloneStatus } from '@prisma/client';
import {
  bold,
  code,
  truncate,
} from '../common/utils/telegram-formatter';

@Injectable()
export class ClonerTelegramHandler implements OnModuleInit {
  private readonly logger = new Logger(ClonerTelegramHandler.name);

  constructor(
    private telegramUpdate: TelegramUpdate,
    private telegramService: TelegramService,
    private clonerService: ClonerService,
    private prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.telegramUpdate.registerCommand('clones', this.handleClones.bind(this));
    this.telegramUpdate.registerCommand('clone', this.handleCloneDetail.bind(this));

    this.telegramUpdate.registerCallback('clone_retry', this.handleCloneRetry.bind(this));

    this.logger.log('Cloner Telegram commands registered');
  }

  private async handleClones(chatId: number): Promise<void> {
    try {
      const clones = await this.clonerService.getCloneRequests();

      if (clones.length === 0) {
        await this.telegramService.sendMessage(chatId, 'Zatiaľ žiadne clone requesty.');
        return;
      }

      let message = `🔄 ${bold('Clone requesty:')}\n\n`;

      for (const clone of clones.slice(0, 10)) {
        const status =
          clone.status === 'COMPLETED' ? '✅' :
          clone.status === 'FAILED' ? '❌' : '⏳';

        message +=
          `${status} ${clone.businessName}\n` +
          `   Zdroj: ${truncate(clone.sourceUrl, 50)}\n` +
          `   Status: ${clone.status}\n` +
          (clone.previewUrl ? `   🔗 ${clone.previewUrl}\n` : '') +
          `   ID: ${code(clone.id.substring(0, 8))}\n`;

        if (clone.status === 'FAILED') {
          message += `   /clone_retry_${clone.id.substring(0, 8)}\n`;
        }

        message += '\n';
      }

      await this.telegramService.sendMessage(chatId, message);
    } catch (error) {
      await this.telegramService.sendMessage(chatId, `❌ Chyba: ${(error as Error).message}`);
    }
  }

  private async handleCloneDetail(chatId: number, args: string): Promise<void> {
    const idPrefix = args.trim();
    if (!idPrefix) {
      await this.telegramService.sendMessage(chatId, 'Použitie: /clone_{id}');
      return;
    }

    try {
      const clone = await this.prisma.cloneRequest.findFirst({
        where: { id: { startsWith: idPrefix } },
      });

      if (!clone) {
        await this.telegramService.sendMessage(chatId, 'Clone request nenájdený.');
        return;
      }

      const status =
        clone.status === 'COMPLETED' ? '✅' :
        clone.status === 'FAILED' ? '❌' : '⏳';

      let message =
        `🔄 ${bold('Clone Detail')}\n\n` +
        `${status} ${bold('Status:')} ${clone.status}\n` +
        `${bold('Business:')} ${clone.businessName}\n` +
        `${bold('Client:')} ${clone.clientName}\n` +
        `${bold('Source:')} ${clone.sourceUrl}\n` +
        `${bold('Created:')} ${clone.createdAt.toLocaleString('sk-SK')}\n`;

      if (clone.previewUrl) message += `${bold('Preview:')} ${clone.previewUrl}\n`;
      if (clone.errorMessage) message += `\n${bold('Error:')} ${clone.errorMessage}\n`;

      message += `\nID: ${code(clone.id.substring(0, 8))}`;

      await this.telegramService.sendMessage(chatId, message);
    } catch (error) {
      await this.telegramService.sendMessage(chatId, `❌ Chyba: ${(error as Error).message}`);
    }
  }

  private async handleCloneRetry(chatId: number, data: string): Promise<void> {
    const idPrefix = data.replace('clone_retry_', '');

    try {
      const clone = await this.prisma.cloneRequest.findFirst({
        where: { id: { startsWith: idPrefix } },
      });

      if (!clone) {
        await this.telegramService.sendMessage(chatId, 'Clone request nenájdený.');
        return;
      }

      await this.prisma.cloneRequest.update({
        where: { id: clone.id },
        data: {
          status: CloneStatus.PENDING,
          errorMessage: null,
        },
      });

      this.clonerService.processClone(clone.id).catch((error) => {
        this.logger.error(`Retry failed for ${clone.id}`, (error as Error).message);
      });

      await this.telegramService.sendMessage(chatId, `🔄 Clone zaradený na opätovné spracovanie.`);
    } catch (error) {
      await this.telegramService.sendMessage(chatId, `❌ Chyba: ${(error as Error).message}`);
    }
  }
}
