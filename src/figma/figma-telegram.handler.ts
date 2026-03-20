import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { TelegramUpdate } from '../telegram/telegram.update';
import { TelegramService } from '../telegram/telegram.service';
import { FigmaService } from './figma.service';
import { FigmaCron } from './figma.cron';
import { PrismaService } from '../database/prisma.service';
import { DesignTaskStatus } from '@prisma/client';
import { InlineKeyboard } from 'grammy';
import {
  bold,
  code,
  truncate,
} from '../common/utils/telegram-formatter';

@Injectable()
export class FigmaTelegramHandler implements OnModuleInit {
  private readonly logger = new Logger(FigmaTelegramHandler.name);

  constructor(
    private telegramUpdate: TelegramUpdate,
    private telegramService: TelegramService,
    private figmaService: FigmaService,
    private figmaCron: FigmaCron,
    private prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.telegramUpdate.registerCommand('design', this.handleDesign.bind(this));
    this.telegramUpdate.registerCommand('designs', this.handleDesigns.bind(this));

    this.telegramUpdate.registerCallback('design_retry', this.handleDesignRetry.bind(this));

    this.logger.log('Figma Telegram commands registered');
  }

  private async handleDesign(chatId: number, args: string): Promise<void> {
    if (!args.trim()) {
      await this.telegramService.sendMessage(chatId, 'Použitie: /design {figma_url}');
      return;
    }

    // Check if args looks like a Figma URL or a task ID
    if (args.trim().startsWith('http') || args.trim().includes('figma.com')) {
      // Create new design task
      try {
        const parsed = this.figmaService.parseUrl(args.trim());

        const task = await this.prisma.designTask.create({
          data: {
            figmaUrl: args.trim(),
            figmaFileKey: parsed.fileKey,
            figmaNodeIds: parsed.nodeId || null,
            submittedBy: 'telegram',
            status: DesignTaskStatus.PENDING,
          },
        });

        await this.telegramService.sendMessage(
          chatId,
          `✅ Design task vytvorený: ${code(task.id.substring(0, 8))}\nSpracujem v najbližšom cykle.`,
        );
      } catch (error) {
        await this.telegramService.sendMessage(chatId, `❌ Chyba: ${(error as Error).message}`);
      }
    } else {
      // Show design task detail by ID prefix (/design_{id})
      await this.handleDesignDetail(chatId, args.trim());
    }
  }

  private async handleDesignDetail(chatId: number, idPrefix: string): Promise<void> {
    try {
      const task = await this.prisma.designTask.findFirst({
        where: { id: { startsWith: idPrefix } },
      });

      if (!task) {
        await this.telegramService.sendMessage(chatId, 'Design task nenájdený.');
        return;
      }

      const status =
        task.status === 'COMPLETED' ? '✅' :
        task.status === 'FAILED' ? '❌' :
        task.status === 'PROCESSING' ? '⏳' : '🕐';

      let message =
        `🎨 ${bold('Design Task Detail')}\n\n` +
        `${status} ${bold('Status:')} ${task.status}\n` +
        `${bold('Figma:')} ${task.figmaUrl}\n` +
        `${bold('File Key:')} ${task.figmaFileKey}\n` +
        `${bold('Submitted by:')} ${task.submittedBy || 'N/A'}\n` +
        `${bold('Created:')} ${task.createdAt.toLocaleString('sk-SK')}\n`;

      if (task.previewUrl) message += `${bold('Preview:')} ${task.previewUrl}\n`;
      if (task.errorMessage) message += `\n${bold('Error:')} ${task.errorMessage}\n`;

      message += `\nID: ${code(task.id.substring(0, 8))}`;

      const keyboard = new InlineKeyboard();
      if (task.status === 'FAILED') {
        keyboard.text('🔄 Retry', `design_retry_${task.id}`);
      }

      await this.telegramService.sendWithKeyboard(chatId, message, keyboard);
    } catch (error) {
      await this.telegramService.sendMessage(chatId, `❌ Chyba: ${(error as Error).message}`);
    }
  }

  private async handleDesigns(chatId: number): Promise<void> {
    try {
      const tasks = await this.prisma.designTask.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      if (tasks.length === 0) {
        await this.telegramService.sendMessage(chatId, 'Zatiaľ žiadne design tasky.');
        return;
      }

      let message = `🎨 ${bold('Design tasky:')}\n\n`;

      for (const task of tasks) {
        const status =
          task.status === 'COMPLETED' ? '✅' :
          task.status === 'FAILED' ? '❌' :
          task.status === 'PROCESSING' ? '⏳' : '🕐';

        message +=
          `${status} ${task.figmaFileKey}\n` +
          `   Status: ${task.status}\n` +
          (task.previewUrl ? `   🔗 ${task.previewUrl}\n` : '') +
          `   ID: ${code(task.id.substring(0, 8))}\n`;

        if (task.status === 'FAILED') {
          message += `   /design_retry_${task.id.substring(0, 8)}\n`;
        }

        message += '\n';
      }

      await this.telegramService.sendMessage(chatId, message);
    } catch (error) {
      await this.telegramService.sendMessage(chatId, `❌ Chyba: ${(error as Error).message}`);
    }
  }

  private async handleDesignRetry(chatId: number, data: string): Promise<void> {
    const taskIdPrefix = data.replace('design_retry_', '');

    try {
      const task = await this.prisma.designTask.findFirst({
        where: { id: { startsWith: taskIdPrefix } },
      });

      if (!task) {
        await this.telegramService.sendMessage(chatId, 'Task nenájdený.');
        return;
      }

      await this.prisma.designTask.update({
        where: { id: task.id },
        data: {
          status: DesignTaskStatus.PENDING,
          errorMessage: null,
        },
      });

      await this.telegramService.sendMessage(chatId, `🔄 Task zaradený na opätovné spracovanie.`);
    } catch (error) {
      await this.telegramService.sendMessage(chatId, `❌ Chyba: ${(error as Error).message}`);
    }
  }
}
