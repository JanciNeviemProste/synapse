import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, gmail_v1, Auth } from 'googleapis';

export interface GmailMessage {
  messageId: string;
  subject: string;
  htmlBody: string;
  snippet: string;
  receivedAt: Date;
}

@Injectable()
export class GmailService implements OnModuleInit {
  private readonly logger = new Logger(GmailService.name);
  private oauth2Client!: Auth.OAuth2Client;
  private gmail!: gmail_v1.Gmail;
  private initialized = false;

  constructor(private configService: ConfigService) {}

  onModuleInit(): void {
    const clientId = this.configService.get<string>('gmail.clientId');
    const clientSecret = this.configService.get<string>('gmail.clientSecret');
    const refreshToken = this.configService.get<string>('gmail.refreshToken');

    if (!clientId || !clientSecret || !refreshToken) {
      this.logger.warn(
        'Gmail OAuth2 credentials not fully configured — Gmail service disabled',
      );
      return;
    }

    try {
      this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
      this.oauth2Client.setCredentials({ refresh_token: refreshToken });

      this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
      this.initialized = true;
      this.logger.log('Gmail service initialized with OAuth2');
    } catch (error) {
      this.logger.error(
        'Failed to initialize Gmail OAuth2 client',
        (error as Error).message,
      );
    }
  }

  getOAuth2Client(): Auth.OAuth2Client {
    if (!this.initialized) {
      throw new Error('Gmail OAuth2 client not initialized');
    }
    return this.oauth2Client;
  }

  async fetchUnreadFacebookEmails(): Promise<GmailMessage[]> {
    if (!this.initialized) {
      this.logger.warn('Gmail service not initialized — skipping fetch');
      return [];
    }

    try {
      const query =
        'from:(facebookmail.com OR notification@facebook.com) is:unread';

      const listResponse = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 20,
      });

      const messageIds = listResponse.data.messages || [];

      if (messageIds.length === 0) {
        this.logger.debug('No unread Facebook emails found');
        return [];
      }

      this.logger.log(`Found ${messageIds.length} unread Facebook emails`);

      const messages: GmailMessage[] = [];

      for (const msg of messageIds) {
        if (!msg.id) continue;

        try {
          const fullMessage = await this.gmail.users.messages.get({
            userId: 'me',
            id: msg.id,
            format: 'full',
          });

          const parsed = this.parseGmailMessage(fullMessage.data);
          if (parsed) {
            messages.push(parsed);
          }
        } catch (error) {
          this.logger.error(
            `Failed to fetch message ${msg.id}`,
            (error as Error).message,
          );
        }
      }

      return messages;
    } catch (error) {
      this.logger.error(
        'Failed to fetch unread Facebook emails',
        (error as Error).message,
      );
      return [];
    }
  }

  async markAsRead(messageId: string): Promise<void> {
    if (!this.initialized) {
      this.logger.warn('Gmail service not initialized — cannot mark as read');
      return;
    }

    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['UNREAD'],
        },
      });

      this.logger.debug(`Marked message ${messageId} as read`);
    } catch (error) {
      this.logger.error(
        `Failed to mark message ${messageId} as read`,
        (error as Error).message,
      );
    }
  }

  private parseGmailMessage(
    message: gmail_v1.Schema$Message,
  ): GmailMessage | null {
    try {
      const headers = message.payload?.headers || [];
      const subject =
        headers.find((h) => h.name?.toLowerCase() === 'subject')?.value ||
        '(no subject)';
      const dateHeader =
        headers.find((h) => h.name?.toLowerCase() === 'date')?.value || '';

      const htmlBody = this.extractHtmlBody(message.payload || {});
      const snippet = message.snippet || '';
      const receivedAt = dateHeader ? new Date(dateHeader) : new Date();

      return {
        messageId: message.id || '',
        subject,
        htmlBody,
        snippet,
        receivedAt,
      };
    } catch (error) {
      this.logger.error(
        'Failed to parse Gmail message',
        (error as Error).message,
      );
      return null;
    }
  }

  private extractHtmlBody(payload: gmail_v1.Schema$MessagePart): string {
    if (payload.mimeType === 'text/html' && payload.body?.data) {
      return Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }

    if (payload.parts) {
      for (const part of payload.parts) {
        const html = this.extractHtmlBody(part);
        if (html) return html;
      }
    }

    if (payload.body?.data) {
      return Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }

    return '';
  }
}
