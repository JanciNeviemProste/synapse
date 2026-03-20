import { Module, forwardRef } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { TelegramUpdate } from './telegram.update';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [forwardRef(() => AiModule)],
  providers: [TelegramService, TelegramUpdate],
  exports: [TelegramService, TelegramUpdate],
})
export class TelegramModule {}
