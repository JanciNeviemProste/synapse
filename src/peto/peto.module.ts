import { Module } from '@nestjs/common';
import { ContentStudioModule } from '../content-studio/content-studio.module';
import { PetoApiController } from './peto-api.controller';
import { PetoController } from './peto.controller';
import { PetoService } from './peto.service';

/**
 * Peťové Studio — simplified voice → scripts flow.
 * Imports ContentStudioModule to reuse the shared AI layer
 * (ContentProviderFactory, ContentStorageService); its own data lives
 * in isolated Peto* tables.
 */
@Module({
  imports: [ContentStudioModule],
  controllers: [PetoController, PetoApiController],
  providers: [PetoService],
})
export class PetoModule {}
