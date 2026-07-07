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

  // ---- Voice → text ----

  @Post('transcribe')
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @UseInterceptors(FileInterceptor('audio', { limits: { fileSize: 60 * 1024 * 1024 } }))
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
