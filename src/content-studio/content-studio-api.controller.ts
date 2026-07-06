import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import {
  BrandProfileDto,
  GeneratePlanDto,
  GenerateScriptsDto,
  InspirationDto,
  KnowledgeDocDto,
  MergeIdeasDto,
  PillarDto,
  QuickIdeaDto,
  ScriptStatusDto,
  TemplateDto,
  TemplateFlagsDto,
  UpdateIdeaDto,
  UpdateInspirationDto,
  UpdateKnowledgeDocDto,
  UpdatePillarDto,
  UpdatePlanItemDto,
  UpdateScriptDto,
} from './dto/content-studio.dtos';
import { BrandProfileService } from './services/brand-profile.service';
import { IdeasService } from './services/ideas.service';
import { InspirationService } from './services/inspiration.service';
import { KnowledgeService } from './services/knowledge.service';
import { PillarsService } from './services/pillars.service';
import { TemplatesService } from './services/templates.service';
import { InterviewService } from './services/interview.service';
import { VoiceService } from './services/voice.service';
import { InterviewTurn } from './providers/provider.interfaces';
import { ContentDnaService } from './intelligence/content-dna.service';
import { IntelligenceService } from './intelligence/intelligence.service';
import { PlansService } from './services/plans.service';
import { ScriptsService } from './services/scripts.service';

/** JSON API. Admin-only via the global AuthGuard — no @Public() here. */
@Controller('api/content-studio')
export class ContentStudioApiController {
  constructor(
    private readonly ideasService: IdeasService,
    private readonly templatesService: TemplatesService,
    private readonly pillarsService: PillarsService,
    private readonly inspirationService: InspirationService,
    private readonly brandProfileService: BrandProfileService,
    private readonly knowledgeService: KnowledgeService,
    private readonly voiceService: VoiceService,
    private readonly interviewService: InterviewService,
    private readonly intelligenceService: IntelligenceService,
    private readonly contentDnaService: ContentDnaService,
    private readonly plansService: PlansService,
    private readonly scriptsService: ScriptsService,
  ) {}

  // ---- Content plans (spec §15) ----

  @Post('plans/generate')
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // AI call
  async generatePlan(@Body() body: GeneratePlanDto) {
    return this.plansService.generate({ ...body, goals: body.goals ?? [] });
  }

  @Get('plans')
  async listPlans() {
    return this.plansService.list();
  }

