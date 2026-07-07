import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import configuration from './common/config/configuration';
import { AuthModule } from './auth/auth.module';
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
import { ContentStudioModule } from './content-studio/content-studio.module';
import { PetoModule } from './peto/peto.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
    AuthModule,
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
    ContentStudioModule,
    PetoModule,
  ],
})
export class AppModule {}
