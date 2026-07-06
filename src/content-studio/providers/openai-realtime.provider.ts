import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateRealtimeSessionInput,
  RealtimeSessionToken,
  RealtimeVoiceProvider,
} from './provider.interfaces';

interface RealtimeSessionResponse {
  client_secret?: { value: string; expires_at: number };
  model?: string;
}

/**
 * OpenAI Realtime adapter (spec §8) — server-generated ephemeral
 * credentials; the permanent API key never reaches the browser.
 * Plain fetch, no SDK dependency.
 */
@Injectable()
export class OpenAiRealtimeProvider implements RealtimeVoiceProvider {
  private readonly logger = new Logger(OpenAiRealtimeProvider.name);

  constructor(private readonly configService: ConfigService) {}

  isAvailable(): boolean {
    return !!this.configService.get<string>('contentStudio.openaiApiKey');
  }

  async createSessionToken(
    input: CreateRealtimeSessionInput,
  ): Promise<RealtimeSessionToken> {
    const apiKey = this.configService.get<string>('contentStudio.openaiApiKey');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not set — realtime voice unavailable');
    }
    const model =
      this.configService.get<string>('contentStudio.realtimeModel') ||
      'gpt-4o-realtime-preview';

    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        voice: input.voice || 'alloy',
        instructions: input.instructions,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(
        `realtime session creation failed status=${response.status}`,
        body.substring(0, 300),
      );
      throw new Error(`Realtime API error: ${response.status}`);
    }

    const data = (await response.json()) as RealtimeSessionResponse;
    if (!data.client_secret?.value) {
      throw new Error('Realtime API returned no client secret');
    }
    this.logger.log(`content-studio workflow=realtime-token provider=openai model=${model} ok`);
    return {
      token: data.client_secret.value,
      expiresAt: new Date(data.client_secret.expires_at * 1000).toISOString(),
      model: data.model || model,
      provider: 'openai',
    };
  }
}
