import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ContentIdea, ContentSession, ContentSessionType, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ContentProviderFactory } from '../providers/provider.factory';
import { ContentStorageService } from '../storage/content-storage.service';
import { BrandProfileService } from './brand-profile.service';
import { KnowledgeService } from './knowledge.service';

export interface VoiceUploadInput {
  buffer: Buffer;
  mimeType: string;
  sizeBytes: number;
  saveAudio: boolean;
  sessionType: Extract<ContentSessionType, 'QUICK_VOICE_NOTE' | 'AUDIO_UPLOAD'>;
  title?: string;
}

/**
 * Voice notes + audio upload (spec §7.2/§7.3).
 * Privacy (spec §26): audio is transcribed from memory and stored ONLY
 * when the user explicitly opted in (saveAudio).
 */
@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providerFactory: ContentProviderFactory,
    private readonly storage: ContentStorageService,
    private readonly brandProfile: BrandProfileService,
    private readonly knowledge: KnowledgeService,
  ) {}

  async processUpload(
    input: VoiceUploadInput,
  ): Promise<{ session: ContentSession; ideas: ContentIdea[] }> {
    const validationError = this.storage.validate('audio', input.mimeType, input.sizeBytes);
    if (validationError) {
      throw new Error(validationError);
    }

    let audioStoragePath: string | null = null;
    if (input.saveAudio) {
      const stored = await this.storage.save('audio', input.mimeType, input.buffer);
      audioStoragePath = stored.storagePath;
    }

    const session = await this.prisma.contentSession.create({
      data: {
        type: input.sessionType,
        title: input.title || `Hlasová poznámka ${new Date().toLocaleString('sk-SK')}`,
        status: 'PROCESSING',
        saveAudio: input.saveAudio,
        audioStoragePath,
      },
    });

    try {
      const transcription = await this.providerFactory
        .getTranscriptionProvider()
        .transcribeAudio({
          fileBuffer: input.buffer,
          filePath: audioStoragePath ?? undefined,
          mimeType: input.mimeType,
          language: 'sk',
        });

      const [brand, knowledgeCtx] = await Promise.all([
        this.brandProfile.getContext(),
        this.knowledge.retrieve(transcription.text),
      ]);

      const extracted = await this.providerFactory.getStrategyProvider().extractIdeas({
        rawText: transcription.text,
        sourceType: input.sessionType.toLowerCase(),
        brand,
        knowledge: knowledgeCtx,
      });

      const ideas = await Promise.all(
        extracted.ideas.map((idea) =>
          this.prisma.contentIdea.create({
            data: {
              sessionId: session.id,
              title: idea.title,
              description: idea.description || null,
              keyMessage: idea.keyMessage || null,
              suggestedGoal: idea.suggestedGoal || null,
              sourceType: input.sessionType.toLowerCase(),
            },
          }),
        ),
      );

      const updatedSession = await this.prisma.contentSession.update({
        where: { id: session.id },
        data: {
          status: 'COMPLETED',
          transcript: transcription.text,
          summary: extracted.mainTopic || null,
          durationSeconds: transcription.durationSeconds ?? null,
          extractedData: extracted as unknown as Prisma.InputJsonValue,
        },
      });

      return { session: updatedSession, ideas };
    } catch (error) {
      await this.prisma.contentSession.update({
        where: { id: session.id },
        data: {
          status: 'FAILED',
          errorMessage: (error as Error).message?.substring(0, 2000),
        },
      });
      this.logger.error('voice processing failed', (error as Error).message);
      throw error;
    }
  }

  async getSession(id: string): Promise<ContentSession> {
    const session = await this.prisma.contentSession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  /** Delete stored audio only (spec §26 — granular deletion). */
  async deleteAudio(id: string): Promise<ContentSession> {
    const session = await this.getSession(id);
    if (session.audioStoragePath) {
      await this.storage.delete(session.audioStoragePath);
    }
    return this.prisma.contentSession.update({
      where: { id },
      data: { audioStoragePath: null, saveAudio: false },
    });
  }

  /** Delete the whole session incl. audio and transcript (spec §26). */
  async deleteSession(id: string): Promise<void> {
    const session = await this.getSession(id);
    if (session.audioStoragePath) {
      await this.storage.delete(session.audioStoragePath);
    }
    await this.prisma.contentSession.delete({ where: { id } });
  }
}
