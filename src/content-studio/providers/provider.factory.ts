import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AnthropicContentProvider } from './anthropic.provider';
import { MockContentProvider } from './mock.provider';
import { OpenAiRealtimeProvider } from './openai-realtime.provider';
import { OpenAiTranscriptionProvider } from './openai-transcription.provider';
import {
  ComplianceProvider,
  ContentStrategyProvider,
  RealtimeVoiceProvider,
  ScriptGenerationProvider,
  ScriptReviewProvider,
  TranscriptionProvider,
} from './provider.interfaces';

export type ProviderKind = 'anthropic' | 'openai' | 'mock';
export type ProviderRole =
  | 'strategy'
  | 'script'
  | 'review'
  | 'compliance'
  | 'transcription'
  | 'realtime';

/**
 * Resolve which provider implementation to use for a role.
 * 'auto' picks a real provider when credentials exist, otherwise mock —
 * so the module always works without paid keys (spec principle 18).
 */
export function resolveProviderKind(
  configured: string,
  role: ProviderRole,
  creds: { anthropic: boolean; openai: boolean },
): ProviderKind {
  const normalized = (configured || 'auto').toLowerCase();
  if (normalized === 'mock') return 'mock';
  if (normalized === 'anthropic') return creds.anthropic ? 'anthropic' : 'mock';
  if (normalized === 'openai') return creds.openai ? 'openai' : 'mock';

  // auto
  if (role === 'transcription' || role === 'realtime') {
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
  ) {}

  private creds(): { anthropic: boolean; openai: boolean } {
    const anthropicKey =
      this.configService.get<string>('anthropic.apiKey') || '';
    const aiProvider = this.configService.get<string>('anthropic.provider') || 'auto';
    return {
      // Claude CLI counts as anthropic credentials — AiService handles the fallback.
      anthropic: !!anthropicKey || aiProvider === 'claude-cli',
      openai: !!this.configService.get<string>('contentStudio.openaiApiKey'),
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
    return this.kindFor('transcription', 'contentStudio.transcriptionProvider') === 'openai'
      ? this.openaiTranscription
      : this.mockProvider;
  }

  getRealtimeProvider(): RealtimeVoiceProvider {
    return this.kindFor('realtime', 'contentStudio.realtimeProvider') === 'openai'
      ? this.openaiRealtime
      : this.mockProvider;
  }
}
