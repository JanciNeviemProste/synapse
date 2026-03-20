import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { TelegramUpdate } from '../telegram/telegram.update';
import { TelegramService } from '../telegram/telegram.service';
import { BookingService } from './booking.service';
import { InlineKeyboard } from 'grammy';
import {
  bold,
  code,
  formatDate,
} from '../common/utils/telegram-formatter';

@Injectable()
export class BookingTelegramHandler implements OnModuleInit {
  private readonly logger = new Logger(BookingTelegramHandler.name);

  constructor(
    private telegramUpdate: TelegramUpdate,
    private telegramService: TelegramService,
    private bookingService: BookingService,
  ) {}

  onModuleInit() {
    this.telegramUpdate.registerCommand('bookings', this.handleBookings.bind(this));
    this.telegramUpdate.registerCommand('booking', this.handleBookingDetail.bind(this));

    this.telegramUpdate.registerCallback('booking_cancel', this.handleBookingCancel.bind(this));

    this.logger.log('Booking Telegram commands registered');
  }

  private async handleBookings(chatId: number): Promise<void> {
    try {
      const bookings = await this.bookingService.getBookings();
      const upcoming = bookings.filter(
        (b) => b.status !== 'CANCELLED' && new Date(b.dateTime) > new Date(),
      );

      if (upcoming.length === 0) {
        await this.telegramService.sendMessage(chatId, 'Žiadne nadchádzajúce bookings.');
        return;
      }

      let message = `📅 ${bold('Nadchádzajúce bookings:')}\n\n`;

      for (const booking of upcoming.slice(0, 10)) {
        const dateStr = new Date(booking.dateTime).toLocaleString('sk-SK', {
          timeZone: 'Europe/Bratislava',
          dateStyle: 'medium',
          timeStyle: 'short',
        });

        message +=
          `• ${bold(booking.clientName)}\n` +
          `  📧 ${booking.clientEmail}\n` +
          `  📅 ${dateStr}\n` +
          `  Status: ${booking.status}\n` +
          (booking.meetLink ? `  🔗 ${booking.meetLink}\n` : '') +
          `  ID: ${code(booking.id.substring(0, 8))}\n\n`;
      }

      await this.telegramService.sendMessage(chatId, message);
    } catch (error) {
      await this.telegramService.sendMessage(chatId, `❌ Chyba: ${(error as Error).message}`);
    }
  }

  private async handleBookingDetail(chatId: number, args: string): Promise<void> {
    const idPrefix = args.trim();
    if (!idPrefix) {
      await this.telegramService.sendMessage(chatId, 'Použitie: /booking_{id}');
      return;
    }

    try {
      const booking = await this.bookingService.getBookingById(idPrefix);

      const dateStr = new Date(booking.dateTime).toLocaleString('sk-SK', {
        timeZone: 'Europe/Bratislava',
        dateStyle: 'full',
        timeStyle: 'short',
      });

      let message =
        `📅 ${bold('Booking Detail')}\n\n` +
        `${bold('Klient:')} ${booking.clientName}\n` +
        `${bold('Email:')} ${booking.clientEmail}\n` +
        (booking.clientPhone ? `${bold('Telefón:')} ${booking.clientPhone}\n` : '') +
        `${bold('Dátum:')} ${dateStr}\n` +
        `${bold('Status:')} ${booking.status}\n` +
        (booking.meetLink ? `${bold('Meet:')} ${booking.meetLink}\n` : '') +
        (booking.notes ? `${bold('Poznámky:')} ${booking.notes}\n` : '') +
        `\nID: ${code(booking.id.substring(0, 8))}`;

      const keyboard = new InlineKeyboard()
        .text('Zrušiť', `booking_cancel_${booking.id}`);

      await this.telegramService.sendWithKeyboard(chatId, message, keyboard);
    } catch (error) {
      await this.telegramService.sendMessage(chatId, `❌ Booking nenájdený.`);
    }
  }

  private async handleBookingCancel(chatId: number, data: string): Promise<void> {
    const bookingId = data.replace('booking_cancel_', '');
    try {
      await this.bookingService.cancelBooking(bookingId);
      await this.telegramService.sendMessage(chatId, `✅ Booking zrušený.`);
    } catch (error) {
      await this.telegramService.sendMessage(chatId, `❌ Chyba: ${(error as Error).message}`);
    }
  }
}
