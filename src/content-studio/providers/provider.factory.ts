import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AnthropicContentProvider } from './anthropic.provider';
import { MockContentProvider } from './mock.provider';
import { GroqTranscriptionProvider } from './groq-transcription.provider';
import { OpenAiRealtimeProvider } from './openai-realtime.provider';
import { OpenAiTranscriptionProvider } from './openai-transcription.provider';
import {
  BrandExtractionProvider,
  ComplianceProvider,
  ContentDnaProvider,
  ContentStrategyProvider,
  DocumentClassificationProvider,
  RealtimeVoiceProvider,
  ScriptGenerationProvider,
  ScriptReviewProvider,
  TranscriptionProvider,
  VideoUnderstandingProvider,
} from './provider.interfaces';

export type ProviderKind = 'anthropic' | 'openai' | 'groq' | 'mock';
export type ProviderRole =
  | 'strategy'
  | 'script'
  | 'review'
  | 'compliance'
  | 'transcription'
  | 'realtime'
  | 'video';

/**
 * Resolve which provider implementation to use for a role.
 * 'auto' picks a real provider when credentials exist, otherwise mock —
 * so the module always works without paid keys (spec principle 18).
 */
export function resolveProviderKind(
  configured: string,
  role: ProviderRole,
  creds: { anthropic: boolean; openai: boolean; groq: boolean },
): ProviderKind {
  const normalized = (configured || 'auto').toLowerCase();
  if (normalized === 'mock') return 'mock';
  if (normalized === 'anthropic') return creds.anthropic ? 'anthropic' : 'mock';
  if (normalized === 'groq') return creds.groq ? 'groq' : 'mock';
  if (normalized === 'openai') return creds.openai ? 'openai' : 'mock';

  // auto
  if (role === 'transcription') {
    // Groq Whisper (free) preferred, then OpenAI Whisper, else mock.
    if (creds.groq) return 'groq';
    return creds.openai ? 'openai' : 'mock';
  }
  if (role === 'realtime') {
    return creds.openai ? 'openai' : 'mock';
  }
  return creds.anthropic ? 'anthropic' : 'mock';
}

@Injectable()
export class ContentProviderFactory {
  private readonly logger = new Logger(ContentProviderFactory.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly anthropicProvider: AnthropicContentProvider,
    private readonly mockProvider: MockContentProvider,
    private readonly openaiTranscription: OpenAiTranscriptionProvider,
    private readonly openaiRealtime: OpenAiRealtimeProvider,
    private readonly groqTranscription: GroqTranscriptionProvider,
  ) {}

  private creds(): { anthropic: boolean; openai: boolean; groq: boolean } {
    const anthropicKey =
      this.configService.get<string>('anthropic.apiKey') || '';
    const openrouterKey =
      this.configService.get<string>('openrouter.apiKey') || '';
    const aiProvider = this.configService.get<string>('anthropic.provider') || 'auto';
    return {
      // "anthropic" here means "AiService has a real text backend":
      // Anthropic key, OpenRouter key, or explicit Claude CLI all qualify.
      anthropic: !!anthropicKey || !!openrouterKey || aiProvider === 'claude-cli',
      openai: !!this.configService.get<string>('contentStudio.openaiApiKey'),
      groq: !!this.configService.get<string>('groq.apiKey'),
    };
  }

  private kindFor(role: ProviderRole, configKey: string): ProviderKind {
    const configured = this.configService.get<string>(configKey) || 'auto';
    const kind = resolveProviderKind(configured, role, this.creds());
    this.logger.log(`content-studio provider role=${role} configured=${configured} resolved=${kind}`);
    return kind;
  }

  getStrategyProvider(): ContentStrategyProvider {
    return this.kindFor('strategy', 'contentStudio.strategyProvider') === 'anthropic'
      ? this.anthropicProvider
      : this.mockProvider;
  }

  getScriptProvider(): ScriptGenerationProvider {
    return this.kindFor('script', 'contentStudio.scriptProvider') === 'anthropic'
      ? this.anthropicProvider
      : this.mockProvider;
  }

  getReviewProvider(): ScriptReviewProvider {
    return this.kindFor('review', 'contentStudio.reviewProvider') === 'anthropic'
      ? this.anthropicProvider
      : this.mockProvider;
  }

  getComplianceProvider(): ComplianceProvider {
    return this.kindFor('compliance', 'contentStudio.complianceProvider') === 'anthropic'
      ? this.anthropicProvider
      : this.mockProvider;
  }

  getTranscriptionProvider(): TranscriptionProvider {
    const kind = this.kindFor('transcription', 'contentStudio.transcriptionProvider');
    if (kind === 'groq') return this.groqTranscription;
    if (kind === 'openai') return this.openaiTranscription;
    return this.mockProvider;
  }

  getRealtimeProvider(): RealtimeVoiceProvider {
    return this.kindFor('realtime', 'contentStudio.realtimeProvider') === 'openai'
      ? this.openaiRealtime
      : this.mockProvider;
  }

  /** Transcript-based video understanding (anthropic) or mock (spec 14.4). */
  getVideoUnderstandingProvider(): VideoUnderstandingProvider {
    return this.kindFor('video', 'contentStudio.videoProvider') === 'anthropic'
      ? this.anthropicProvider
      : this.mockProvider;
  }

  getContentDnaProvider(): ContentDnaProvider {
    return this.kindFor('video', 'contentStudio.videoProvider') === 'anthropic'
      ? this.anthropicProvider
      : this.mockProvider;
  }

  /** Reuses the "strategy" role's provider selection — same lightweight text-classification tier. */
  getDocumentClassificationProvider(): DocumentClassificationProvider {
    return this.kindFor('strategy', 'contentStudio.strategyProvider') === 'anthropic'
      ? this.anthropicProvider
      : this.mockProvider;
  }

  /** Reuses the "strategy" role's provider selection — same lightweight text-classification tier. */
  getBrandExtractionProvider(): BrandExtractionProvider {
    return this.kindFor('strategy', 'contentStudio.strategyProvider') === 'anthropic'
      ? this.anthropicProvider
      : this.mockProvider;
  }

  /**
   * Whether script/text generation would run on the mock provider (no real
   * AI key). Lets the UI warn the user that output is placeholder data.
   * Computed without logging to avoid noise on every page render.
   */
  isTextGenerationMock(): boolean {
    const configured =
      this.configService.get<string>('contentStudio.scriptProvider') || 'auto';
    return resolveProviderKind(configured, 'script', this.creds()) === 'mock';
  }
}
