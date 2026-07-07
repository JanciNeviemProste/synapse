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
 * Groq Whisper adapter — OpenAI-compatible audio transcription endpoint,
 * free/cheap tier. Plain fetch, no SDK. Selected by the factory when
 * GROQ_API_KEY is set (OpenRouter cannot do audio).
 */
@Injectable()
export class GroqTranscriptionProvider implements TranscriptionProvider {
  private readonly logger = new Logger(GroqTranscriptionProvider.name);

  constructor(private readonly configService: ConfigService) {}

  isConfigured(): boolean {
    return !!this.configService.get<string>('groq.apiKey');
  }

  async transcribeAudio(input: TranscriptionInput): Promise<TranscriptionResult> {
    const apiKey = this.configService.get<string>('groq.apiKey');
    if (!apiKey) {
      throw new Error('GROQ_API_KEY not set — transcription unavailable');
    }
    const model =
      this.configService.get<string>('groq.transcriptionModel') ||
      'whisper-large-v3-turbo';

    const buffer =
      input.fileBuffer ?? (input.filePath ? await readFile(input.filePath) : null);
    if (!buffer) {
      throw new Error('No audio data provided for transcription');
    }

    const form = new FormData();
    const ext = input.mimeType.split('/')[1]?.split(';')[0] || 'webm';
    form.append(
      'file',
      new Blob([new Uint8Array(buffer)], { type: input.mimeType }),
      `audio.${ext}`,
    );
    form.append('model', model);
    form.append('response_format', 'verbose_json');
    if (input.language) form.append('language', input.language);

    const started = Date.now();
    const response = await fetch(
      'https://api.groq.com/openai/v1/audio/transcriptions',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      },
    );

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(
        `groq transcription failed status=${response.status}`,
        body.substring(0, 300),
      );
      throw new Error(`Transcription API error: ${response.status}`);
    }

    const data = (await response.json()) as WhisperVerboseResponse;
    this.logger.log(
      `content-studio workflow=transcription provider=groq model=${model} ok latencyMs=${Date.now() - started}`,
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
