import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import puppeteer, { Browser } from 'puppeteer';

export interface GoogleSearchResult {
  linkedInUrl: string;
  companyName: string;
  companyIco: string;
  websiteUrl: string;
  otherLinks: string[];
}

@Injectable()
export class GoogleSearchService {
  private readonly logger = new Logger(GoogleSearchService.name);
  private readonly timeout = 30000;

  constructor(private configService: ConfigService) {}

  async searchPerson(name: string): Promise<GoogleSearchResult> {
    const result: GoogleSearchResult = {
      linkedInUrl: '',
      companyName: '',
      companyIco: '',
      websiteUrl: '',
      otherLinks: [],
    };

    let browser: Browser | null = null;

    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const linkedInResult = await this.searchQuery(
        browser,
        `${name} LinkedIn`,
      );
      const companyResult = await this.searchQuery(
        browser,
        `${name} firma ICO`,
      );

      for (const link of linkedInResult) {
        if (
          link.includes('linkedin.com/in/') ||
          link.includes('linkedin.com/pub/')
        ) {
          result.linkedInUrl = link;
          break;
        }
      }

      for (const link of companyResult) {
        if (
          !link.includes('google.') &&
          !link.includes('linkedin.com') &&
          !link.includes('facebook.com')
        ) {
          result.otherLinks.push(link);
        }
      }

      const icoMatch = companyResult.join(' ').match(/ICO[:\s]*(\d{6,8})/i);
      if (icoMatch) {
        result.companyIco = icoMatch[1];
      }

      this.logger.log(
        `Google search completed for "${name}" — LinkedIn: ${result.linkedInUrl ? 'found' : 'not found'}, ICO: ${result.companyIco || 'not found'}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Google search failed for "${name}"`,
        (error as Error).message,
      );
      return result;
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          this.logger.error(
            'Failed to close browser',
            (closeError as Error).message,
          );
        }
      }
    }
  }

  private async searchQuery(
    browser: Browser,
    query: string,
  ): Promise<string[]> {
    const page = await browser.newPage();

    try {
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      );

      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=sk`;
      await page.goto(searchUrl, {
        waitUntil: 'domcontentloaded',
        timeout: this.timeout,
      });

      const links = await page.evaluate(() => {
        const anchors = document.querySelectorAll('div#search a[href]');
        const results: string[] = [];
        anchors.forEach((a) => {
          const href = a.getAttribute('href');
          if (
            href &&
            href.startsWith('http') &&
            !href.includes('google.com/search')
          ) {
            results.push(href);
          }
        });
        return results.slice(0, 10);
      });

      return links;
    } catch (error) {
      this.logger.error(
        `Search query failed for "${query}"`,
        (error as Error).message,
      );
      return [];
    } finally {
      try {
        await page.close();
      } catch {
        // Page already closed
      }
    }
  }
}
