import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiLearningService } from './ai-learning.service';

@Module({
  providers: [AiService, AiLearningService],
  exports: [AiService, AiLearningService],
})
export class AiModule {}
