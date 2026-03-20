import { Module } from '@nestjs/common';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { CalendarService } from './calendar.service';
import { BookingTelegramHandler } from './booking-telegram.handler';
import { TelegramModule } from '../telegram/telegram.module';
import { GmailModule } from '../gmail/gmail.module';

@Module({
  imports: [TelegramModule, GmailModule],
  providers: [BookingService, CalendarService, BookingTelegramHandler],
  controllers: [BookingController],
  exports: [BookingService],
})
export class BookingModule {}
