import { Module } from '@nestjs/common';
import { ClonerService } from './cloner.service';
import { ClonerController } from './cloner.controller';
import { ClonerTelegramHandler } from './cloner-telegram.handler';
import { TelegramModule } from '../telegram/telegram.module';
import { AiModule } from '../ai/ai.module';
import { TrackingModule } from '../tracking/tracking.module';

@Module({
  imports: [TelegramModule, AiModule, TrackingModule],
  providers: [ClonerService, ClonerTelegramHandler],
  controllers: [ClonerController],
  exports: [ClonerService],
})
export class ClonerModule {}
