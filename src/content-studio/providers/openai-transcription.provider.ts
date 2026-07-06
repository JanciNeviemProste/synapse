import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFile } from 'fs/promises';
import {
  TranscriptionInput,
  TranscriptionProvider,
  TranscriptionResult,
} from './provider.interfaces';

interface WhisperVerboseResponse {
  text: string;
  language?: string;
  duration?: number;
  segments?: { start: number; end: number; text: string }[];
}

/**
 * OpenAI Whisper adapter (spec §8) — plain fetch, no SDK dependency.
 * Selected by the factory only when OPENAI_API_KEY is set.
 */
@Injectable()
export class OpenAiTranscriptionProvider implements TranscriptionProvider {
  private readonly logger = new Logger(OpenAiTranscriptionProvider.name);

  constructor(private readonly configService: ConfigService) {}

  isConfigured(): boolean {
    return !!this.configService.get<string>('contentStudio.openaiApiKey');
  }

  async transcribeAudio(input: TranscriptionInput): Promise<TranscriptionResult> {
    const apiKey = this.configService.get<string>('contentStudio.openaiApiKey');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not set — transcription unavailable');
    }
    const model =
      this.configService.get<string>('contentStudio.transcriptionModel') || 'whisper-1';

    const buffer =
      input.fileBuffer ?? (input.filePath ? await readFile(input.filePath) : null);
    if (!buffer) {
      throw new Error('No audio data provided for transcription');
    }

    const form = new FormData();
    const ext = input.mimeType.split('/')[1]?.split(';')[0] || 'webm';
    form.append('file', new Blob([new Uint8Array(buffer)], { type: input.mimeType }), `audio.${ext}`);
    form.append('model', model);
    form.append('response_format', 'verbose_json');
    if (input.language) form.append('language', input.language);

    const started = Date.now();
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(
        `whisper transcription failed status=${response.status}`,
        body.substring(0, 300),
      );
      throw new Error(`Transcription API error: ${response.status}`);
    }

    const data = (await response.json()) as WhisperVerboseResponse;
    this.logger.log(
      `content-studio workflow=transcription provider=openai model=${model} ok latencyMs=${Date.now() - started}`,
    );

    return {
      text: data.text,
      language: data.language,
      durationSeconds: data.duration ? Math.round(data.duration) : undefined,
      segments: data.segments?.map((s) => ({
        startMs: Math.round(s.start * 1000),
        endMs: Math.round(s.end * 1000),
        text: s.text.trim(),
      })),
    };
  }
}
