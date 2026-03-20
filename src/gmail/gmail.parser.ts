import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';

export interface FacebookNotification {
  authorName: string;
  profileUrl: string;
  messengerUrl: string;
  postUrl: string;
  groupName: string;
  postText: string;
}

@Injectable()
export class GmailParser {
  private readonly logger = new Logger(GmailParser.name);

  parseFacebookNotification(
    htmlBody: string,
    snippet: string,
  ): FacebookNotification {
    const result: FacebookNotification = {
      authorName: '',
      profileUrl: '',
      messengerUrl: '',
      postUrl: '',
      groupName: '',
      postText: '',
    };

    try {
      if (htmlBody) {
        const htmlParsed = this.parseFromHtml(htmlBody);
        if (htmlParsed.authorName) {
          return htmlParsed;
        }

        const plainTextParsed = this.parseFromPlainText(htmlBody);
        if (plainTextParsed.authorName) {
          return plainTextParsed;
        }
      }

      return this.parseFromSnippet(snippet, result);
    } catch (error) {
      this.logger.error(
        'Failed to parse Facebook notification',
        (error as Error).message,
      );
      return this.parseFromSnippet(snippet, result);
    }
  }

  private parseFromHtml(htmlBody: string): FacebookNotification {
    const result: FacebookNotification = {
      authorName: '',
      profileUrl: '',
      messengerUrl: '',
      postUrl: '',
      groupName: '',
      postText: '',
    };

    try {
      const $ = cheerio.load(htmlBody);

      const profileLink = $('a[href*="facebook.com/profile.php"], a[href*="facebook.com/n/"]').first();
      if (profileLink.length > 0) {
        result.authorName = profileLink.text().trim();
        result.profileUrl = this.cleanFacebookUrl(profileLink.attr('href') || '');
      }

      if (!result.authorName) {
        const boldText = $('b, strong').first().text().trim();
        if (boldText) {
          result.authorName = boldText;
        }
      }

      if (!result.authorName) {
        const allLinks = $('a[href*="facebook.com"]');
        allLinks.each((_, el) => {
          const linkText = $(el).text().trim();
          const href = $(el).attr('href') || '';
          if (
            linkText &&
            !result.authorName &&
            !href.includes('/groups/') &&
            !linkText.toLowerCase().includes('view') &&
            !linkText.toLowerCase().includes('see') &&
            !linkText.toLowerCase().includes('reply') &&
            linkText.length > 1 &&
            linkText.length < 100
          ) {
            result.authorName = linkText;
            result.profileUrl = this.cleanFacebookUrl(href);
          }
        });
      }

      if (result.profileUrl) {
        result.messengerUrl = this.deriveMessengerUrl(result.profileUrl);
      }

      const postLinks = $('a').filter((_, el) => {
        const text = $(el).text().trim().toLowerCase();
        return text === 'view post' || text === 'see post';
      });
      if (postLinks.length > 0) {
        result.postUrl = this.cleanFacebookUrl(postLinks.first().attr('href') || '');
      }

      const groupLink = $('a[href*="/groups/"]').first();
      if (groupLink.length > 0) {
        result.groupName = groupLink.text().trim();
      }

      const textContainers = $('td, div, p, span');
      const textParts: string[] = [];
      textContainers.each((_, el) => {
        const text = $(el)
          .clone()
          .children('a, table, style, script')
          .remove()
          .end()
          .text()
          .trim();
        if (
          text &&
          text.length > 20 &&
          text.length < 2000 &&
          !text.includes('View Post') &&
          !text.includes('See Post') &&
          !text.includes('Reply') &&
          !text.includes('notification was sent') &&
          !text.includes('unsubscribe')
        ) {
          textParts.push(text);
        }
      });

      if (textParts.length > 0) {
        const sorted = textParts.sort((a, b) => b.length - a.length);
        result.postText = sorted[0].substring(0, 1000);
      }

      return result;
    } catch (error) {
      this.logger.error(
        'Failed to parse HTML notification',
        (error as Error).message,
      );
      return result;
    }
  }

