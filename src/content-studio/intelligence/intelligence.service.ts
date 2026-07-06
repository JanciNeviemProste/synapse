import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import {
  ContentVideoAnalysis,
  ContentVideoAsset,
  Prisma,
  VideoAnalysisStatus,
} from '@prisma/client';
import { readFile } from 'fs/promises';
import { PrismaService } from '../../database/prisma.service';
import { ContentJobsService } from '../jobs/content-jobs.service';
import { ContentProviderFactory } from '../providers/provider.factory';
import { ContentStorageService } from '../storage/content-storage.service';
import { evidenceLevel, normalizeMetrics, RawMetrics } from './metrics';
import { MediaService } from './media.service';

const JOB_TYPE = 'video-analysis';

/**
 * Content Intelligence V1 (spec §14): upload → async pipeline → review.
 * Expensive work runs in the background job worker, never in a request.
 */
@Injectable()
export class IntelligenceService implements OnModuleInit {
  private readonly logger = new Logger(IntelligenceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: ContentJobsService,
    private readonly storage: ContentStorageService,
    private readonly media: MediaService,
    private readonly providerFactory: ContentProviderFactory,
  ) {}

  onModuleInit(): void {
    this.jobs.registerHandler(JOB_TYPE, (payload) =>
      this.runAnalysis((payload as { analysisId: string }).analysisId),
    );
  }

  // ---- Upload & lifecycle ----

  async upload(input: {
    buffer: Buffer;
    mimeType: string;
    title: string;
    sourceUrl?: string;
  }): Promise<ContentVideoAsset> {
    const stored = await this.storage.save('video', input.mimeType, input.buffer);
    const asset = await this.prisma.contentVideoAsset.create({
      data: {
        title: input.title,
        sourceUrl: input.sourceUrl ?? null,
        storagePath: stored.storagePath,
        mimeType: input.mimeType,
        fileSizeBytes: stored.sizeBytes,
        status: 'UPLOADED',
      },
    });

    // metadata + thumbnail are cheap enough to do inline
    const meta = await this.media.probe(this.storage.absolutePath(stored.storagePath));
    const thumbRel = stored.storagePath.replace(/^video[\\/]/, 'thumbnails/').replace(/\.\w+$/, '.jpg');
    const hasThumb = await this.media
      .extractThumbnail(
        this.storage.absolutePath(stored.storagePath),
        this.storage.absolutePath(thumbRel),
      )
      .catch(() => false);

    return this.prisma.contentVideoAsset.update({
      where: { id: asset.id },
      data: {
        durationSeconds: meta.durationSeconds ?? null,
        width: meta.width ?? null,
        height: meta.height ?? null,
        thumbnailPath: hasThumb ? thumbRel : null,
      },
    });
  }

  async startAnalysis(assetId: string): Promise<ContentVideoAnalysis> {
    const asset = await this.getAsset(assetId);
    const analysis = await this.prisma.contentVideoAnalysis.create({
      data: { videoAssetId: asset.id, status: 'QUEUED' },
    });
    await this.prisma.contentVideoAsset.update({
      where: { id: asset.id },
      data: { status: 'QUEUED' },
    });
    await this.jobs.enqueue(JOB_TYPE, { analysisId: analysis.id });
    return analysis;
  }

  // ---- Async pipeline (job handler, spec 14.2) ----

  private async setStatus(
    analysisId: string,
    assetId: string,
    status: VideoAnalysisStatus,
  ): Promise<void> {
    await this.prisma.contentVideoAnalysis.update({
      where: { id: analysisId },
      data: { status },
    });
    await this.prisma.contentVideoAsset.update({
      where: { id: assetId },
      data: { status },
    });
  }

