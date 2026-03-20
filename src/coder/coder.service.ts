import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { AiService } from '../ai/ai.service';
import { ImagesService } from '../images/images.service';
import { CodespacesService } from './codespaces.service';
import { CoderTask, TaskStatus } from '@prisma/client';

const WEB_GENERATION_SYSTEM_PROMPT = `You are an expert frontend developer. Generate a complete, production-ready single-page website based on the user's prompt.

TYPOGRAPHY:
- Google Fonts: Inter for body, Plus Jakarta Sans for headings, Playfair Display for accent/decorative text
- Body font-size: 16-18px, line-height: 1.6-1.7
- Headings: font-weight 600-800 with proper line-height
- Import via: <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Playfair+Display:wght@400;500;600;700&display=swap" rel="stylesheet">

COLORS & CSS:
- Text colors: #1a1a2e (primary), #2d2d3f (secondary) — NEVER use pure black (#000)
- Define CSS custom properties in :root (--color-primary, --color-secondary, --color-accent, --color-bg, --color-text, --color-text-secondary, --font-body, --font-heading, --spacing-unit: 8px, --max-width: 1200px, --section-padding: 80px, --radius: 12px)
- Use gradient backgrounds for hero sections
- Professional color palette with good contrast ratios

LAYOUT:
- 8px spacing grid (all margins/padding multiples of 8px)
- Section padding-y: minimum 80px
- Max-width: 1200px with auto margins
- Card styling: subtle border OR shadow (NEVER both), border-radius 12-16px
- CSS Grid and Flexbox for layout
- Fully responsive (mobile, tablet, desktop)

ICONS:
- Lucide Icons CDN: https://unpkg.com/lucide@latest
- Usage: <i data-lucide="icon-name"></i> then call lucide.createIcons() in script
- NEVER use emoji as icons on the page

IMAGES:
- If the user provides photo URLs, use EXACTLY those URLs in img src attributes
- If no photos provided, use https://images.unsplash.com/photo-{PHOTO_ID}?w={width}&h={height}&fit=crop&q=80
- Always add proper alt text to images

REQUIREMENTS:
- Output a single HTML file with embedded CSS and JavaScript
- Semantic HTML5 elements (header, nav, main, section, footer)
- Include proper meta tags, title, and favicon
- Contact section with a form
- Smooth scroll, hover effects, and subtle CSS transitions
- Accessibility (ARIA labels, alt text, proper heading hierarchy)
- No placeholder text — generate realistic, relevant content
- No external CSS frameworks — write custom CSS
- Clean, well-structured code with comments

OUTPUT: Return ONLY the complete HTML file content, no markdown fences, no explanation.`;

@Injectable()
export class CoderService {
  private readonly logger = new Logger(CoderService.name);

  constructor(
    private prisma: PrismaService,
    private telegramService: TelegramService,
    private aiService: AiService,
    private imagesService: ImagesService,
    private codespacesService: CodespacesService,
  ) {}

  async createTask(
    prompt: string,
    source: string,
    chatId?: string,
  ): Promise<CoderTask> {
    try {
      const task = await this.prisma.coderTask.create({
        data: {
          prompt,
          source,
          telegramChatId: chatId,
          status: TaskStatus.PENDING,
          command: 'code',
        },
      });

      this.logger.log(`CoderTask created: ${task.id} from ${source}`);

      this.processTask(task.id).catch((error) => {
        this.logger.error(
          `Background processing failed for task ${task.id}`,
          (error as Error).message,
        );
      });

      return task;
    } catch (error) {
      this.logger.error('Failed to create coder task', (error as Error).message);
      throw error;
    }
  }

  async getTask(id: string): Promise<CoderTask> {
    try {
      const task = await this.prisma.coderTask.findUnique({
        where: { id },
      });

      if (!task) {
        throw new NotFoundException(`CoderTask ${id} not found`);
      }

      return task;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(
        `Failed to get task ${id}`,
        (error as Error).message,
      );
      throw error;
    }
  }

  async getTasks(limit: number): Promise<CoderTask[]> {
    try {
      return await this.prisma.coderTask.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    } catch (error) {
      this.logger.error('Failed to get tasks', (error as Error).message);
      throw error;
    }
  }

  async deleteTask(id: string): Promise<void> {
    const task = await this.prisma.coderTask.findUnique({ where: { id } });
    if (!task) throw new NotFoundException(`CoderTask ${id} not found`);

    await this.prisma.coderTask.delete({ where: { id } });

    this.logger.log(`CoderTask deleted: ${id}`);
  }

  async retryTask(id: string): Promise<void> {
    const task = await this.prisma.coderTask.findUnique({ where: { id } });
    if (!task) throw new Error('Task not found');

    const blockedStatuses = ['PENDING', 'PROCESSING'];
    if (blockedStatuses.includes(task.status)) {
      throw new Error('Task is already being processed');
    }

    await this.prisma.coderTask.update({
      where: { id },
      data: { status: TaskStatus.PENDING, response: null, completedAt: null, duration: null },
    });

    this.logger.log(`Retrying coder task: ${id}`);
    this.processTask(id).catch((error) => {
      this.logger.error(`Retry failed for ${id}`, (error as Error).message);
    });
  }

