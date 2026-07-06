import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { AnthropicContentProvider } from './providers/anthropic.provider';
import { MockContentProvider } from './providers/mock.provider';
import { ContentProviderFactory } from './providers/provider.factory';
import { ContentStorageService } from './storage/content-storage.service';
import { ContentJobsService } from './jobs/content-jobs.service';

@Module({
  imports: [AiModule],
  providers: [
    AnthropicContentProvider,
    MockContentProvider,
    ContentProviderFactory,
    ContentStorageService,
    ContentJobsService,
  ],
  exports: [
    ContentProviderFactory,
    ContentStorageService,
    ContentJobsService,
  ],
})
export class ContentStudioModule {}
