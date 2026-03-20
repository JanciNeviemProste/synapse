import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { AiService } from '../ai/ai.service';
import { CreateCloneDto } from './dto/create-clone.dto';
import { CloneRequest, CloneStatus } from '@prisma/client';
import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

const CLONE_TRANSFORM_PROMPT = `You are an expert web developer specializing in website personalization and transformation.

You will receive:
1. The original HTML source of a website
2. A screenshot of the original website
3. Client's business information

Your task: Transform the original website into a personalized version for the client's business while maintaining the same layout, design quality, and structure.

TRANSFORMATION RULES:
- Keep the exact same layout, structure, and design patterns
- Replace ALL text content with relevant content for the client's business
- Update colors to match the client's brand if business field suggests specific colors
- Replace placeholder/stock images with relevant Unsplash images (https://images.unsplash.com/photo-{PHOTO_ID}?w={width}&h={height}&fit=crop&q=80)
- Use Lucide Icons (https://unpkg.com/lucide@latest) for all icons — NEVER use emoji as icons
- Use Google Fonts for professional typography
- Update contact information, business name, and descriptions
- Make all content realistic and professional — no placeholder text
- Add proper meta tags with the client's business name
- Ensure responsive design is preserved
- Keep animations and interactions intact
- Add smooth transitions and micro-interactions where appropriate
- Include accessibility attributes (ARIA labels, alt text)

TRACKING SNIPPET:
Include this script tag before </body>:
<script src="/tracking.js" data-ref="TRACKING_REF"></script>

OUTPUT: Return ONLY the complete HTML file content, no markdown fences, no explanation.`;

@Injectable()
export class ClonerService {
  private readonly logger = new Logger(ClonerService.name);
  private appUrl: string;

  constructor(
    private prisma: PrismaService,
    private telegramService: TelegramService,
    private aiService: AiService,
    private configService: ConfigService,
  ) {
    this.appUrl = this.configService.get<string>('appUrl') || 'http://localhost:3000';
  }

  async createCloneRequest(data: CreateCloneDto): Promise<CloneRequest> {
    try {
      const cloneRequest = await this.prisma.cloneRequest.create({
        data: {
          sourceUrl: data.sourceUrl,
          clientName: data.clientName,
          clientEmail: data.clientEmail,
          businessName: data.businessName,
          businessField: data.businessField,
          businessInfo: data.businessInfo,
          additionalInfo: data.additionalInfo,
          clientPhone: data.clientPhone,
          leadId: data.leadId,
          trackingRef: data.trackingRef || undefined,
          status: CloneStatus.PENDING,
        },
      });

      this.logger.log(`Clone request created: ${cloneRequest.id}`);

      this.processClone(cloneRequest.id).catch((error) => {
        this.logger.error(
          `Background clone processing failed for ${cloneRequest.id}`,
          (error as Error).message,
        );
      });

      return cloneRequest;
    } catch (error) {
      this.logger.error(
        'Failed to create clone request',
        (error as Error).message,
      );
      throw error;
    }
  }

  async retryClone(id: string): Promise<void> {
    const clone = await this.prisma.cloneRequest.findUnique({ where: { id } });
    if (!clone) throw new Error('Clone request not found');

    const blockedStatuses = ['PENDING', 'SCRAPING', 'GENERATING'];
    if (blockedStatuses.includes(clone.status)) {
      throw new Error('Request is already being processed');
    }

    await this.prisma.cloneRequest.update({
      where: { id },
      data: { status: CloneStatus.PENDING, errorMessage: null, completedAt: null, generatedHtml: null },
    });

    this.logger.log(`Retrying clone request: ${id}`);
    this.processClone(id).catch((error) => {
      this.logger.error(`Retry failed for ${id}`, (error as Error).message);
    });
  }

