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
import { PetoBrandDto, PetoGenerateDto, PetoTemplateDto } from './dto/peto.dtos';
import { PetoService } from './peto.service';

/** JSON API for Peťové Studio. Admin-only via the global AuthGuard. */
@Controller('api/peto')
export class PetoApiController {
  constructor(private readonly petoService: PetoService) {}

  // ---- Brand ----

  @Get('brand')
  async getBrand() {
    return (await this.petoService.getBrand()) ?? {};
  }

  @Put('brand')
  async putBrand(@Body() body: PetoBrandDto) {
    return this.petoService.upsertBrand(body);
  }

  // ---- Templates ----

  @Get('templates')
  async listTemplates() {
    return this.petoService.listTemplates();
  }

  @Post('templates')
  async createTemplate(@Body() body: PetoTemplateDto) {
    return this.petoService.createTemplate(body);
  }

  @Patch('templates/:id')
  async updateTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: PetoTemplateDto,
  ) {
    return this.petoService.updateTemplate(id, body);
  }

  @Delete('templates/:id')
  async deleteTemplate(@Param('id', ParseUUIDPipe) id: string) {
    await this.petoService.deleteTemplate(id);
    return { ok: true };
  }

  // ---- Reference documents (PDF / Word / text) ----

  @Get('docs')
  async listDocs() {
    return this.petoService.listDocs();
  }

  @Post('docs')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  async addDoc(@UploadedFile() file: Express.Multer.File | undefined) {
    if (!file) {
      throw new BadRequestException('Chýba súbor (pole "file").');
    }
    return this.petoService.addDoc(file.buffer, file.mimetype, file.originalname || 'súbor');
  }

  @Delete('docs/:id')
  async deleteDoc(@Param('id', ParseUUIDPipe) id: string) {
    await this.petoService.deleteDoc(id);
    return { ok: true };
  }

  /** Extract text from a dropped file without saving it — used to pre-fill
   * a manual field (template structure, transcript) elsewhere on the page. */
  @Post('extract-text')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  async extractTextOnly(@UploadedFile() file: Express.Multer.File | undefined) {
    if (!file) {
      throw new BadRequestException('Chýba súbor (pole "file").');
    }
    return this.petoService.extractTextOnly(
      file.buffer,
      file.mimetype,
      file.originalname || 'súbor',
    );
  }

  /** Drop a document → AI best-guesses Brand DNA fields for the user to
   * review before saving via PUT /brand. Never persists on its own. */
  @Post('brand/extract')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  async extractBrand(@UploadedFile() file: Express.Multer.File | undefined) {
    if (!file) {
      throw new BadRequestException('Chýba súbor (pole "file").');
    }
    return this.petoService.extractBrandFromDoc(
      file.buffer,
      file.mimetype,
      file.originalname || 'súbor',
    );
  }

  // ---- Voice → text ----

  @Post('transcribe')
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  // Generous hard cap; the real, user-facing size limit is config-driven in
  // PetoService.transcribe → storage.validate (CONTENT_AUDIO_MAX_FILE_SIZE_MB).
  @UseInterceptors(FileInterceptor('audio', { limits: { fileSize: 100 * 1024 * 1024 } }))
  async transcribe(@UploadedFile() file: Express.Multer.File | undefined) {
    if (!file) {
      throw new BadRequestException('Chýba audio súbor (pole "audio").');
    }
    return this.petoService.transcribe(file.buffer, file.mimetype, file.size);
  }

  // ---- Generate ----

  @Post('generate')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // heavy AI call (3 variants)
  async generate(@Body() body: PetoGenerateDto) {
    return this.petoService.generate(body);
  }

  @Get('batches')
  async listBatches() {
    return this.petoService.listBatches();
  }

  @Delete('batches/:id')
  async deleteBatch(@Param('id', ParseUUIDPipe) id: string) {
    await this.petoService.deleteBatch(id);
    return { ok: true };
  }
}
