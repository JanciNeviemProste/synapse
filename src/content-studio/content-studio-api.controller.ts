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
  InspirationDto,
  KnowledgeDocDto,
  MergeIdeasDto,
  PillarDto,
  QuickIdeaDto,
  TemplateDto,
  TemplateFlagsDto,
  UpdateIdeaDto,
  UpdateInspirationDto,
  UpdateKnowledgeDocDto,
  UpdatePillarDto,
} from './dto/content-studio.dtos';
import { BrandProfileService } from './services/brand-profile.service';
import { IdeasService } from './services/ideas.service';
import { InspirationService } from './services/inspiration.service';
import { KnowledgeService } from './services/knowledge.service';
import { PillarsService } from './services/pillars.service';
import { TemplatesService } from './services/templates.service';
import { VoiceService } from './services/voice.service';

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
  ) {}

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
