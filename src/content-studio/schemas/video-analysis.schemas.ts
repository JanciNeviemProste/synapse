import { z } from 'zod';

/**
 * Content Intelligence output schemas (spec 14.5).
 * Layer A (observed facts) comes from ffprobe + transcription — not AI.
 * Layers B–E + timeline come from the video-understanding provider.
 */

// ---- B. Content meaning ----
export const videoSummarySchema = z.object({
  summary: z.string().default(''),
  topic: z.string().default(''),
  targetAudience: z.string().default(''),
  viewerProblem: z.string().default(''),
  corePromise: z.string().default(''),
  mainLesson: z.string().default(''),
  contentPillar: z.string().default(''),
  contentGoal: z.string().default(''),
  hook: z.string().default(''),
  setup: z.string().default(''),
  mainArgument: z.string().default(''),
  payoff: z.string().default(''),
  cta: z.string().default(''),
  likelyTemplate: z.string().default(''),
  claimsToVerify: z.array(z.string()).default([]),
});

// ---- C. Timeline segments ----
export const videoSegmentSchema = z.object({
  startMs: z.number().int().min(0),
  endMs: z.number().int().min(0),
  transcriptText: z.string().default(''),
  visualDescription: z.string().default(''),
  onScreenText: z.string().default(''),
  editingEvent: z.string().default(''),
  deliveryStyle: z.string().default(''),
  purpose: z.string().default(''),
  attentionMechanism: z.string().default(''),
  confidence: z.number().min(0).max(1).default(0.5),
});

// ---- D. Creative & retention analysis ----
export const creativeAnalysisSchema = z.object({
  firstFrameClarity: z.string().default(''),
  firstThreeSecondsHook: z.string().default(''),
  curiosityGap: z.string().default(''),
  specificity: z.string().default(''),
  emotionalTension: z.string().default(''),
  storytellingStructure: z.string().default(''),
  pacing: z.string().default(''),
  captionUse: z.string().default(''),
  patternInterruptions: z.array(z.string()).default([]),
  openLoops: z.array(z.string()).default([]),
  trustSignals: z.array(z.string()).default([]),
  ctaStrength: z.string().default(''),
  dropOffRisks: z.array(z.string()).default([]),
});

// ---- E. Reusable insights ----
export const reusableInsightsSchema = z.object({
  strongPatterns: z.array(z.string()).default([]),
  weakPatterns: z.array(z.string()).default([]),
  reusableHookPatterns: z.array(z.string()).default([]),
  reusableStructurePatterns: z.array(z.string()).default([]),
  pacingRecommendations: z.array(z.string()).default([]),
  contentGaps: z.array(z.string()).default([]),
  inspiredIdeas: z.array(z.string()).default([]),
  recommendedImprovements: z.array(z.string()).default([]),
});

// ---- AI scores (all labeled AI estimates in UI) ----
const aiScore10 = z.number().min(0).max(10);
export const videoAiScoresSchema = z.object({
  hookStrength: aiScore10,
  clarity: aiScore10,
  pacing: aiScore10,
  visualEngagement: aiScore10,
  trust: aiScore10,
  retentionPotential: aiScore10,
  cta: aiScore10,
  originality: aiScore10,
  overall: aiScore10,
});

export const videoUnderstandingSchema = z.object({
  language: z.string().default('sk'),
  summary: videoSummarySchema,
  segments: z.array(videoSegmentSchema).default([]),
  creativeAnalysis: creativeAnalysisSchema,
  reusableInsights: reusableInsightsSchema,
  aiScores: videoAiScoresSchema,
});
export type VideoUnderstandingOutput = z.infer<typeof videoUnderstandingSchema>;

// ---- Performance hypotheses (spec 14.6 — hypotheses, never causal claims) ----
export const performanceHypothesesSchema = z.object({
  hypotheses: z
    .array(
      z.object({
        pattern: z.string(),
        hypothesis: z.string(),
        evidence: z.string().default(''),
        confidence: z.enum(['low', 'medium', 'high']).default('low'),
      }),
    )
    .default([]),
});
export type PerformanceHypotheses = z.infer<typeof performanceHypothesesSchema>;

// ---- Content DNA (spec 14.8) ----
export const contentDnaSchema = z.object({
  dominantPillars: z.array(z.string()).default([]),
  commonFormats: z.array(z.string()).default([]),
  recurringHookStructures: z.array(z.string()).default([]),
  typicalDurationSeconds: z.number().default(0),
  speechPace: z.string().default(''),
  visualRhythm: z.string().default(''),
  ctaPatterns: z.array(z.string()).default([]),
  strongestTopics: z.array(z.string()).default([]),
  underperformingPatterns: z.array(z.string()).default([]),
  contentGaps: z.array(z.string()).default([]),
  rules: z
    .array(
      z.object({
        category: z.string(),
        rule: z.string(),
        evidence: z.string().default(''),
        confidence: z.number().min(0).max(1).default(0.5),
      }),
    )
    .default([]),
});
export type ContentDnaOutput = z.infer<typeof contentDnaSchema>;