  private async runAnalysis(analysisId: string): Promise<{ status: string }> {
    const analysis = await this.prisma.contentVideoAnalysis.findUnique({
      where: { id: analysisId },
      include: { videoAsset: true },
    });
    if (!analysis) throw new Error(`analysis ${analysisId} not found`);
    const asset = analysis.videoAsset;

    try {
      // 1. preprocessing — audio extraction (best effort)
      await this.setStatus(analysisId, asset.id, 'PREPROCESSING');
      const videoAbs = this.storage.absolutePath(asset.storagePath);
      const audioRel = asset.storagePath.replace(/^video[\\/]/, 'audio/').replace(/\.\w+$/, '.mp3');
      const audioAbs = this.storage.absolutePath(audioRel);
      const hasAudio = await this.media.extractAudio(videoAbs, audioAbs);

      // 2. transcription (timestamped)
      await this.setStatus(analysisId, asset.id, 'TRANSCRIBING');
      const transcription = await this.providerFactory.getTranscriptionProvider().transcribeAudio({
        fileBuffer: hasAudio ? await readFile(audioAbs) : undefined,
        filePath: hasAudio ? audioRel : asset.storagePath,
        mimeType: hasAudio ? 'audio/mpeg' : asset.mimeType,
        language: 'sk',
      });

      // temporary audio is not retained (spec 14.12)
      if (hasAudio) await this.storage.delete(audioRel).catch(() => {});

      // 3. content + timeline + creative analysis
      await this.setStatus(analysisId, asset.id, 'ANALYZING_CONTENT');
      const result = await this.providerFactory.getVideoUnderstandingProvider().analyzeVideo({
        title: asset.title,
        durationSeconds: asset.durationSeconds ?? transcription.durationSeconds,
        width: asset.width ?? undefined,
        height: asset.height ?? undefined,
        transcript: transcription.text,
        transcriptSegments: transcription.segments,
      });

      // 4. performance hypotheses from manual metrics (if any)
      await this.setStatus(analysisId, asset.id, 'GENERATING_INSIGHTS');
      const metric = await this.prisma.contentVideoMetric.findFirst({
        where: { videoAssetId: asset.id },
        orderBy: { recordedAt: 'desc' },
      });
      const raw: RawMetrics = metric ?? {};
      const level = evidenceLevel(raw);
      const normalized = normalizeMetrics(raw);

      await this.prisma.contentVideoSegment.deleteMany({ where: { analysisId } });
      await this.prisma.contentVideoSegment.createMany({
        data: result.segments.map((s, i) => ({
          analysisId,
          startMs: s.startMs,
          endMs: s.endMs,
          transcriptText: s.transcriptText,
          visualDescription: s.visualDescription,
          onScreenText: s.onScreenText,
          editingEvents: { event: s.editingEvent } as Prisma.InputJsonValue,
          delivery: { style: s.deliveryStyle } as Prisma.InputJsonValue,
          purpose: s.purpose,
          attentionMechanism: s.attentionMechanism,
          confidence: s.confidence,
          sortOrder: i,
        })),
      });

      await this.prisma.contentVideoAnalysis.update({
        where: { id: analysisId },
        data: {
          language: result.language,
          transcript: transcription.text,
          summary: result.summary as unknown as Prisma.InputJsonValue,
          creativeAnalysis: result.creativeAnalysis as unknown as Prisma.InputJsonValue,
          reusableInsights: result.reusableInsights as unknown as Prisma.InputJsonValue,
          aiScores: result.aiScores as unknown as Prisma.InputJsonValue,
          performanceHypotheses: {
            evidenceLevel: level,
            normalizedMetrics: normalized,
            note:
              level === 'none'
                ? 'Bez metrík — len kreatívna analýza.'
                : 'Hypotézy, nie dokázaná kauzalita.',
          } as unknown as Prisma.InputJsonValue,
          evidenceLevel: level,
        },
      });

      await this.setStatus(analysisId, asset.id, 'READY_FOR_REVIEW');
      this.logger.log(`video analysis ${analysisId} ready for review`);
      return { status: 'READY_FOR_REVIEW' };
    } catch (error) {
      await this.prisma.contentVideoAnalysis.update({
        where: { id: analysisId },
        data: {
          status: 'FAILED',
          errorMessage: (error as Error).message?.substring(0, 2000),
        },
      });
      await this.prisma.contentVideoAsset.update({
        where: { id: asset.id },
        data: { status: 'FAILED' },
      });
      throw error;
    }
  }

