import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, calendar_v3 } from 'googleapis';
import { GmailService } from '../gmail/gmail.service';

interface BookingData {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  dateTime: Date;
  notes: string | null;
}

interface FreeBusySlot {
  start: string;
  end: string;
}

@Injectable()
export class CalendarService implements OnModuleInit {
  private readonly logger = new Logger(CalendarService.name);
  private calendar!: calendar_v3.Calendar;
  private calendarId!: string;
  private initialized = false;

  constructor(
    private configService: ConfigService,
    private gmailService: GmailService,
  ) {}

  onModuleInit(): void {
    try {
      const oauth2Client = this.gmailService.getOAuth2Client();
      this.calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      this.calendarId =
        this.configService.get<string>('google.calendarId') || 'primary';
      this.initialized = true;
      this.logger.log('Calendar service initialized');
    } catch (error) {
      this.logger.warn(
        'Calendar service not initialized — Gmail OAuth2 not available',
      );
      this.logger.debug((error as Error).message);
    }
  }

  async createEvent(
    booking: BookingData,
  ): Promise<{ meetLink: string; eventId: string }> {
    if (!this.initialized) {
      throw new Error('Calendar service not initialized');
    }

    try {
      const startTime = new Date(booking.dateTime);
      const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);

      const event: calendar_v3.Schema$Event = {
        summary: `Consultation — ${booking.clientName}`,
        description: `Booking ID: ${booking.id}\nClient: ${booking.clientName}\nEmail: ${booking.clientEmail}${booking.clientPhone ? `\nPhone: ${booking.clientPhone}` : ''}${booking.notes ? `\nNotes: ${booking.notes}` : ''}`,
        start: {
          dateTime: startTime.toISOString(),
          timeZone: 'Europe/Bratislava',
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: 'Europe/Bratislava',
        },
        attendees: [{ email: booking.clientEmail }],
        conferenceData: {
          createRequest: {
            requestId: booking.id,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 60 },
            { method: 'popup', minutes: 15 },
          ],
        },
      };

      const response = await this.calendar.events.insert({
        calendarId: this.calendarId,
        requestBody: event,
        conferenceDataVersion: 1,
        sendUpdates: 'all',
      });

      const meetLink =
        response.data.conferenceData?.entryPoints?.find(
          (ep) => ep.entryPointType === 'video',
        )?.uri || '';
      const eventId = response.data.id || '';

      this.logger.log(
        `Calendar event created: ${eventId} with Meet link: ${meetLink}`,
      );

      return { meetLink, eventId };
    } catch (error) {
      this.logger.error(
        'Failed to create calendar event',
        (error as Error).message,
      );
      throw error;
    }
  }

  async getFreeBusy(timeMin: string, timeMax: string): Promise<FreeBusySlot[]> {
    if (!this.initialized) {
      this.logger.warn('Calendar service not initialized — returning empty');
      return [];
    }

    try {
      const response = await this.calendar.freebusy.query({
        requestBody: {
          timeMin,
          timeMax,
          timeZone: 'Europe/Bratislava',
          items: [{ id: this.calendarId }],
        },
      });

      const busy =
        response.data.calendars?.[this.calendarId]?.busy || [];

      return busy
        .filter(
          (slot): slot is { start: string; end: string } =>
            typeof slot.start === 'string' && typeof slot.end === 'string',
        )
        .map((slot) => ({
          start: slot.start,
          end: slot.end,
        }));
    } catch (error) {
      this.logger.error('Failed to get free/busy data', (error as Error).message);
      throw error;
    }
  }
}
