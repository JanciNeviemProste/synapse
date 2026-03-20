import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  Res,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import * as path from 'path';

@Controller()
export class BookingController {
  private readonly logger = new Logger(BookingController.name);

  constructor(private bookingService: BookingService) {}

  @Get('booking/public')
  renderPublicPage(
    @Query('ref') ref: string | undefined,
    @Res() res: Response,
  ): void {
    try {
      res.render(
        path.join('booking', 'public'),
        { ref: ref || null },
      );
    } catch (error) {
      this.logger.error(
        'Failed to render public booking page',
        (error as Error).message,
      );
      res.status(500).send('Internal Server Error');
    }
  }

  @Get('booking/admin')
  renderAdminPage(@Res() res: Response): void {
    try {
      res.render(path.join('booking', 'admin'));
    } catch (error) {
      this.logger.error(
        'Failed to render admin booking page',
        (error as Error).message,
      );
      res.status(500).send('Internal Server Error');
    }
  }

  @Get('api/booking/slots')
  async getAvailableSlots(@Query('days') days?: string) {
    try {
      const numDays = days ? parseInt(days, 10) : 14;
      const validDays = isNaN(numDays) || numDays < 1 ? 14 : Math.min(numDays, 60);
      const slots = await this.bookingService.getAvailableSlots(validDays);
      return { success: true, data: slots };
    } catch (error) {
      this.logger.error(
        'Failed to get available slots',
        (error as Error).message,
      );
      return { success: false, error: 'Failed to get available slots' };
    }
  }

  @Post('api/booking')
  async createBooking(@Body() dto: CreateBookingDto) {
    try {
      const booking = await this.bookingService.createBooking(dto);
      return { success: true, data: booking };
    } catch (error) {
      this.logger.error(
        'Failed to create booking',
        (error as Error).message,
      );
      return { success: false, error: 'Failed to create booking' };
    }
  }

  @Get('api/booking')
  async getBookings(@Query('status') status?: string) {
    try {
      const bookings = await this.bookingService.getBookings(status);
      return { success: true, data: bookings };
    } catch (error) {
      this.logger.error(
        'Failed to get bookings',
        (error as Error).message,
      );
      return { success: false, error: 'Failed to get bookings' };
    }
  }

  @Get('api/booking/:id')
  async getBooking(@Param('id') id: string) {
    try {
      const booking = await this.bookingService.getBookingById(id);
      return { success: true, data: booking };
    } catch (error) {
      this.logger.error(
        `Failed to get booking ${id}`,
        (error as Error).message,
      );
      return { success: false, error: 'Booking not found' };
    }
  }

  @Delete('api/booking/:id')
  async cancelBooking(@Param('id') id: string) {
    try {
      const booking = await this.bookingService.cancelBooking(id);
      return { success: true, data: booking };
    } catch (error) {
      this.logger.error(
        `Failed to cancel booking ${id}`,
        (error as Error).message,
      );
      return { success: false, error: 'Failed to cancel booking' };
    }
  }
}