  // ---- Review & data access ----

  async listAssets(): Promise<ContentVideoAsset[]> {
    return this.prisma.contentVideoAsset.findMany({
      orderBy: { createdAt: 'desc' },
      include: { metrics: true } as never,
    });
  }

  async getAsset(id: string): Promise<ContentVideoAsset> {
    const asset = await this.prisma.contentVideoAsset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException('Video not found');
    return asset;
  }

  async getDetail(assetId: string) {
    const asset = await this.prisma.contentVideoAsset.findUnique({
      where: { id: assetId },
      include: {
        metrics: { orderBy: { recordedAt: 'desc' } },
        analyses: {
          orderBy: { createdAt: 'desc' },
          include: { segments: { orderBy: { sortOrder: 'asc' } } },
        },
      },
    });
    if (!asset) throw new NotFoundException('Video not found');
    return asset;
  }

  async correctTranscript(analysisId: string, transcript: string): Promise<void> {
    await this.prisma.contentVideoAnalysis.update({
      where: { id: analysisId },
      data: { transcript },
    });
  }

  async approve(analysisId: string): Promise<ContentVideoAnalysis> {
    const analysis = await this.prisma.contentVideoAnalysis.findUnique({
      where: { id: analysisId },
    });
    if (!analysis) throw new NotFoundException('Analysis not found');
    const updated = await this.prisma.contentVideoAnalysis.update({
      where: { id: analysisId },
      data: { status: 'APPROVED', approvedAt: new Date() },
    });
    await this.prisma.contentVideoAsset.update({
      where: { id: analysis.videoAssetId },
      data: { status: 'APPROVED' },
    });
    return updated;
  }

  async saveMetrics(assetId: string, raw: RawMetrics & { publishedAt?: string }) {
    await this.getAsset(assetId);
    const metric = await this.prisma.contentVideoMetric.create({
      data: {
        videoAssetId: assetId,
        publishedAt: raw.publishedAt ? new Date(raw.publishedAt) : null,
        followerCountAtPublish: raw.followerCountAtPublish ?? null,
        views: raw.views ?? null,
        reach: raw.reach ?? null,
        likes: raw.likes ?? null,
        comments: raw.comments ?? null,
        shares: raw.shares ?? null,
        saves: raw.saves ?? null,
        averageWatchTimeSeconds: raw.averageWatchTimeSeconds ?? null,
        completionRate: raw.completionRate ?? null,
      },
    });
    return { metric, evidenceLevel: evidenceLevel(raw), normalized: normalizeMetrics(raw) };
  }

  /** Delete source video + ALL derived data (spec 14.1 point about deletion). */
  async deleteAsset(assetId: string): Promise<void> {
    const asset = await this.getAsset(assetId);
    await this.storage.delete(asset.storagePath).catch(() => {});
    if (asset.thumbnailPath) {
      await this.storage.delete(asset.thumbnailPath).catch(() => {});
    }
    await this.prisma.contentVideoAsset.delete({ where: { id: assetId } });
    this.logger.log(`deleted video asset ${assetId} incl. derived analyses`);
  }

  async getThumbnail(assetId: string): Promise<{ buffer: Buffer; mime: string } | null> {
    const asset = await this.getAsset(assetId);
    if (!asset.thumbnailPath) return null;
    try {
      return { buffer: await this.storage.read(asset.thumbnailPath), mime: 'image/jpeg' };
    } catch {
      return null;
    }
  }

  async getVideoStream(assetId: string): Promise<{ buffer: Buffer; mime: string }> {
    const asset = await this.getAsset(assetId);
    return { buffer: await this.storage.read(asset.storagePath), mime: asset.mimeType };
  }
}