  async processClone(id: string): Promise<void> {
    try {
      await this.prisma.cloneRequest.update({
        where: { id },
        data: { status: CloneStatus.SCRAPING },
      });

      const cloneRequest = await this.prisma.cloneRequest.findUniqueOrThrow({
        where: { id },
      });

      this.logger.log(
        `Scraping source URL: ${cloneRequest.sourceUrl}`,
      );

      const { html, textContent, screenshotBase64 } =
        await this.scrapeWebsite(cloneRequest.sourceUrl);

      const outputDir = path.resolve(process.cwd(), 'output', 'cloner', id);
      await fs.promises.mkdir(outputDir, { recursive: true });

      if (screenshotBase64) {
        const screenshotPath = path.join(outputDir, 'screenshot.png');
        await fs.promises.writeFile(
          screenshotPath,
          Buffer.from(screenshotBase64, 'base64'),
        );

        await this.prisma.cloneRequest.update({
          where: { id },
          data: {
            status: CloneStatus.GENERATING,
            screenshotPath,
          },
        });
      } else {
        await this.prisma.cloneRequest.update({
          where: { id },
          data: { status: CloneStatus.GENERATING },
        });
      }

      const trackingRef =
        cloneRequest.trackingRef || cloneRequest.id;

      const businessContext = [
        `Business Name: ${cloneRequest.businessName}`,
        `Business Field: ${cloneRequest.businessField}`,
        `Business Info: ${cloneRequest.businessInfo}`,
        cloneRequest.additionalInfo
          ? `Additional Info: ${cloneRequest.additionalInfo}`
          : '',
        `Client Name: ${cloneRequest.clientName}`,
        `Client Email: ${cloneRequest.clientEmail}`,
        cloneRequest.clientPhone
          ? `Client Phone: ${cloneRequest.clientPhone}`
          : '',
        '',
        `Tracking Reference: ${trackingRef}`,
      ]
        .filter(Boolean)
        .join('\n');

      const userMessage = [
        'Original website HTML:',
        '```html',
        html.substring(0, 50000),
        '```',
        '',
        'Extracted text content:',
        textContent.substring(0, 5000),
        '',
        'Client business information:',
        businessContext,
      ].join('\n');

      let generatedHtml: string;
      if (screenshotBase64) {
        const screenshotDataUrl = `data:image/png;base64,${screenshotBase64}`;
        generatedHtml = await this.aiService.analyzeImage(
          CLONE_TRANSFORM_PROMPT,
          screenshotDataUrl,
          userMessage,
        );
      } else {
        generatedHtml = await this.aiService.generateText(
          CLONE_TRANSFORM_PROMPT,
          userMessage,
        );
      }

      generatedHtml = this.extractHtml(generatedHtml);

      if (!generatedHtml || generatedHtml.length < 50) {
        throw new Error('AI generated empty or invalid response — retry the request');
      }

      if (!generatedHtml.includes('tracking.js')) {
        generatedHtml = generatedHtml.replace(
          '</body>',
          `<script src="/tracking.js" data-ref="${trackingRef}"></script>\n</body>`,
        );
      }

      const outputFilePath = path.join(outputDir, 'index.html');
      await fs.promises.writeFile(outputFilePath, generatedHtml, 'utf-8');

      const previewUrl = `${this.appUrl}/cloner/preview/${id}`;

      await this.prisma.cloneRequest.update({
        where: { id },
        data: {
          status: CloneStatus.COMPLETED,
          generatedHtml,
          previewUrl,
          completedAt: new Date(),
        },
      });

      this.logger.log(`Clone ${id} completed: ${outputFilePath}`);

      const notification = [
        '<b>Website Clone Completed</b>',
        '',
        `Client: ${cloneRequest.clientName}`,
        `Business: ${cloneRequest.businessName}`,
        `Source: ${cloneRequest.sourceUrl}`,
        `Preview: ${previewUrl}`,
        '',
        `ID: <code>${id}</code>`,
      ].join('\n');

      await this.telegramService.sendToOwner(notification);
    } catch (error) {
      this.logger.error(
        `Clone ${id} processing failed`,
        (error as Error).message,
      );

      await this.prisma.cloneRequest.update({
        where: { id },
        data: {
          status: CloneStatus.FAILED,
          errorMessage: (error as Error).message,
          completedAt: new Date(),
        },
      });

      await this.telegramService.sendToOwner(
        `<b>Clone Failed</b>\n\nID: <code>${id}</code>\nError: ${(error as Error).message}`,
      );
    }
  }

