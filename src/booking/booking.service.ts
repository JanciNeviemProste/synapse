import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { CalendarService } from './calendar.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { Booking, BookingStatus } from '@prisma/client';

export interface TimeSlot {
  start: string;
  end: string;
}

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private prisma: PrismaService,
    private telegramService: TelegramService,
    private calendarService: CalendarService,
  ) {}

  async createBooking(data: CreateBookingDto): Promise<Booking> {
    try {
      const booking = await this.prisma.booking.create({
        data: {
          clientName: data.clientName,
          clientEmail: data.clientEmail,
          clientPhone: data.clientPhone,
          dateTime: new Date(data.dateTime),
          notes: data.notes,
          leadId: data.leadId,
          status: BookingStatus.PENDING,
        },
      });

      this.logger.log(`Booking created: ${booking.id}`);

      try {
        const { meetLink, eventId } =
          await this.calendarService.createEvent(booking);

        const updatedBooking = await this.prisma.booking.update({
          where: { id: booking.id },
          data: {
            meetLink,
            calendarEventId: eventId,
            status: BookingStatus.CONFIRMED,
          },
        });

        await this.sendBookingNotification(updatedBooking);
        return updatedBooking;
      } catch (calendarError) {
        this.logger.error(
          'Calendar event creation failed, booking saved without calendar link',
          (calendarError as Error).message,
        );
        await this.sendBookingNotification(booking);
        return booking;
      }
    } catch (error) {
      this.logger.error('Failed to create booking', (error as Error).message);
      throw error;
    }
  }

  async getAvailableSlots(days: number): Promise<TimeSlot[]> {
    try {
      const now = new Date();
      const timeMin = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0,
        0,
        0,
      );
      const timeMax = new Date(
        timeMin.getTime() + days * 24 * 60 * 60 * 1000,
      );

      let busySlots: TimeSlot[] = [];
      try {
        busySlots = await this.calendarService.getFreeBusy(
          timeMin.toISOString(),
          timeMax.toISOString(),
        );
      } catch (error) {
        this.logger.warn(
          'Could not fetch busy slots from calendar, returning all slots',
          (error as Error).message,
        );
      }

      const existingBookings = await this.prisma.booking.findMany({
        where: {
          dateTime: { gte: timeMin, lte: timeMax },
          status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
        },
        select: { dateTime: true },
      });

      const bookedSlots: TimeSlot[] = existingBookings.map((b: { dateTime: Date }) => ({
        start: b.dateTime.toISOString(),
        end: new Date(b.dateTime.getTime() + 30 * 60 * 1000).toISOString(),
      }));

      const allBusy = [...busySlots, ...bookedSlots];
      const slots: TimeSlot[] = [];

      for (
        let day = new Date(timeMin);
        day < timeMax;
        day.setDate(day.getDate() + 1)
      ) {
        const dayOfWeek = day.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;

        for (let hour = 9; hour < 17; hour++) {
          for (let minute = 0; minute < 60; minute += 30) {
            const slotStart = new Date(day);
            slotStart.setHours(hour, minute, 0, 0);
            const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);

            if (slotStart <= now) continue;

            const isConflict = allBusy.some((busy) => {
              const busyStart = new Date(busy.start).getTime();
              const busyEnd = new Date(busy.end).getTime();
              return (
                slotStart.getTime() < busyEnd &&
                slotEnd.getTime() > busyStart
              );
            });

            if (!isConflict) {
              slots.push({
                start: slotStart.toISOString(),
                end: slotEnd.toISOString(),
              });
            }
          }
        }
      }

      return slots;
    } catch (error) {
      this.logger.error(
        'Failed to get available slots',
        (error as Error).message,
      );
      throw error;
    }
  }

  async getBookings(status?: string): Promise<Booking[]> {
    try {
      const where = status
        ? { status: status as BookingStatus }
        : {};

      return await this.prisma.booking.findMany({
        where,
        orderBy: { dateTime: 'asc' },
      });
    } catch (error) {
      this.logger.error('Failed to get bookings', (error as Error).message);
      throw error;
    }
  }

  async getBookingById(id: string): Promise<Booking> {
    try {
      const booking = await this.prisma.booking.findUnique({
        where: { id },
      });

      if (!booking) {
        throw new NotFoundException(`Booking ${id} not found`);
      }

      return booking;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(
        `Failed to get booking ${id}`,
        (error as Error).message,
      );
      throw error;
    }
  }

  async cancelBooking(id: string): Promise<Booking> {
    try {
      const booking = await this.prisma.booking.findUnique({
        where: { id },
      });

      if (!booking) {
        throw new NotFoundException(`Booking ${id} not found`);
      }

      const updated = await this.prisma.booking.update({
        where: { id },
        data: { status: BookingStatus.CANCELLED },
      });

      this.logger.log(`Booking ${id} cancelled`);

      await this.telegramService.sendToOwner(
        `<b>Booking Cancelled</b>\n\nClient: ${updated.clientName}\nEmail: ${updated.clientEmail}\nDate: ${updated.dateTime.toISOString()}`,
      );

      return updated;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(
        `Failed to cancel booking ${id}`,
        (error as Error).message,
      );
      throw error;
    }
  }

  private async sendBookingNotification(booking: Booking): Promise<void> {
    try {
      const dateStr = booking.dateTime.toLocaleString('sk-SK', {
        timeZone: 'Europe/Bratislava',
        dateStyle: 'full',
        timeStyle: 'short',
      });

      const message = [
        '<b>New Booking</b>',
        '',
        `Client: ${booking.clientName}`,
        `Email: ${booking.clientEmail}`,
        booking.clientPhone ? `Phone: ${booking.clientPhone}` : '',
        `Date: ${dateStr}`,
        `Status: ${booking.status}`,
        booking.meetLink ? `Meet: ${booking.meetLink}` : '',
        booking.notes ? `Notes: ${booking.notes}` : '',
        '',
        `ID: <code>${booking.id}</code>`,
      ]
        .filter(Boolean)
        .join('\n');

      await this.telegramService.sendToOwner(message);
    } catch (error) {
      this.logger.error(
        'Failed to send booking notification',
        (error as Error).message,
      );
    }
  }
}
