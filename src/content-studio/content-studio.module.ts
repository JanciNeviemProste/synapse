import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { ContentStudioApiController } from './content-studio-api.controller';
import { ContentStudioController } from './content-studio.controller';
import { ContentDnaService } from './intelligence/content-dna.service';
import { IntelligenceService } from './intelligence/intelligence.service';
import { MediaService } from './intelligence/media.service';
import { ContentJobsService } from './jobs/content-jobs.service';
import { AnthropicContentProvider } from './providers/anthropic.provider';
import { MockContentProvider } from './providers/mock.provider';
import { OpenAiRealtimeProvider } from './providers/openai-realtime.provider';
import { OpenAiTranscriptionProvider } from './providers/openai-transcription.provider';
import { ContentProviderFactory } from './providers/provider.factory';
import { BrandProfileService } from './services/brand-profile.service';
import { IdeasService } from './services/ideas.service';
import { InterviewService } from './services/interview.service';
import { InspirationService } from './services/inspiration.service';
import { KnowledgeService } from './services/knowledge.service';
import { PillarsService } from './services/pillars.service';
import { PlansService } from './services/plans.service';
import { ScriptsService } from './services/scripts.service';
import { StyleMemoryService } from './services/style-memory.service';
import { TemplatesService } from './services/templates.service';
import { VoiceService } from './services/voice.service';
import { ContentStorageService } from './storage/content-storage.service';

@Module({
  imports: [AiModule],
  controllers: [ContentStudioController, ContentStudioApiController],
  providers: [
    AnthropicContentProvider,
    MockContentProvider,
    OpenAiTranscriptionProvider,
    OpenAiRealtimeProvider,
    ContentProviderFactory,
    ContentStorageService,
    ContentJobsService,
    BrandProfileService,
    KnowledgeService,
    IdeasService,
    TemplatesService,
    PillarsService,
    InspirationService,
    VoiceService,
    InterviewService,
    MediaService,
    IntelligenceService,
    ContentDnaService,
    PlansService,
    ScriptsService,
    StyleMemoryService,
  ],
  exports: [
    ContentProviderFactory,
    ContentStorageService,
    ContentJobsService,
    BrandProfileService,
    KnowledgeService,
    InspirationService,
    TemplatesService,
  ],
})
export class ContentStudioModule {}