  private extractHtml(raw: string): string {
    const codeBlockMatch = raw.match(/```html\s*\n([\s\S]*?)```/);
    if (codeBlockMatch) return codeBlockMatch[1].trim();

    const doctypeIdx = raw.toLowerCase().indexOf('<!doctype');
    const htmlOpenIdx = raw.toLowerCase().indexOf('<html');
    const htmlCloseIdx = raw.toLowerCase().lastIndexOf('</html>');
    const startIdx = doctypeIdx >= 0 ? doctypeIdx : htmlOpenIdx;
    if (startIdx >= 0 && htmlCloseIdx > startIdx) {
      return raw.substring(startIdx, htmlCloseIdx + 7).trim();
    }

    return raw
      .replace(/^```html\n?/g, '')
      .replace(/^```\n?/g, '')
      .replace(/\n?```$/g, '')
      .trim();
  }

  private async processTask(taskId: string): Promise<void> {
    const startTime = Date.now();

    try {
      await this.prisma.coderTask.update({
        where: { id: taskId },
        data: { status: TaskStatus.PROCESSING },
      });

      const task = await this.prisma.coderTask.findUniqueOrThrow({
        where: { id: taskId },
      });

      // Search for relevant photos
      const photos = await this.imagesService.searchForPrompt(task.prompt, 8);
      let enrichedPrompt = task.prompt;
      if (photos.length > 0) {
        const photoList = photos
          .map((p, i) => `${i + 1}. ${p.url} (${p.alt})`)
          .join('\n');
        enrichedPrompt += `\n\nPOUŽI TIETO FOTKY (reálne URL, nie placeholder):\n${photoList}`;
        this.logger.debug(`Found ${photos.length} photos from ${photos[0].source}`);
      }

      let generatedCode = await this.aiService.generateText(
        WEB_GENERATION_SYSTEM_PROMPT,
        enrichedPrompt,
      );

      generatedCode = this.extractHtml(generatedCode);

      if (!generatedCode || generatedCode.length < 50) {
        throw new Error('AI generated empty or invalid response — retry the task');
      }

      const lowerCode = generatedCode.toLowerCase();
      if (!lowerCode.includes('<html') && !lowerCode.includes('<!doctype')) {
        throw new Error(
          'AI returned text instead of HTML — response is missing <html> or <!DOCTYPE> tag',
        );
      }

      const repoName = `synapse-gen-${taskId.substring(0, 8)}`;
      let repoUrl: string | undefined;
      let deployUrl: string | undefined;

      try {
        const { owner, repo, url } =
          await this.codespacesService.createRepository(repoName);
        repoUrl = url;

        await this.codespacesService.pushFiles(owner, repo, [
          { path: 'index.html', content: generatedCode },
        ]);

        try {
          const deployment = await this.codespacesService.deployToVercel(
            repoName,
            `${owner}/${repo}`,
          );
          deployUrl = deployment.url;
        } catch (deployError) {
          this.logger.warn(
            `Vercel deployment failed for task ${taskId}`,
            (deployError as Error).message,
          );
        }
      } catch (repoError) {
        this.logger.warn(
          `Repository creation failed for task ${taskId}`,
          (repoError as Error).message,
        );
      }

      const duration = Math.round((Date.now() - startTime) / 1000);

      const updatedTask = await this.prisma.coderTask.update({
        where: { id: taskId },
        data: {
          status: TaskStatus.COMPLETED,
          response: generatedCode,
          generatedFiles: JSON.stringify([{ path: 'index.html', size: generatedCode.length }]),
          repoUrl,
          deployUrl,
          duration,
          completedAt: new Date(),
        },
      });

      const notification = [
        '<b>AI Coder — Task Complete</b>',
        '',
        `Prompt: ${task.prompt.substring(0, 100)}${task.prompt.length > 100 ? '...' : ''}`,
        `Duration: ${duration}s`,
        repoUrl ? `Repo: ${repoUrl}` : '',
        deployUrl ? `Preview: ${deployUrl}` : '',
        '',
        `ID: <code>${taskId}</code>`,
      ]
        .filter(Boolean)
        .join('\n');

      if (updatedTask.telegramChatId) {
        await this.telegramService.sendMessage(
          updatedTask.telegramChatId,
          notification,
        );
      }
      await this.telegramService.sendToOwner(notification);
    } catch (error) {
      const duration = Math.round((Date.now() - startTime) / 1000);
      this.logger.error(
        `Task ${taskId} processing failed`,
        (error as Error).message,
      );

      await this.prisma.coderTask.update({
        where: { id: taskId },
        data: {
          status: TaskStatus.FAILED,
          response: `Error: ${(error as Error).message}`,
          duration,
          completedAt: new Date(),
        },
      });
    }
  }
}
