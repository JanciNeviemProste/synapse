import { Module } from '@nestjs/common';
import { FigmaService } from './figma.service';
import { FigmaCodegenService } from './figma-codegen.service';
import { FigmaCron } from './figma.cron';
import { FigmaController } from './figma.controller';
import { FigmaTelegramHandler } from './figma-telegram.handler';
import { TelegramModule } from '../telegram/telegram.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [TelegramModule, AiModule],
  controllers: [FigmaController],
  providers: [FigmaService, FigmaCodegenService, FigmaCron, FigmaTelegramHandler],
  exports: [FigmaService, FigmaCodegenService, FigmaCron],
})
export class FigmaModule {}
