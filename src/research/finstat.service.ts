import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import puppeteer, { Browser } from 'puppeteer';

export interface FinstatCompanyData {
  companyName: string;
  ico: string;
  revenue: number;
  employeeCount: number;
  profit: number;
  found: boolean;
}

@Injectable()
export class FinstatService {
  private readonly logger = new Logger(FinstatService.name);
  private readonly timeout = 30000;

  constructor(private configService: ConfigService) {}

  async getCompanyData(ico: string): Promise<FinstatCompanyData> {
    const result: FinstatCompanyData = {
      companyName: '',
      ico,
      revenue: 0,
      employeeCount: 0,
      profit: 0,
      found: false,
    };

    if (!ico) {
      this.logger.warn('Empty ICO provided — skipping FinStat lookup');
      return result;
    }

    let browser: Browser | null = null;

    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();

      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      );

      const cleanIco = ico.replace(/\s/g, '');
      const url = `https://finstat.sk/firma/${cleanIco}`;

      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: this.timeout,
      });

      const companyData = await page.evaluate(() => {
        const parseNumber = (text: string): number => {
          const cleaned = text
            .replace(/[€\s]/g, '')
            .replace(/\u00a0/g, '')
            .replace(',', '.')
            .replace(/[^\d.-]/g, '');
          const num = parseFloat(cleaned);
          return isNaN(num) ? 0 : num;
        };

        const getTextByLabel = (label: string): string => {
          const allElements = document.querySelectorAll(
            'td, th, dt, dd, span, div, label',
          );
          for (const el of allElements) {
            if (el.textContent?.trim().includes(label)) {
              const nextSibling = el.nextElementSibling;
              if (nextSibling) {
                return nextSibling.textContent?.trim() || '';
              }
              const parent = el.parentElement;
              if (parent) {
                const nextRow = parent.nextElementSibling;
                if (nextRow) {
                  return nextRow.textContent?.trim() || '';
                }
              }
            }
          }
          return '';
        };

        const companyNameEl = document.querySelector(
          'h1, .company-name, [class*="name"]',
        );
        const companyName = companyNameEl?.textContent?.trim() || '';

        const revenueText =
          getTextByLabel('Tržby') ||
          getTextByLabel('Výnosy') ||
          getTextByLabel('Revenue');
        const employeeText =
          getTextByLabel('Zamestnanci') ||
          getTextByLabel('Employees') ||
          getTextByLabel('Počet zamestnancov');
        const profitText =
          getTextByLabel('Zisk') ||
          getTextByLabel('Profit') ||
          getTextByLabel('Výsledok hospodárenia');

        let employeeCount = 0;
        const empMatch = employeeText.match(/(\d+)/);
        if (empMatch) {
          employeeCount = parseInt(empMatch[1], 10);
        }

        return {
          companyName,
          revenue: parseNumber(revenueText),
          employeeCount,
          profit: parseNumber(profitText),
        };
      });

      if (companyData.companyName || companyData.revenue > 0) {
        result.companyName = companyData.companyName;
        result.revenue = companyData.revenue;
        result.employeeCount = companyData.employeeCount;
        result.profit = companyData.profit;
        result.found = true;

        this.logger.log(
          `FinStat data for ICO ${ico}: revenue=${result.revenue}, employees=${result.employeeCount}`,
        );
      } else {
        this.logger.debug(`No FinStat data found for ICO ${ico}`);
      }

      await page.close();

      return result;
    } catch (error) {
      this.logger.error(
        `FinStat lookup failed for ICO ${ico}`,
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
}
