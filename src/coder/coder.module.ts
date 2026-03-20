import { Module } from '@nestjs/common';
import { CoderService } from './coder.service';
import { CoderController } from './coder.controller';
import { CodespacesService } from './codespaces.service';
import { CoderTelegramHandler } from './coder-telegram.handler';
import { TelegramModule } from '../telegram/telegram.module';
import { AiModule } from '../ai/ai.module';
import { ImagesModule } from '../images/images.module';

@Module({
  imports: [TelegramModule, AiModule, ImagesModule],
  providers: [CoderService, CodespacesService, CoderTelegramHandler],
  controllers: [CoderController],
  exports: [CoderService],
})
export class CoderModule {}
