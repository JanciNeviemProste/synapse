import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { AiService, AiTruncatedOutputError } from '../../ai/ai.service';
import {
  AiOutputValidationError,
  parseAiJson,
} from '../schemas/ai-json';
import {
  ComplianceResult,
  ContentPillarsOutput,
  DocumentClassification,
  ExtractedIdeas,
  GeneratedContentPlan,
  GeneratedScripts,
  GeneratedScriptVariant,
  InspirationPatterns,
  InterviewBrief,
  ProofreadFields,
  ScriptReview,
  StyleMemoryAnalysis,
  complianceResultSchema,
  contentPillarsSchema,
  documentClassificationSchema,
  extractedIdeasSchema,
  generatedContentPlanSchema,
  generatedScriptVariantSchema,
  inspirationPatternsSchema,
  interviewBriefSchema,
  interviewNextQuestionSchema,
  proofreadFieldsSchema,
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
  DocumentClassificationProvider,
  InspirationAnalysisInput,
  ScriptGenerationInput,
  ScriptGenerationProvider,
  ScriptReviewInput,
  ScriptReviewProvider,
  StyleMemoryInput,
  BrandContext,
  InterviewNextQuestion,
  InterviewTurn,
} from './provider.interfaces';
import { buildDocumentClassificationPrompt } from '../prompts/document-classification.prompt';
import { buildIdeaExtractionPrompt } from '../prompts/voice-idea-extraction.prompt';
import { buildContentPillarsPrompt } from '../prompts/content-pillars.prompt';
import { buildContentPlanPrompt } from '../prompts/content-plan-generation.prompt';
import { buildScriptGenerationPrompt } from '../prompts/reel-script-generation.prompt';
import { buildProofreadPrompt } from '../prompts/slovak-proofread.prompt';
import { buildScriptReviewPrompt } from '../prompts/reel-script-review.prompt';
import { buildComplianceCheckPrompt } from '../prompts/compliance-check.prompt';
import {
  buildInterviewBriefPrompt,
  buildNextQuestionPrompt,
} from '../prompts/ai-content-interview.prompt';
import { buildInspirationAnalysisPrompt } from '../prompts/inspiration-pattern-analysis.prompt';
import { buildStyleMemoryPrompt } from '../prompts/style-memory-analysis.prompt';
import { buildVideoAnalysisPrompt } from '../prompts/video-content-analysis.prompt';
import {
  buildContentDnaPrompt,
  DnaPromptAnalysis,
} from '../prompts/content-dna-generation.prompt';
import {
  ContentDnaOutput,
  VideoUnderstandingOutput,
  contentDnaSchema,
  videoUnderstandingSchema,
} from '../schemas/video-analysis.schemas';
import {
  ContentDnaProvider,
  VideoUnderstandingInput,
  VideoUnderstandingProvider,
} from './provider.interfaces';

/**
 * Apply proofread corrections back onto a variant — only the text fields,
 * everything else (production plan, hashtags, safety) untouched. A corrected
 * field is used only when non-empty, so a dropped field never blanks the
 * original. Pure — unit tested.
 */
