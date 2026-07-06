import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Prisma, ContentJob } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export type JobHandler = (payload: unknown, job: ContentJob) => Promise<unknown>;

/**
 * Minimal replaceable background-job abstraction (spec 14.2, ADR 2026-07-06).
 * DB-backed queue (ContentJob) + interval worker. One job at a time —
 * enough for a single-tenant instance; swap for a real queue if it grows.
 */
@Injectable()
export class ContentJobsService implements OnModuleDestroy {
  private readonly logger = new Logger(ContentJobsService.name);
  private readonly handlers = new Map<string, JobHandler>();
  private running = false;
  private stopped = false;

  constructor(private readonly prisma: PrismaService) {}

  registerHandler(type: string, handler: JobHandler): void {
    this.handlers.set(type, handler);
  }

  async enqueue(type: string, payload: unknown, maxAttempts = 3): Promise<ContentJob> {
    return this.prisma.contentJob.create({
      data: {
        type,
        payload: payload as Prisma.InputJsonValue,
        maxAttempts,
      },
    });
  }

  async getJob(id: string): Promise<ContentJob | null> {
    return this.prisma.contentJob.findUnique({ where: { id } });
  }

  onModuleDestroy(): void {
    this.stopped = true;
  }

  @Interval(5000)
  async tick(): Promise<void> {
    if (this.running || this.stopped || this.handlers.size === 0) return;
    this.running = true;
    try {
      await this.processNext();
    } catch (error) {
      this.logger.error('job worker tick failed', (error as Error).message);
    } finally {
      this.running = false;
    }
  }

  private async processNext(): Promise<void> {
    const job = await this.prisma.contentJob.findFirst({
      where: {
        status: 'QUEUED',
        scheduledAt: { lte: new Date() },
        type: { in: [...this.handlers.keys()] },
      },
      orderBy: { scheduledAt: 'asc' },
    });
    if (!job) return;

    const claimed = await this.prisma.contentJob.updateMany({
      where: { id: job.id, status: 'QUEUED' },
      data: { status: 'RUNNING', startedAt: new Date(), attempts: { increment: 1 } },
    });
    if (claimed.count === 0) return;

    const handler = this.handlers.get(job.type);
    if (!handler) return;

    const started = Date.now();
    try {
      const result = await handler(job.payload, job);
      await this.prisma.contentJob.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          finishedAt: new Date(),
          result: (result ?? Prisma.JsonNull) as Prisma.InputJsonValue,
          lastError: null,
        },
      });
      this.logger.log(
        `job ${job.type}#${job.id} completed in ${Date.now() - started}ms`,
      );
    } catch (error) {
      const attempts = job.attempts + 1;
      const willRetry = attempts < job.maxAttempts;
      await this.prisma.contentJob.update({
        where: { id: job.id },
        data: {
          status: willRetry ? 'QUEUED' : 'FAILED',
          lastError: (error as Error).message?.substring(0, 2000) || 'unknown error',
          finishedAt: willRetry ? null : new Date(),
          // exponential-ish backoff: 30s * attempts
          scheduledAt: willRetry
            ? new Date(Date.now() + 30_000 * attempts)
            : undefined,
        },
      });
      this.logger.warn(
        `job ${job.type}#${job.id} failed (attempt ${attempts}/${job.maxAttempts}, retry=${willRetry}): ${(error as Error).message}`,
      );
    }
  }
}
