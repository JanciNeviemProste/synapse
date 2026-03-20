import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import puppeteer, { Browser } from 'puppeteer';

export interface OrsrCompanyResult {
  companyName: string;
  ico: string;
  foundingDate: string;
  registrationCourt: string;
  address: string;
  found: boolean;
  source: 'orsr' | 'zrsr' | '';
}

@Injectable()
export class OrsrService {
  private readonly logger = new Logger(OrsrService.name);
  private readonly timeout = 30000;

  constructor(private configService: ConfigService) {}

  async searchCompany(name: string): Promise<OrsrCompanyResult> {
    const result: OrsrCompanyResult = {
      companyName: '',
      ico: '',
      foundingDate: '',
      registrationCourt: '',
      address: '',
      found: false,
      source: '',
    };

    let browser: Browser | null = null;

    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const orsrResult = await this.searchOrsr(browser, name);
      if (orsrResult.found) {
        this.logger.log(`Found company "${orsrResult.companyName}" in ORSR`);
        return orsrResult;
      }

      const zrsrResult = await this.searchZrsr(browser, name);
      if (zrsrResult.found) {
        this.logger.log(`Found company "${zrsrResult.companyName}" in ZRSR`);
        return zrsrResult;
      }

      this.logger.debug(`No company found for "${name}" in ORSR/ZRSR`);
      return result;
    } catch (error) {
      this.logger.error(
        `Company search failed for "${name}"`,
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

  private async searchOrsr(
    browser: Browser,
    name: string,
  ): Promise<OrsrCompanyResult> {
    const result: OrsrCompanyResult = {
      companyName: '',
      ico: '',
      foundingDate: '',
      registrationCourt: '',
      address: '',
      found: false,
      source: '',
    };

    const page = await browser.newPage();

    try {
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      );

      const searchUrl = `https://www.orsr.sk/hladaj_subjekt.asp?ESSION=&OBMESSION=&SID=0&OBMENO=${encodeURIComponent(name)}&PF=0&R=on`;
      await page.goto(searchUrl, {
        waitUntil: 'domcontentloaded',
        timeout: this.timeout,
      });

      const firstResultLink = await page.evaluate(() => {
        const link = document.querySelector(
          'table.tabResult a[href*="vypis.asp"]',
        );
        return link ? (link as HTMLAnchorElement).href : null;
      });

      if (!firstResultLink) {
        return result;
      }

      await page.goto(firstResultLink, {
        waitUntil: 'domcontentloaded',
        timeout: this.timeout,
      });

      const companyData = await page.evaluate(() => {
        const getText = (label: string): string => {
          const rows = document.querySelectorAll('tr');
          for (const row of rows) {
            const cells = row.querySelectorAll('td');
            for (let i = 0; i < cells.length; i++) {
              if (cells[i].textContent?.trim().includes(label) && cells[i + 1]) {
                return cells[i + 1].textContent?.trim() || '';
              }
            }
          }
          return '';
        };

        return {
          companyName: getText('Obchodné meno') || getText('Názov'),
          ico: getText('IČO'),
          foundingDate:
            getText('Dátum zápisu') || getText('Vznik'),
          registrationCourt: getText('Okresný súd'),
          address: getText('Sídlo'),
        };
      });

      if (companyData.companyName || companyData.ico) {
        result.companyName = companyData.companyName;
        result.ico = companyData.ico.replace(/\s/g, '');
        result.foundingDate = companyData.foundingDate;
        result.registrationCourt = companyData.registrationCourt;
        result.address = companyData.address;
        result.found = true;
        result.source = 'orsr';
      }

      return result;
    } catch (error) {
      this.logger.error('ORSR search failed', (error as Error).message);
      return result;
    } finally {
      try {
        await page.close();
      } catch {
        // Page already closed
      }
    }
  }

  private async searchZrsr(
    browser: Browser,
    name: string,
  ): Promise<OrsrCompanyResult> {
    const result: OrsrCompanyResult = {
      companyName: '',
      ico: '',
      foundingDate: '',
      registrationCourt: '',
      address: '',
      found: false,
      source: '',
    };

    const page = await browser.newPage();

    try {
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      );

      const searchUrl = `https://www.zrsr.sk/hladaj_ico.aspx?search=${encodeURIComponent(name)}`;
      await page.goto(searchUrl, {
        waitUntil: 'domcontentloaded',
        timeout: this.timeout,
      });

      const companyData = await page.evaluate(() => {
        const getText = (selector: string): string => {
          const el = document.querySelector(selector);
          return el?.textContent?.trim() || '';
        };

        const rows = document.querySelectorAll('table.result tr, .search-result tr');
        let companyName = '';
        let ico = '';
        let foundingDate = '';
        let address = '';

        for (const row of rows) {
          const text = row.textContent || '';
          if (text.includes('IČO') || text.includes('ICO')) {
            const match = text.match(/(\d{6,8})/);
            if (match) ico = match[1];
          }
          const nameCell = row.querySelector('td:first-child a, td:first-child');
          if (nameCell && !companyName) {
            const cellText = nameCell.textContent?.trim() || '';
            if (cellText.length > 2 && !cellText.includes('IČO')) {
              companyName = cellText;
            }
          }
        }

        const allText = document.body.textContent || '';
        const dateMatch = allText.match(
          /(?:Vznik|Dátum vzniku|Založená)[:\s]*(\d{1,2}\.\d{1,2}\.\d{4})/i,
        );
        if (dateMatch) foundingDate = dateMatch[1];

        return { companyName, ico, foundingDate, address };
      });

      if (companyData.companyName || companyData.ico) {
        result.companyName = companyData.companyName;
        result.ico = companyData.ico.replace(/\s/g, '');
        result.foundingDate = companyData.foundingDate;
        result.address = companyData.address;
        result.found = true;
        result.source = 'zrsr';
      }

      return result;
    } catch (error) {
      this.logger.error('ZRSR search failed', (error as Error).message);
      return result;
    } finally {
      try {
        await page.close();
      } catch {
        // Page already closed
      }
    }
  }
}