  @Patch('plans/:id/status')
  async setPlanStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED' },
  ) {
    if (!['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED'].includes(body.status)) {
      throw new BadRequestException('Neplatný status');
    }
    return this.plansService.setStatus(id, body.status);
  }

  @Delete('plans/:id')
  async deletePlan(@Param('id', ParseUUIDPipe) id: string) {
    await this.plansService.delete(id);
    return { ok: true };
  }

  @Patch('plans/items/:itemId')
  async updatePlanItem(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() body: UpdatePlanItemDto,
  ) {
    return this.plansService.updateItem(itemId, body as never);
  }

  // ---- Reel scripts (spec §16–17, §21–22, §27) ----

  @Post('scripts/generate')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // heavy AI call (3 variants)
  async generateScripts(@Body() body: GenerateScriptsDto) {
    return this.scriptsService.generate(body);
  }

  @Get('scripts')
  async listScripts() {
    return this.scriptsService.list();
  }

  @Post('scripts/:id/review')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // AI call
  async reviewScript(@Param('id', ParseUUIDPipe) id: string) {
    return this.scriptsService.review(id);
  }

  @Post('scripts/:id/compliance')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // AI call
  async scriptCompliance(@Param('id', ParseUUIDPipe) id: string) {
    return this.scriptsService.complianceCheck(id);
  }

  @Patch('scripts/:id')
  async updateScript(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateScriptDto) {
    return this.scriptsService.updateContent(id, body);
  }

  @Patch('scripts/:id/status')
  async setScriptStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ScriptStatusDto,
  ) {
    return this.scriptsService.setStatus(id, body.status as never);
  }

  @Get('scripts/:id/handoff')
  async scriptHandoff(@Param('id', ParseUUIDPipe) id: string) {
    return this.scriptsService.buildHandoff(id);
  }

  @Delete('scripts/:id')
  async deleteScript(@Param('id', ParseUUIDPipe) id: string) {
    await this.scriptsService.delete(id);
    return { ok: true };
  }

  // ---- Content Intelligence (spec §14) ----

  @Post('intelligence/upload')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseInterceptors(FileInterceptor('video', { limits: { fileSize: 350 * 1024 * 1024 } }))
  async uploadVideo(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: { title?: string; sourceUrl?: string },
  ) {
    if (!file) {
      throw new BadRequestException('Chýba video súbor (pole "video").');
    }
    return this.intelligenceService.upload({
      buffer: file.buffer,
      mimeType: file.mimetype,
      title: (body.title || file.originalname || 'Video').substring(0, 200),
      sourceUrl: body.sourceUrl?.substring(0, 1000),
    });
  }

  @Post('intelligence/:assetId/analyze')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async analyzeVideoAsset(@Param('assetId', ParseUUIDPipe) assetId: string) {
    return this.intelligenceService.startAnalysis(assetId);
  }

  @Post('intelligence/:assetId/metrics')
  async saveVideoMetrics(
    @Param('assetId', ParseUUIDPipe) assetId: string,
    @Body()
    body: {
      publishedAt?: string;
      followerCountAtPublish?: number;
      views?: number;
      reach?: number;
      likes?: number;
      comments?: number;
      shares?: number;
      saves?: number;
      averageWatchTimeSeconds?: number;
      completionRate?: number;
    },
  ) {
    return this.intelligenceService.saveMetrics(assetId, body);
  }

  @Patch('intelligence/analysis/:id/transcript')
  async correctTranscript(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { transcript: string },
  ) {
    if (typeof body.transcript !== 'string') {
      throw new BadRequestException('transcript musí byť string');
    }
    await this.intelligenceService.correctTranscript(id, body.transcript.substring(0, 200000));
    return { ok: true };
  }

  @Post('intelligence/analysis/:id/approve')
  async approveAnalysis(@Param('id', ParseUUIDPipe) id: string) {
    return this.intelligenceService.approve(id);
  }

  @Delete('intelligence/:assetId')
  async deleteVideoAsset(@Param('assetId', ParseUUIDPipe) assetId: string) {
    await this.intelligenceService.deleteAsset(assetId);
    return { ok: true };
  }

  // ---- Content DNA (spec 14.8) ----

  @Post('content-dna/generate')
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // AI call
  async generateContentDna() {
    return this.contentDnaService.generate();
  }

  @Patch('content-dna/rules/:id')
  async setDnaRuleStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { status?: string; rule?: string },
  ) {
    if (body.rule !== undefined) {
      return this.contentDnaService.updateRule(id, String(body.rule).substring(0, 2000));
    }
    const allowed = ['PROPOSED', 'APPROVED', 'REJECTED', 'DEACTIVATED'] as const;
    if (!allowed.includes(body.status as (typeof allowed)[number])) {
      throw new BadRequestException('Neplatný status');
    }
    return this.contentDnaService.setRuleStatus(
      id,
      body.status as (typeof allowed)[number],
    );
  }

  @Delete('content-dna/rules/:id')
  async deleteDnaRule(@Param('id', ParseUUIDPipe) id: string) {
    await this.contentDnaService.deleteRule(id);
    return { ok: true };
  }

  // ---- AI Interview (spec §7.4) ----

  @Post('interview/next')
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // AI call per turn
  async interviewNext(@Body() body: { history?: InterviewTurn[] }) {
    return this.interviewService.nextQuestion(this.sanitizeHistory(body.history));
  }

  @Post('interview/finish')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // AI call
  async interviewFinish(@Body() body: { history?: InterviewTurn[] }) {
    const history = this.sanitizeHistory(body.history);
    if (history.length === 0) {
      throw new BadRequestException('Prázdny rozhovor sa nedá uzavrieť.');
    }
    return this.interviewService.finish(history);
  }

  @Get('interview/realtime-availability')
  interviewRealtimeAvailability() {
    return { available: this.interviewService.isRealtimeAvailable() };
  }

  @Post('interview/realtime-token')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async interviewRealtimeToken() {
    return this.interviewService.createRealtimeToken();
  }

  private sanitizeHistory(history: unknown): InterviewTurn[] {
    if (!Array.isArray(history)) return [];
    return history
      .filter(
        (t): t is InterviewTurn =>
          !!t &&
          typeof t === 'object' &&
          ((t as InterviewTurn).role === 'ai' || (t as InterviewTurn).role === 'user') &&
          typeof (t as InterviewTurn).text === 'string',
      )
      .slice(0, 100)
      .map((t) => ({ role: t.role, text: t.text.substring(0, 4000) }));
  }

  // ---- Voice (spec §7.2/§7.3) ----

  @Post('voice/upload')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // transcription + AI call
  @UseInterceptors(FileInterceptor('audio', { limits: { fileSize: 60 * 1024 * 1024 } }))
  async uploadVoice(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: { saveAudio?: string; sessionType?: string; title?: string },
  ) {
    if (!file) {
      throw new BadRequestException('Chýba audio súbor (pole "audio").');
    }
    return this.voiceService.processUpload({
      buffer: file.buffer,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      saveAudio: body.saveAudio === 'true',
      sessionType: body.sessionType === 'AUDIO_UPLOAD' ? 'AUDIO_UPLOAD' : 'QUICK_VOICE_NOTE',
      title: body.title,
    });
  }

  @Get('sessions/:id')
  async getSession(@Param('id', ParseUUIDPipe) id: string) {
    return this.voiceService.getSession(id);
  }

  @Delete('sessions/:id/audio')
  async deleteSessionAudio(@Param('id', ParseUUIDPipe) id: string) {
    return this.voiceService.deleteAudio(id);
  }

  @Delete('sessions/:id')
  async deleteSession(@Param('id', ParseUUIDPipe) id: string) {
    await this.voiceService.deleteSession(id);
    return { ok: true };
  }

  // ---- Ideas (spec §7.1) ----

  @Post('ideas/quick')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // each call costs one AI request
  async quickIdea(@Body() body: QuickIdeaDto) {
    return this.ideasService.captureText(body.text);
  }

  @Get('ideas')
  async listIdeas() {
    return this.ideasService.list();
  }

  @Patch('ideas/:id')
  async updateIdea(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateIdeaDto) {
    return this.ideasService.update(id, body);
  }

  @Delete('ideas/:id')
  async deleteIdea(@Param('id', ParseUUIDPipe) id: string) {
    await this.ideasService.delete(id);
    return { ok: true };
  }

  @Post('ideas/merge')
  async mergeIdeas(@Body() body: MergeIdeasDto) {
    return this.ideasService.merge(body.ids);
  }

  // ---- Templates (spec §12) ----

  @Get('templates')
  async listTemplates() {
    return this.templatesService.list(true);
  }

  @Post('templates')
  async createTemplate(@Body() body: TemplateDto) {
    return this.templatesService.create(body);
  }

  @Patch('templates/:id')
  async updateTemplate(@Param('id', ParseUUIDPipe) id: string, @Body() body: TemplateDto) {
    return this.templatesService.update(id, body);
  }

  @Post('templates/:id/duplicate')
  async duplicateTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.duplicate(id);
  }

  @Patch('templates/:id/flags')
  async setTemplateFlags(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: TemplateFlagsDto,
  ) {
    return this.templatesService.setFlags(id, body);
  }

  // ---- Pillars ----

  @Get('pillars')
  async listPillars() {
    return this.pillarsService.list();
  }

  @Post('pillars')
  async createPillar(@Body() body: PillarDto) {
    return this.pillarsService.create(body);
  }

  @Post('pillars/suggest')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // AI call
  async suggestPillars() {
    return { suggestions: await this.pillarsService.suggest() };
  }

  @Patch('pillars/:id')
  async updatePillar(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdatePillarDto) {
    return this.pillarsService.update(id, body);
  }

  @Delete('pillars/:id')
  async deletePillar(@Param('id', ParseUUIDPipe) id: string) {
    await this.pillarsService.delete(id);
    return { ok: true };
  }

  // ---- Inspiration (spec §13) ----

  @Get('inspiration')
  async listInspiration() {
    return this.inspirationService.list();
  }

  @Post('inspiration')
  async createInspiration(@Body() body: InspirationDto) {
    return this.inspirationService.create(body);
  }

  @Patch('inspiration/:id')
  async updateInspiration(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateInspirationDto,
  ) {
    return this.inspirationService.update(id, body);
  }

  @Post('inspiration/:id/analyze')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // AI call
  async analyzeInspiration(@Param('id', ParseUUIDPipe) id: string) {
    return this.inspirationService.analyze(id);
  }

  @Delete('inspiration/:id')
  async deleteInspiration(@Param('id', ParseUUIDPipe) id: string) {
    await this.inspirationService.delete(id);
    return { ok: true };
  }

  // ---- Brand DNA (spec §10) ----

  @Get('brand-profile')
  async getBrandProfile() {
    return (await this.brandProfileService.getActive()) ?? {};
  }

  @Put('brand-profile')
  async putBrandProfile(@Body() body: BrandProfileDto) {
    return this.brandProfileService.upsert(body);
  }

  // ---- Knowledge Base (spec §11) ----

  @Get('knowledge')
  async listKnowledge() {
    return this.knowledgeService.list();
  }

  @Post('knowledge')
  async createKnowledge(@Body() body: KnowledgeDocDto) {
    return this.knowledgeService.create(body);
  }

  @Patch('knowledge/:id')
  async updateKnowledge(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateKnowledgeDocDto,
  ) {
    return this.knowledgeService.update(id, body);
  }

  @Delete('knowledge/:id')
  async deleteKnowledge(@Param('id', ParseUUIDPipe) id: string) {
    await this.knowledgeService.delete(id);
    return { ok: true };
  }
}
