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
} from '../schemas/ai-output.schemas';

/**
 * Provider-independent AI interfaces (spec §18, §8, 14.4).
 * Business logic depends on these — never on a concrete SDK.
 */

export interface BrandContext {
  brandName: string;
  industry?: string;
  targetAudience?: string;
  communicationStyle?: string;
  addressing?: string;
  preferredPhrases?: string[];
  forbiddenPhrases?: string[];
  requiredCtas?: string[];
  humorLevel?: number;
  formalityLevel?: number;
  energyLevel?: number;
  trustRules?: string;
  complianceNotes?: string;
}

export interface KnowledgeContext {
  sources: { title: string; excerpt: string }[];
}

export interface ContentStrategyInput {
  rawText: string;
  sourceType: string;
  brand?: BrandContext;
  knowledge?: KnowledgeContext;
}

export interface ContentPillarInput {
  brand?: BrandContext;
  knowledge?: KnowledgeContext;
  existingIdeas: string[];
  existingPillars: string[];
}

export interface ContentPlanInput {
  brand?: BrandContext;
  knowledge?: KnowledgeContext;
  pillars: string[];
  startDate: string;
  endDate: string;
  postsPerWeek: number;
  goals: string[];
  preferredDays?: string[];
  preferredLengths?: string[];
  preferredStyles?: string[];
  campaignContext?: string;
}

export interface ScriptGenerationInput {
  topic: string;
  rawIdea?: string;
  goal?: string;
  targetAudience?: string;
  length?: string;
  style?: string;
  emotion?: string;
  cta?: string;
  template?: {
    name: string;
    structure: unknown;
    hookPattern?: string;
    bodyPattern?: string;
    ctaPattern?: string;
    complianceRules?: string;
  };
  inspirationPatterns?: string[];
  brand?: BrandContext;
  knowledge?: KnowledgeContext;
  stylePreferences?: string[];
}

export interface ScriptReviewInput {
  spokenScript: string;
  hook: string;
  cta: string;
  goal?: string;
  brand?: BrandContext;
}

export interface ComplianceInput {
  content: string;
  contentCategory?: string;
  complianceNotes?: string;
}

export interface InspirationAnalysisInput {
  transcript?: string;
  userNotes?: string;
  title: string;
}

export interface StyleMemoryInput {
  originalScript: string;
  editedScript: string;
}

export interface ContentStrategyProvider {
  extractIdeas(input: ContentStrategyInput): Promise<ExtractedIdeas>;
  createContentPillars(input: ContentPillarInput): Promise<ContentPillarsOutput>;
  createContentPlan(input: ContentPlanInput): Promise<GeneratedContentPlan>;
  buildInterviewBrief(transcript: string, brand?: BrandContext): Promise<InterviewBrief>;
  analyzeInspiration(input: InspirationAnalysisInput): Promise<InspirationPatterns>;
  analyzeStyle(input: StyleMemoryInput): Promise<StyleMemoryAnalysis>;
}

export interface ScriptGenerationProvider {
  generateScripts(input: ScriptGenerationInput): Promise<GeneratedScripts>;
}

export interface ScriptReviewProvider {
  reviewScript(input: ScriptReviewInput): Promise<ScriptReview>;
}

export interface ComplianceProvider {
  checkContent(input: ComplianceInput): Promise<ComplianceResult>;
}

// ---- Voice (spec §8) ----

export interface TranscriptionInput {
  /** Path within content storage — used when the audio was persisted. */
  filePath?: string;
  /** In-memory audio — used when the user chose not to store the recording. */
  fileBuffer?: Buffer;
  mimeType: string;
  language?: string;
}

export interface TranscriptionResult {
  text: string;
  language?: string;
  durationSeconds?: number;
  segments?: { startMs: number; endMs: number; text: string }[];
}

export interface TranscriptionProvider {
  transcribeAudio(input: TranscriptionInput): Promise<TranscriptionResult>;
}

export interface CreateRealtimeSessionInput {
  instructions: string;
  voice?: string;
}

export interface RealtimeSessionToken {
  token: string;
  expiresAt: string;
  model: string;
  provider: string;
}

export interface RealtimeVoiceProvider {
  createSessionToken(input: CreateRealtimeSessionInput): Promise<RealtimeSessionToken>;
  isAvailable(): boolean;
}

export const PROVIDER_TOKENS = {
  contentStrategy: 'CONTENT_STRATEGY_PROVIDER',
  scriptGeneration: 'SCRIPT_GENERATION_PROVIDER',
  scriptReview: 'SCRIPT_REVIEW_PROVIDER',
  compliance: 'COMPLIANCE_PROVIDER',
  transcription: 'TRANSCRIPTION_PROVIDER',
  realtimeVoice: 'REALTIME_VOICE_PROVIDER',
} as const;
