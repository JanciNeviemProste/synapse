import { Module } from '@nestjs/common';
import { TelegramModule } from '../telegram/telegram.module';
import { TrackingService } from './tracking.service';
import { TrackingController } from './tracking.controller';
import { HeatScoreService } from './heat-score.service';

@Module({
  imports: [TelegramModule],
  controllers: [TrackingController],
  providers: [TrackingService, HeatScoreService],
  exports: [TrackingService],
})
export class TrackingModule {}