export function mergeProofread(
  variant: GeneratedScriptVariant,
  corrected: ProofreadFields,
): GeneratedScriptVariant {
  const pick = (orig: string, fixed: string) =>
    fixed && fixed.trim() ? fixed : orig;
  return {
    ...variant,
    hook: pick(variant.hook, corrected.hook),
    setup: pick(variant.setup, corrected.setup),
    mainMessage: pick(variant.mainMessage, corrected.mainMessage),
    keyInsight: pick(variant.keyInsight, corrected.keyInsight),
    cta: pick(variant.cta, corrected.cta),
    spokenScript: pick(variant.spokenScript, corrected.spokenScript),
    instagramAssets: {
      ...variant.instagramAssets,
      caption: pick(variant.instagramAssets.caption, corrected.caption),
    },
  };
}

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
    ComplianceProvider,
    VideoUnderstandingProvider,
    ContentDnaProvider,
    DocumentClassificationProvider
{
  private readonly logger = new Logger(AnthropicContentProvider.name);

  constructor(private readonly aiService: AiService) {}

  private async generateValidated<T>(
    schema: z.ZodType<T>,
    system: string,
    user: string,
    workflow: string,
    maxTokens = 8192,
  ): Promise<T> {
    const started = Date.now();
    try {
      const raw = await this.aiService.generateText(system, user, maxTokens);
      try {
        const result = parseAiJson(schema, raw);
        this.logger.log(
          `content-studio workflow=${workflow} provider=anthropic ok latencyMs=${Date.now() - started}`,
        );
        return result;
      } catch (error) {
        if (error instanceof AiTruncatedOutputError) throw error;
        if (!(error instanceof AiOutputValidationError)) throw error;
        this.logger.warn(
          `workflow=${workflow} output invalid (${error.issues.join('; ')}), retrying once`,
        );
        const retryRaw = await this.aiService.generateText(
          system,
          `${user}\n\nPredchádzajúci pokus nebol validný JSON podľa schémy (${error.issues.join('; ')}). Vráť POUZE validný JSON presne podľa schémy.`,
          maxTokens,
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

  nextInterviewQuestion(
    history: InterviewTurn[],
    brand?: BrandContext,
  ): Promise<InterviewNextQuestion> {
    const { system, user } = buildNextQuestionPrompt(history, brand);
    return this.generateValidated(
      interviewNextQuestionSchema,
      system,
      user,
      'interview-question',
    );
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

  classifyDocument(fileName: string, textExcerpt: string): Promise<DocumentClassification> {
    const { system, user } = buildDocumentClassificationPrompt(fileName, textExcerpt);
    return this.generateValidated(
      documentClassificationSchema,
      system,
      user,
      'classify-document',
    );
  }

  async generateScripts(input: ScriptGenerationInput): Promise<GeneratedScripts> {
    // Fan out one variant per call instead of asking for all 3 at once — each
    // response is a fraction of the size, so it stays well under the output
    // token cap even when the knowledge context is large.
    const letters: ('A' | 'B' | 'C')[] = ['A', 'B', 'C'];
    const results = await Promise.allSettled(
      letters.map((versionName) => {
        const { system, user } = buildScriptGenerationPrompt({ ...input, versionName });
        return this.generateValidated(
          generatedScriptVariantSchema,
          system,
          user,
          `generate-script-${versionName}`,
        );
      }),
    );
    // One bad variant shouldn't sink the other two — return whatever came
    // back successfully instead of failing the whole batch.
    const generated = results
      .filter((r): r is PromiseFulfilledResult<GeneratedScriptVariant> => r.status === 'fulfilled')
      .map((r) => r.value);
    const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    if (failed.length > 0) {
      this.logger.warn(
        `generate-scripts: ${failed.length}/3 variants failed (${failed.map((f) => (f.reason as Error)?.message).join('; ')})`,
      );
    }
    if (generated.length === 0) {
      throw failed[0].reason;
    }
    // Always run a Slovak proofreading pass so grammar/spelling is clean.
    const variants = await Promise.all(
      generated.map((v) => this.proofreadVariant(v)),
    );
    return { variants };
  }

  /** Correct the Slovak of one variant; best-effort — keep original on failure. */
  private async proofreadVariant(
    variant: GeneratedScriptVariant,
  ): Promise<GeneratedScriptVariant> {
    const fields: ProofreadFields = {
      hook: variant.hook,
      setup: variant.setup,
      mainMessage: variant.mainMessage,
      keyInsight: variant.keyInsight,
      cta: variant.cta,
      spokenScript: variant.spokenScript,
      caption: variant.instagramAssets.caption,
    };
    try {
      const { system, user } = buildProofreadPrompt(fields);
      const corrected = await this.generateValidated(
        proofreadFieldsSchema,
        system,
        user,
        'slovak-proofread',
      );
      return mergeProofread(variant, corrected);
    } catch (error) {
      this.logger.warn(
        `slovak-proofread skipped for variant ${variant.versionName}: ${(error as Error).message}`,
      );
      return variant;
    }
  }

  reviewScript(input: ScriptReviewInput): Promise<ScriptReview> {
    const { system, user } = buildScriptReviewPrompt(input);
    return this.generateValidated(scriptReviewSchema, system, user, 'script-review');
  }

  checkContent(input: ComplianceInput): Promise<ComplianceResult> {
    const { system, user } = buildComplianceCheckPrompt(input);
    return this.generateValidated(complianceResultSchema, system, user, 'compliance');
  }

  analyzeVideo(input: VideoUnderstandingInput): Promise<VideoUnderstandingOutput> {
    const { system, user } = buildVideoAnalysisPrompt(input);
    return this.generateValidated(videoUnderstandingSchema, system, user, 'video-analysis');
  }

  generateContentDna(analyses: DnaPromptAnalysis[]): Promise<ContentDnaOutput> {
    const { system, user } = buildContentDnaPrompt(analyses);
    return this.generateValidated(contentDnaSchema, system, user, 'content-dna');
  }
}
