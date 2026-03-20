import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { ResearchService } from './research.service';
import { GoogleSearchService } from './google-search.service';
import { OrsrService } from './orsr.service';
import { FinstatService } from './finstat.service';
import { WebAnalyzerService } from './web-analyzer.service';
import { TrustScoreService } from './trust-score.service';

@Module({
  imports: [AiModule],
  providers: [
    ResearchService,
    GoogleSearchService,
    OrsrService,
    FinstatService,
    WebAnalyzerService,
    TrustScoreService,
  ],
  exports: [ResearchService],
})
export class ResearchModule {}