  async deleteClone(id: string): Promise<void> {
    const clone = await this.prisma.cloneRequest.findUnique({ where: { id } });
    if (!clone) throw new NotFoundException(`Clone request ${id} not found`);

    await this.prisma.cloneRequest.delete({ where: { id } });

    const outputDir = path.resolve(process.cwd(), 'output', 'cloner', id);
    try {
      await fs.promises.rm(outputDir, { recursive: true, force: true });
    } catch {
      // Directory may not exist, ignore
    }

    this.logger.log(`Clone request deleted: ${id}`);
  }

  async getCloneRequest(id: string): Promise<CloneRequest> {
    try {
      const clone = await this.prisma.cloneRequest.findUnique({
        where: { id },
      });

      if (!clone) {
        throw new NotFoundException(`Clone request ${id} not found`);
      }

      return clone;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(
        `Failed to get clone request ${id}`,
        (error as Error).message,
      );
      throw error;
    }
  }

  async cleanupStuckTasks(): Promise<number> {
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);

    const stuckTasks = await this.prisma.cloneRequest.findMany({
      where: {
        status: CloneStatus.GENERATING,
        updatedAt: { lt: fifteenMinAgo },
      },
    });

    if (stuckTasks.length === 0) {
      return 0;
    }

    this.logger.warn(
      `Found ${stuckTasks.length} stuck GENERATING task(s) older than 15 minutes`,
    );

    await this.prisma.cloneRequest.updateMany({
      where: {
        id: { in: stuckTasks.map((t) => t.id) },
      },
      data: {
        status: CloneStatus.FAILED,
        errorMessage: 'Task stuck in GENERATING status for over 15 minutes',
        completedAt: new Date(),
      },
    });

    for (const task of stuckTasks) {
      this.logger.warn(`Marked stuck task ${task.id} as FAILED`);
    }

    return stuckTasks.length;
  }

  async getCloneRequests(): Promise<CloneRequest[]> {
    try {
      await this.cleanupStuckTasks();
      return await this.prisma.cloneRequest.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
    } catch (error) {
      this.logger.error(
        'Failed to get clone requests',
        (error as Error).message,
      );
      throw error;
    }
  }

  private extractHtml(raw: string): string {
    // Try to extract from ```html ... ``` block
    const codeBlockMatch = raw.match(/```html\s*\n([\s\S]*?)```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }

    // Try to find <!DOCTYPE...></html> or <html...></html>
    const doctypeIdx = raw.toLowerCase().indexOf('<!doctype');
    const htmlOpenIdx = raw.toLowerCase().indexOf('<html');
    const htmlCloseIdx = raw.toLowerCase().lastIndexOf('</html>');

    const startIdx = doctypeIdx >= 0 ? doctypeIdx : htmlOpenIdx;
    if (startIdx >= 0 && htmlCloseIdx > startIdx) {
      return raw.substring(startIdx, htmlCloseIdx + 7).trim();
    }

    // Fallback: strip markdown fences
    return raw
      .replace(/^```html\n?/g, '')
      .replace(/^```\n?/g, '')
      .replace(/\n?```$/g, '')
      .trim();
  }

  private async scrapeWebsite(
    url: string,
  ): Promise<{ html: string; textContent: string; screenshotBase64: string }> {
    let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;

    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });

      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      const html = await page.content();

      const textContent = await page.evaluate(() => {
        return document.body?.innerText || '';
      });

      const screenshotBuffer = await page.screenshot({
        fullPage: true,
        type: 'png',
      });

      const screenshotBase64 = Buffer.from(screenshotBuffer).toString('base64');

      this.logger.log(
        `Scraped ${url}: ${html.length} chars HTML, ${textContent.length} chars text`,
      );

      return { html, textContent, screenshotBase64 };
    } catch (error) {
      this.logger.error(
        `Failed to scrape ${url}`,
        (error as Error).message,
      );
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}
