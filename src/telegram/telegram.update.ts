import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { InlineKeyboard } from 'grammy';

@Injectable()
export class TelegramUpdate implements OnModuleInit {
  private readonly logger = new Logger(TelegramUpdate.name);
  private commandHandlers = new Map<string, (chatId: number, args: string) => Promise<void>>();
  private callbackHandlers = new Map<string, (chatId: number, data: string, messageId: number) => Promise<void>>();

  constructor(private telegramService: TelegramService) {}

  async onModuleInit() {
    const bot = this.telegramService.bot;
    if (!bot) return;

    this.setupBaseCommands();
    this.setupCallbackHandler();

    await this.telegramService.startBot();
    this.logger.log('Telegram commands registered');
  }

  registerCommand(command: string, handler: (chatId: number, args: string) => Promise<void>) {
    this.commandHandlers.set(command, handler);
  }

  registerCallback(prefix: string, handler: (chatId: number, data: string, messageId: number) => Promise<void>) {
    this.callbackHandlers.set(prefix, handler);
  }

  private setupBaseCommands() {
    const bot = this.telegramService.bot;

    // /start
    bot.command('start', async (ctx) => {
      const ownerChatId = this.telegramService.getOwnerChatId();
      if (ownerChatId && ctx.chat.id.toString() !== ownerChatId) {
        await ctx.reply('Tento bot je sukromny.');
        return;
      }

      await ctx.reply(
        `<b>Synapse System</b>\n\n` +
        `Vitaj! Som tvoj asistent pre digitálnu agentúru.\n\n` +
        `<b>LEADS:</b>\n` +
        `/leads — poslednych 10 leadov\n` +
        `/stats — statistiky\n\n` +
        `<b>BOOKING:</b>\n` +
        `/bookings — nadchadzajuce\n\n` +
        `<b>AI CODER:</b>\n` +
        `/code {prompt} — coding uloha\n` +
        `/coder_history — poslednych 10\n\n` +
        `<b>FIGMA:</b>\n` +
        `/design {url} — novy design task\n` +
        `/designs — zoznam\n\n` +
        `<b>WEB CLONER:</b>\n` +
        `/clones — zoznam\n\n` +
        `/help — vsetky prikazy`,
        { parse_mode: 'HTML' },
      );
    });

    // /help
    bot.command('help', async (ctx) => {
      await ctx.reply(
        `<b>Synapse System — Prikazy</b>\n\n` +
        `<b>=== LEADS ===</b>\n` +
        `/leads — poslednych 10 leadov\n` +
        `/stats — statistiky\n` +
        `/blacklist {meno} — pridaj na blacklist\n` +
        `/whitelist — zobraz blacklist\n\n` +
        `<b>=== BOOKING ===</b>\n` +
        `/bookings — nadchadzajuce\n\n` +
        `<b>=== AI CODER ===</b>\n` +
        `/code {prompt} — coding uloha\n` +
        `/review {code} — review\n` +
        `/explain {code} — vysvetli\n` +
        `/coder_history — poslednych 10\n\n` +
        `<b>=== FIGMA ===</b>\n` +
        `/design {url} — novy design task\n` +
        `/designs — zoznam\n\n` +
        `<b>=== WEB CLONER ===</b>\n` +
        `/clones — zoznam\n\n` +
        `<b>=== SYSTEM ===</b>\n` +
        `/help — tento zoznam`,
        { parse_mode: 'HTML' },
      );
    });

    // Dynamic command routing
    bot.on('message:text', async (ctx) => {
      const text = ctx.message.text;
      if (!text.startsWith('/')) return;

      const ownerChatId = this.telegramService.getOwnerChatId();
      if (ownerChatId && ctx.chat.id.toString() !== ownerChatId) return;

      const parts = text.split(' ');
      const cmd = parts[0].substring(1).toLowerCase().replace(/@.*$/, '');
      const args = parts.slice(1).join(' ');

      let handler = this.commandHandlers.get(cmd);
      let handlerArgs = args;

      // Direct match first, then prefix-based matching for /lead_{id}, /status_{id}_{S}, etc.
      if (!handler) {
        for (const [prefix, h] of this.commandHandlers.entries()) {
          if (cmd.startsWith(prefix + '_')) {
            handler = h;
            handlerArgs = cmd.substring(prefix.length + 1) + (args ? ' ' + args : '');
            break;
          }
        }
      }

      if (handler) {
        try {
          await handler(ctx.chat.id, handlerArgs);
        } catch (error) {
          this.logger.error(`Command /${cmd} failed`, (error as Error).message);
          await ctx.reply(`Chyba pri vykonavani /${cmd}: ${(error as Error).message}`);
        }
      }
    });
  }

  private setupCallbackHandler() {
    const bot = this.telegramService.bot;

    bot.on('callback_query:data', async (ctx) => {
      const data = ctx.callbackQuery.data;
      const chatId = ctx.callbackQuery.message?.chat.id;
      const messageId = ctx.callbackQuery.message?.message_id;

      if (!chatId || !messageId) {
        await ctx.answerCallbackQuery('Chyba');
        return;
      }

      const prefix = data.split('_').slice(0, 2).join('_');
      const handler = this.callbackHandlers.get(prefix);

      if (handler) {
        try {
          await handler(chatId, data, messageId);
          await ctx.answerCallbackQuery();
        } catch (error) {
          this.logger.error(`Callback ${prefix} failed`, (error as Error).message);
          await ctx.answerCallbackQuery('Chyba');
        }
      } else {
        await ctx.answerCallbackQuery('Neznama akcia');
      }
    });
  }
}
