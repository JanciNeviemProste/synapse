import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './common/config/configuration';
import { DatabaseModule } from './database/database.module';
import { TelegramModule } from './telegram/telegram.module';
import { AiModule } from './ai/ai.module';
import { ImagesModule } from './images/images.module';
import { CoderModule } from './coder/coder.module';
import { GmailModule } from './gmail/gmail.module';
import { ResearchModule } from './research/research.module';
import { LeadsModule } from './leads/leads.module';
import { TrackingModule } from './tracking/tracking.module';
import { BookingModule } from './booking/booking.module';
import { FigmaModule } from './figma/figma.module';
import { ClonerModule } from './cloner/cloner.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    TelegramModule,
    AiModule,
    ImagesModule,
    CoderModule,
    GmailModule,
    ResearchModule,
    LeadsModule,
    TrackingModule,
    BookingModule,
    FigmaModule,
    ClonerModule,
  ],
})
export class AppModule {}
