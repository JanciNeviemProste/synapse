import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { TelegramUpdate } from '../telegram/telegram.update';
import { TelegramService } from '../telegram/telegram.service';
import { CoderService } from './coder.service';
import { AiService } from '../ai/ai.service';
import {
  bold,
  code,
  truncate,
} from '../common/utils/telegram-formatter';

@Injectable()
export class CoderTelegramHandler implements OnModuleInit {
  private readonly logger = new Logger(CoderTelegramHandler.name);

  constructor(
    private telegramUpdate: TelegramUpdate,
    private telegramService: TelegramService,
    private coderService: CoderService,
    private aiService: AiService,
  ) {}

  onModuleInit() {
    this.telegramUpdate.registerCommand('code', this.handleCode.bind(this));
    this.telegramUpdate.registerCommand('review', this.handleReview.bind(this));
    this.telegramUpdate.registerCommand('explain', this.handleExplain.bind(this));
    this.telegramUpdate.registerCommand('coder_history', this.handleHistory.bind(this));

    this.logger.log('Coder Telegram commands registered');
  }

  private async handleCode(chatId: number, args: string): Promise<void> {
    if (!args.trim()) {
      await this.telegramService.sendMessage(chatId, 'Použitie: /code {prompt}\nPríklad: /code Landing page pre fitness centrum');
      return;
    }

    await this.telegramService.sendMessage(chatId, `⚙️ Generujem web pre: "${truncate(args, 100)}"...`);

    try {
      const task = await this.coderService.createTask(args, 'telegram', String(chatId));
      await this.telegramService.sendMessage(
        chatId,
        `✅ Úloha vytvorená: ${code(task.id.substring(0, 8))}\nVýsledok ti pošlem keď bude hotový.`,
      );
    } catch (error) {
      await this.telegramService.sendMessage(chatId, `❌ Chyba: ${(error as Error).message}`);
    }
  }

  private async handleReview(chatId: number, args: string): Promise<void> {
    if (!args.trim()) {
      await this.telegramService.sendMessage(chatId, 'Použitie: /review {kód}');
      return;
    }

    try {
      const review = await this.aiService.generateText(
        `Si skúsený senior developer. Urob code review poskytnutého kódu. Zameraj sa na: bezpečnosť, výkon, čitateľnosť, best practices. Píš stručne v slovenčine.`,
        args,
      );
      await this.telegramService.sendMessage(chatId, `📝 ${bold('Code Review:')}\n\n${review}`);
    } catch (error) {
      await this.telegramService.sendMessage(chatId, `❌ Chyba pri review: ${(error as Error).message}`);
    }
  }

  private async handleExplain(chatId: number, args: string): Promise<void> {
    if (!args.trim()) {
      await this.telegramService.sendMessage(chatId, 'Použitie: /explain {kód}');
      return;
    }

    try {
      const explanation = await this.aiService.generateText(
        `Si trpezlivý učiteľ programovania. Vysvetli poskytnutý kód jednoducho a zrozumiteľne. Píš v slovenčine.`,
        args,
      );
      await this.telegramService.sendMessage(chatId, `📖 ${bold('Vysvetlenie:')}\n\n${explanation}`);
    } catch (error) {
      await this.telegramService.sendMessage(chatId, `❌ Chyba: ${(error as Error).message}`);
    }
  }

  private async handleHistory(chatId: number): Promise<void> {
    try {
      const tasks = await this.coderService.getTasks(10);

      if (tasks.length === 0) {
        await this.telegramService.sendMessage(chatId, 'Zatiaľ žiadne úlohy.');
        return;
      }

      let message = `${bold('Posledných 10 úloh:')}\n\n`;

      for (const task of tasks) {
        const status = task.status === 'COMPLETED' ? '✅' : task.status === 'FAILED' ? '❌' : '⏳';
        message +=
          `${status} ${truncate(task.prompt, 60)}\n` +
          `   ${task.status} | ${task.duration ? `${task.duration}s` : 'N/A'}\n` +
          (task.deployUrl ? `   🔗 ${task.deployUrl}\n` : '') +
          `   ID: ${code(task.id.substring(0, 8))}\n\n`;
      }

      await this.telegramService.sendMessage(chatId, message);
    } catch (error) {
      await this.telegramService.sendMessage(chatId, `❌ Chyba: ${(error as Error).message}`);
    }
  }
}
