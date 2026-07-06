import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { AiService } from '../../ai/ai.service';
import {
  AiOutputValidationError,
  parseAiJson,
} from '../schemas/ai-json';
import {
  ComplianceResult,
  ContentPillarsOutput,
  ExtractedIdeas,
  GeneratedContentPlan,
  GeneratedScripts,
  InspirationPatterns,
  InterviewBrief,
  ScriptReview,
  StyleMemoryAnalysis,
  complianceResultSchema,
  contentPillarsSchema,
  extractedIdeasSchema,
  generatedContentPlanSchema,
  generatedScriptsSchema,
  inspirationPatternsSchema,
  interviewBriefSchema,
  scriptReviewSchema,
  styleMemoryAnalysisSchema,
} from '../schemas/ai-output.schemas';
import {
  ComplianceInput,
  ComplianceProvider,
  ContentPillarInput,
  ContentPlanInput,
  ContentStrategyInput,
  ContentStrategyProvider,
  InspirationAnalysisInput,
  ScriptGenerationInput,
  ScriptGenerationProvider,
  ScriptReviewInput,
  ScriptReviewProvider,
  StyleMemoryInput,
  BrandContext,
} from './provider.interfaces';
import { buildIdeaExtractionPrompt } from '../prompts/voice-idea-extraction.prompt';
import { buildContentPillarsPrompt } from '../prompts/content-pillars.prompt';
import { buildContentPlanPrompt } from '../prompts/content-plan-generation.prompt';
import { buildScriptGenerationPrompt } from '../prompts/reel-script-generation.prompt';
import { buildScriptReviewPrompt } from '../prompts/reel-script-review.prompt';
import { buildComplianceCheckPrompt } from '../prompts/compliance-check.prompt';
import { buildInterviewBriefPrompt } from '../prompts/ai-content-interview.prompt';
import { buildInspirationAnalysisPrompt } from '../prompts/inspiration-pattern-analysis.prompt';
import { buildStyleMemoryPrompt } from '../prompts/style-memory-analysis.prompt';

/**
 * Anthropic-backed provider (via the existing AiService, which itself
 * falls back to Claude CLI). Validates every output with Zod and retries
 * once with a corrective instruction on validation failure (spec §19).
 */
@Injectable()
export class AnthropicContentProvider
  implements
    ContentStrategyProvider,
    ScriptGenerationProvider,
    ScriptReviewProvider,
    ComplianceProvider
{
  private readonly logger = new Logger(AnthropicContentProvider.name);

  constructor(private readonly aiService: AiService) {}

  private async generateValidated<T>(
    schema: z.ZodType<T>,
    system: string,
    user: string,
    workflow: string,
  ): Promise<T> {
    const started = Date.now();
    try {
      const raw = await this.aiService.generateText(system, user);
      try {
        const result = parseAiJson(schema, raw);
        this.logger.log(
          `content-studio workflow=${workflow} provider=anthropic ok latencyMs=${Date.now() - started}`,
        );
        return result;
      } catch (error) {
        if (!(error instanceof AiOutputValidationError)) throw error;
        this.logger.warn(
          `workflow=${workflow} output invalid (${error.issues.join('; ')}), retrying once`,
        );
        const retryRaw = await this.aiService.generateText(
          system,
          `${user}\n\nPredchádzajúci pokus nebol validný JSON podľa schémy (${error.issues.join('; ')}). Vráť POUZE validný JSON presne podľa schémy.`,
        );
        const result = parseAiJson(schema, retryRaw);
        this.logger.log(
          `content-studio workflow=${workflow} provider=anthropic ok-after-retry latencyMs=${Date.now() - started}`,
        );
        return result;
      }
    } catch (error) {
      this.logger.error(
        `content-studio workflow=${workflow} provider=anthropic failed latencyMs=${Date.now() - started}`,
        (error as Error).message,
      );
      throw error;
    }
  }

  extractIdeas(input: ContentStrategyInput): Promise<ExtractedIdeas> {
    const { system, user } = buildIdeaExtractionPrompt(input);
    return this.generateValidated(extractedIdeasSchema, system, user, 'extract-ideas');
  }

  createContentPillars(input: ContentPillarInput): Promise<ContentPillarsOutput> {
    const { system, user } = buildContentPillarsPrompt(input);
    return this.generateValidated(contentPillarsSchema, system, user, 'content-pillars');
  }

  createContentPlan(input: ContentPlanInput): Promise<GeneratedContentPlan> {
    const { system, user } = buildContentPlanPrompt(input);
    return this.generateValidated(
      generatedContentPlanSchema,
      system,
      user,
      'content-plan',
    );
  }

  buildInterviewBrief(
    transcript: string,
    brand?: BrandContext,
  ): Promise<InterviewBrief> {
    const { system, user } = buildInterviewBriefPrompt(transcript, brand);
    return this.generateValidated(interviewBriefSchema, system, user, 'interview-brief');
  }

  analyzeInspiration(input: InspirationAnalysisInput): Promise<InspirationPatterns> {
    const { system, user } = buildInspirationAnalysisPrompt(input);
    return this.generateValidated(
      inspirationPatternsSchema,
      system,
      user,
      'inspiration-patterns',
    );
  }

  analyzeStyle(input: StyleMemoryInput): Promise<StyleMemoryAnalysis> {
    const { system, user } = buildStyleMemoryPrompt(input);
    return this.generateValidated(styleMemoryAnalysisSchema, system, user, 'style-memory');
  }

  generateScripts(input: ScriptGenerationInput): Promise<GeneratedScripts> {
    const { system, user } = buildScriptGenerationPrompt(input);
    return this.generateValidated(generatedScriptsSchema, system, user, 'generate-scripts');
  }

  reviewScript(input: ScriptReviewInput): Promise<ScriptReview> {
    const { system, user } = buildScriptReviewPrompt(input);
    return this.generateValidated(scriptReviewSchema, system, user, 'script-review');
  }

  checkContent(input: ComplianceInput): Promise<ComplianceResult> {
    const { system, user } = buildComplianceCheckPrompt(input);
    return this.generateValidated(complianceResultSchema, system, user, 'compliance');
  }
}
