import { z } from 'zod';

/**
 * Zod schemas for every AI workflow output (spec §19).
 * AI output is untrusted — nothing is stored without passing these.
 */

// ---- §7.1 Extracted ideas ----

export const extractedIdeaSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(''),
  keyMessage: z.string().default(''),
  suggestedGoal: z.string().default(''),
  suggestedHook: z.string().default(''),
  suggestedCta: z.string().default(''),
  suggestedFormats: z.array(z.string()).default([]),
  targetAudience: z.string().default(''),
});

export const extractedIdeasSchema = z.object({
  mainTopic: z.string().default(''),
  clientProblem: z.string().default(''),
  keyLesson: z.string().default(''),
  openQuestions: z.array(z.string()).default([]),
  ideas: z.array(extractedIdeaSchema).min(1).max(10),
});
export type ExtractedIdeas = z.infer<typeof extractedIdeasSchema>;

// ---- §7.4 Interview brief ----

export const interviewBriefSchema = z.object({
  summary: z.string().min(1),
  keyThoughts: z.array(z.string()).default([]),
  ideas: z.array(extractedIdeaSchema).default([]),
  suggestedPillars: z.array(z.string()).default([]),
  missingInformation: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  uncertainty: z.array(z.string()).default([]),
});
export type InterviewBrief = z.infer<typeof interviewBriefSchema>;

export const interviewNextQuestionSchema = z.object({
  question: z.string().default(''),
  done: z.boolean().default(false),
  reason: z.string().default(''),
});
export type InterviewNextQuestionOutput = z.infer<typeof interviewNextQuestionSchema>;

// ---- Content pillars ----

export const contentPillarsSchema = z.object({
  pillars: z
    .array(
      z.object({
        name: z.string().min(1),
        description: z.string().default(''),
        priority: z.number().int().min(0).max(10).default(0),
        targetFrequency: z.string().default(''),
        complianceNotes: z.string().default(''),
      }),
    )
    .min(1),
});
export type ContentPillarsOutput = z.infer<typeof contentPillarsSchema>;

// ---- §15 Content plan ----

export const contentPlanItemSchema = z.object({
  scheduledDate: z.string().min(1),
  workingTitle: z.string().min(1),
  topic: z.string().default(''),
  pillar: z.string().default(''),
  goal: z.string().default(''),
  targetAudience: z.string().default(''),
  template: z.string().default(''),
  length: z.string().default(''),
  style: z.string().default(''),
  emotion: z.string().default(''),
  suggestedHook: z.string().default(''),
  cta: z.string().default(''),
});

export const generatedContentPlanSchema = z.object({
  name: z.string().min(1),
  items: z.array(contentPlanItemSchema).min(1),
  notes: z.array(z.string()).default([]),
});
export type GeneratedContentPlan = z.infer<typeof generatedContentPlanSchema>;

// ---- §17 Generated scripts (3 variants) ----

export const scriptStrategySchema = z.object({
  workingTitle: z.string().min(1),
  goal: z.string().default(''),
  targetAudience: z.string().default(''),
  contentPillar: z.string().default(''),
  recommendedLength: z.string().default(''),
  recommendedStyle: z.string().default(''),
  recommendedEmotion: z.string().default(''),
  template: z.string().default(''),
  contentAngle: z.string().default(''),
  angleReason: z.string().default(''),
});

export const scriptProductionPlanSchema = z.object({
  estimatedDurationSeconds: z.number().default(0),
  scenes: z
    .array(
      z.object({
        description: z.string(),
        onScreenText: z.string().default(''),
        brollSuggestion: z.string().default(''),
        deliveryNote: z.string().default(''),
      }),
    )
    .default([]),
  pacingNotes: z.string().default(''),
  pauses: z.array(z.string()).default([]),
  emphasizedWords: z.array(z.string()).default([]),
});

export const scriptInstagramAssetsSchema = z.object({
  caption: z.string().default(''),
  shortCaption: z.string().default(''),
  thumbnailText: z.string().default(''),
  firstComment: z.string().default(''),
  ctaText: z.string().default(''),
  hashtags: z.array(z.string()).default([]),
  alternativeHooks: z.array(z.string()).default([]),
  alternativeTitles: z.array(z.string()).default([]),
});

export const scriptSafetySchema = z.object({
  factualUncertainty: z.array(z.string()).default([]),
  complianceRisks: z.array(z.string()).default([]),
  recommendedDisclaimer: z.string().default(''),
  sensitiveInfoWarnings: z.array(z.string()).default([]),
  claimsToVerify: z.array(z.string()).default([]),
  sourceReferences: z.array(z.string()).default([]),
});

export const generatedScriptVariantSchema = z.object({
  versionName: z.string().min(1),
  strategy: scriptStrategySchema,
  hook: z.string().min(1),
  setup: z.string().default(''),
  mainMessage: z.string().min(1),
  keyInsight: z.string().default(''),
  cta: z.string().min(1),
  spokenScript: z.string().min(1),
  productionPlan: scriptProductionPlanSchema,
  instagramAssets: scriptInstagramAssetsSchema,
  safety: scriptSafetySchema,
});

export const generatedScriptsSchema = z.object({
  variants: z.array(generatedScriptVariantSchema).min(1).max(3),
});
export type GeneratedScripts = z.infer<typeof generatedScriptsSchema>;
export type GeneratedScriptVariant = z.infer<typeof generatedScriptVariantSchema>;

// ---- §21 Script review (all scores are AI estimates) ----

const aiScore = z.number().min(0).max(10);

export const scriptReviewSchema = z.object({
  scores: z.object({
    hookStrength: aiScore,
    clarity: aiScore,
    naturalSpeech: aiScore,
    audienceRelevance: aiScore,
    trust: aiScore,
    brandDnaMatch: aiScore,
    ctaQuality: aiScore,
    retentionPotential: aiScore,
    originality: aiScore,
    complianceSafety: aiScore,
    overall: aiScore,
  }),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  suggestedImprovements: z.array(z.string()).default([]),
  confusingSentences: z.array(z.string()).default([]),
  genericLanguage: z.array(z.string()).default([]),
  unsupportedClaims: z.array(z.string()).default([]),
  complianceWarnings: z.array(z.string()).default([]),
  improvedHook: z.string().default(''),
  improvedCta: z.string().default(''),
});
export type ScriptReview = z.infer<typeof scriptReviewSchema>;

// ---- Compliance result ----

export const complianceResultSchema = z.object({
  riskLevel: z.enum(['low', 'medium', 'high']),
  findings: z.array(z.string()).default([]),
  requiredDisclaimers: z.array(z.string()).default([]),
  blockedClaims: z.array(z.string()).default([]),
  notes: z.string().default(''),
});
export type ComplianceResult = z.infer<typeof complianceResultSchema>;

// ---- §13 Inspiration patterns ----

export const inspirationPatternsSchema = z.object({
  patterns: z
    .array(
      z.object({
        category: z.string().min(1),
        pattern: z.string().min(1),
        note: z.string().default(''),
      }),
    )
    .default([]),
});
export type InspirationPatterns = z.infer<typeof inspirationPatternsSchema>;

// ---- §23 Style memory analysis ----

export const styleMemoryAnalysisSchema = z.object({
  preferences: z
    .array(
      z.object({
        preferenceType: z.string().min(1),
        preferenceValue: z.string().min(1),
        confidence: z.number().min(0).max(1),
      }),
    )
    .default([]),
});
export type StyleMemoryAnalysis = z.infer<typeof styleMemoryAnalysisSchema>;
