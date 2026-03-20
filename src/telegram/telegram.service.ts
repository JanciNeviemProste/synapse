import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bot, InlineKeyboard } from 'grammy';
import { splitMessage } from '../common/utils/message-splitter';

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  public bot!: Bot;
  private ownerChatId!: string;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const token = this.configService.get<string>('telegram.botToken');
    this.ownerChatId = this.configService.get<string>('telegram.ownerChatId') || '';

    if (!token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not set — bot disabled');
      return;
    }

    this.bot = new Bot(token);
    this.logger.log('Telegram bot initialized');
  }

  async onModuleDestroy() {
    if (this.bot?.isInited()) {
      await this.bot.stop();
      this.logger.log('Telegram bot stopped');
    }
  }

  async startBot() {
    if (!this.bot) return;
    try {
      this.bot.start({
        drop_pending_updates: true,
        onStart: () => this.logger.log('Telegram bot polling started'),
      });
    } catch (error) {
      this.logger.error('Failed to start bot', (error as Error).message);
    }
  }

  async sendMessage(chatId: string | number, text: string, options?: Record<string, unknown>) {
    if (!this.bot) return;

    try {
      const chunks = splitMessage(text);
      for (const chunk of chunks) {
        await this.bot.api.sendMessage(chatId, chunk, {
          parse_mode: 'HTML',
          ...options,
        });
      }
    } catch (error) {
      this.logger.error(`Failed to send message to ${chatId}`, (error as Error).message);
    }
  }

  async sendToOwner(text: string, options?: Record<string, unknown>) {
    if (!this.ownerChatId) {
      this.logger.warn('TELEGRAM_OWNER_CHAT_ID not set');
      return;
    }
    await this.sendMessage(this.ownerChatId, text, options);
  }

  async sendWithKeyboard(
    chatId: string | number,
    text: string,
    keyboard: InlineKeyboard,
  ) {
    if (!this.bot) return;

    try {
      const chunks = splitMessage(text);
      for (let i = 0; i < chunks.length; i++) {
        const isLast = i === chunks.length - 1;
        await this.bot.api.sendMessage(chatId, chunks[i], {
          parse_mode: 'HTML',
          reply_markup: isLast ? keyboard : undefined,
        });
      }
    } catch (error) {
      this.logger.error(`Failed to send keyboard message to ${chatId}`, (error as Error).message);
    }
  }

  createKeyboard(): InlineKeyboard {
    return new InlineKeyboard();
  }

  getOwnerChatId(): string {
    return this.ownerChatId;
  }
}
