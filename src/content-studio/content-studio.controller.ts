import { Controller, Get, Logger, Param, ParseUUIDPipe, Res } from '@nestjs/common';
import { Response } from 'express';
import * as path from 'path';
import { PrismaService } from '../database/prisma.service';
import { ContentDnaService } from './intelligence/content-dna.service';
import { IntelligenceService } from './intelligence/intelligence.service';
import { BrandProfileService } from './services/brand-profile.service';
import { IdeasService } from './services/ideas.service';
import { InspirationService } from './services/inspiration.service';
import { KnowledgeService } from './services/knowledge.service';
import { PillarsService } from './services/pillars.service';
import { TemplatesService } from './services/templates.service';

/** SSR pages. Admin-only via the global AuthGuard — no @Public() here. */
@Controller('content-studio')
export class ContentStudioController {
  private readonly logger = new Logger(ContentStudioController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ideasService: IdeasService,
    private readonly templatesService: TemplatesService,
    private readonly pillarsService: PillarsService,
    private readonly inspirationService: InspirationService,
    private readonly brandProfileService: BrandProfileService,
    private readonly knowledgeService: KnowledgeService,
    private readonly intelligenceService: IntelligenceService,
    private readonly contentDnaService: ContentDnaService,
  ) {}

  private render(res: Response, view: string, data: Record<string, unknown>): void {
    try {
      res.render(path.join('content-studio', view), data);
    } catch (error) {
      this.logger.error(`Failed to render ${view}`, (error as Error).message);
      res.status(500).send('Internal Server Error');
    }
  }

  @Get()
  async dashboard(@Res() res: Response): Promise<void> {
    try {
      const [
        ideasCaptured,
        scriptsGenerated,
        scriptsApproved,
        activePlans,
        pendingReviews,
        voiceSeconds,
        recentSessions,
        recentIdeas,
      ] = await Promise.all([
        this.prisma.contentIdea.count(),
        this.prisma.reelScript.count(),
        this.prisma.reelScript.count({ where: { status: { in: ['APPROVED', 'READY_FOR_VIDEO'] } } }),
        this.prisma.contentPlan.count({ where: { status: 'ACTIVE' } }),
        this.prisma.reelScript.count({ where: { status: { in: ['GENERATED', 'UNDER_REVIEW', 'EDITED'] } } }),
        this.prisma.contentSession.aggregate({ _sum: { durationSeconds: true } }),
        this.ideasService.listSessions(5),
        this.ideasService.list().then((all) => all.slice(0, 8)),
      ]);

      this.render(res, 'dashboard', {
        metrics: {
          ideasCaptured,
          scriptsGenerated,
          scriptsApproved,
          activePlans,
          pendingReviews,
          voiceMinutes: Math.round((voiceSeconds._sum.durationSeconds || 0) / 60),
          videosAnalyzed: 0, // Content Intelligence arrives in CS-6
        },
        recentSessions,
        recentIdeas,
      });
    } catch (error) {
      this.logger.error('Failed to load dashboard', (error as Error).message);
      res.status(500).send('Internal Server Error');
    }
  }

  @Get('voice')
  async voice(@Res() res: Response): Promise<void> {
    const sessions = await this.prisma.contentSession.findMany({
      where: { type: { in: ['QUICK_VOICE_NOTE', 'AUDIO_UPLOAD'] } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    this.render(res, 'voice', { sessions });
  }

  @Get('interview')
  async interview(@Res() res: Response): Promise<void> {
    this.render(res, 'interview', {});
  }

  @Get('ideas')
  async ideas(@Res() res: Response): Promise<void> {
    const [ideas, sessions] = await Promise.all([
      this.ideasService.list(),
      this.ideasService.listSessions(5),
    ]);
    this.render(res, 'ideas', { ideas, sessions });
  }

  @Get('templates')
  async templates(@Res() res: Response): Promise<void> {
    const templates = await this.templatesService.list(true);
    this.render(res, 'templates', { templates });
  }

  @Get('pillars')
  async pillars(@Res() res: Response): Promise<void> {
    const pillars = await this.pillarsService.list();
    this.render(res, 'pillars', { pillars });
  }

  @Get('inspiration')
  async inspiration(@Res() res: Response): Promise<void> {
    const sources = await this.inspirationService.list();
    this.render(res, 'inspiration', { sources });
  }

  @Get('intelligence')
  async intelligence(@Res() res: Response): Promise<void> {
    const assets = await this.intelligenceService.listAssets();
    this.render(res, 'intelligence', { assets });
  }

  @Get('intelligence/content-dna')
  async contentDna(@Res() res: Response): Promise<void> {
    const profile = await this.contentDnaService.getLatestProfile();
    const approvedCount = await this.prisma.contentVideoAnalysis.count({
      where: { status: 'APPROVED' },
    });
    this.render(res, 'content-dna', { profile, approvedCount });
  }

  @Get('intelligence/:id')
  async intelligenceDetail(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const asset = await this.intelligenceService.getDetail(id);
      this.render(res, 'intelligence-detail', { asset });
    } catch {
      res.status(404).send('Video not found');
    }
  }

  @Get('intelligence/:id/thumbnail')
  async thumbnail(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response): Promise<void> {
    const thumb = await this.intelligenceService.getThumbnail(id).catch(() => null);
    if (!thumb) {
      res.status(404).send('No thumbnail');
      return;
    }
    res.type(thumb.mime).send(thumb.buffer);
  }

  @Get('intelligence/:id/video')
  async video(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response): Promise<void> {
    try {
      const stream = await this.intelligenceService.getVideoStream(id);
      res.type(stream.mime).send(stream.buffer);
    } catch {
      res.status(404).send('Video not found');
    }
  }

  @Get('settings')
  async settings(@Res() res: Response): Promise<void> {
    const [profile, docs] = await Promise.all([
      this.brandProfileService.getActive(),
      this.knowledgeService.list(),
    ]);
    this.render(res, 'settings', { profile, docs });
  }
}