  private parseFromPlainText(htmlBody: string): FacebookNotification {
    const result: FacebookNotification = {
      authorName: '',
      profileUrl: '',
      messengerUrl: '',
      postUrl: '',
      groupName: '',
      postText: '',
    };

    try {
      const $ = cheerio.load(htmlBody);
      const plainText = $.text();

      const nameMatch = plainText.match(
        /^([A-Z][a-záčďéěíňóřšťúůýžľôäñ]+\s+[A-Z][a-záčďéěíňóřšťúůýžľôäñ]+)/m,
      );
      if (nameMatch) {
        result.authorName = nameMatch[1].trim();
      }

      const urlMatches = htmlBody.match(
        /https?:\/\/[^\s"'<>]+facebook\.com[^\s"'<>]*/g,
      );
      if (urlMatches) {
        for (const url of urlMatches) {
          const cleaned = this.cleanFacebookUrl(url);
          if (
            cleaned.includes('/profile.php') ||
            (cleaned.match(/facebook\.com\/[a-zA-Z0-9.]+\/?$/) &&
              !cleaned.includes('/groups/') &&
              !cleaned.includes('/posts/'))
          ) {
            result.profileUrl = cleaned;
            result.messengerUrl = this.deriveMessengerUrl(cleaned);
          }
          if (
            cleaned.includes('/posts/') ||
            cleaned.includes('/permalink/')
          ) {
            result.postUrl = cleaned;
          }
          if (cleaned.includes('/groups/') && !result.groupName) {
            const groupMatch = cleaned.match(/\/groups\/([^/?]+)/);
            if (groupMatch) {
              result.groupName = decodeURIComponent(groupMatch[1]);
            }
          }
        }
      }

      if (!result.postText) {
        const lines = plainText
          .split('\n')
          .map((l) => l.trim())
          .filter(
            (l) =>
              l.length > 20 &&
              !l.includes('View Post') &&
              !l.includes('unsubscribe'),
          );
        if (lines.length > 0) {
          result.postText = lines[0].substring(0, 1000);
        }
      }

      return result;
    } catch (error) {
      this.logger.error(
        'Failed to parse plain text notification',
        (error as Error).message,
      );
      return result;
    }
  }

  private parseFromSnippet(
    snippet: string,
    base: FacebookNotification,
  ): FacebookNotification {
    const result = { ...base };

    if (!result.authorName && snippet) {
      const nameMatch = snippet.match(
        /^([A-Z][a-záčďéěíňóřšťúůýžľôäñ]+(?:\s+[A-Z][a-záčďéěíňóřšťúůýžľôäñ]+)+)/,
      );
      if (nameMatch) {
        result.authorName = nameMatch[1].trim();
      }
    }

    if (!result.postText && snippet) {
      result.postText = snippet.substring(0, 500);
    }

    return result;
  }

  private cleanFacebookUrl(url: string): string {
    try {
      const decoded = decodeURIComponent(url);
      const fbRedirectMatch = decoded.match(
        /[?&]u=(https?[^&]+facebook\.com[^&]*)/,
      );
      if (fbRedirectMatch) {
        return decodeURIComponent(fbRedirectMatch[1]);
      }

      const cleanUrl = decoded.split('?')[0];
      if (cleanUrl.includes('facebook.com')) {
        return cleanUrl;
      }

      return decoded;
    } catch {
      return url;
    }
  }

  private deriveMessengerUrl(profileUrl: string): string {
    try {
      const profileIdMatch = profileUrl.match(
        /profile\.php\?id=(\d+)/,
      );
      if (profileIdMatch) {
        return `https://m.me/${profileIdMatch[1]}`;
      }

      const usernameMatch = profileUrl.match(
        /facebook\.com\/([a-zA-Z0-9.]+)\/?$/,
      );
      if (usernameMatch) {
        return `https://m.me/${usernameMatch[1]}`;
      }

      return '';
    } catch {
      return '';
    }
  }
}
