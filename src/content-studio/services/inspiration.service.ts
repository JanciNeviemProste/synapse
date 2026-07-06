import { Injectable, NotFoundException } from '@nestjs/common';
import { InspirationSource, InspirationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ContentProviderFactory } from '../providers/provider.factory';

export interface InspirationInput {
  type: InspirationType;
  title: string;
  sourceUrl?: string;
  transcript?: string;
  userNotes?: string;
}

/**
 * Inspiration Library (spec §13) — manual entries only, no scraping.
 * AI extracts structural/stylistic patterns; wording is never copied.
 */
@Injectable()
export class InspirationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providerFactory: ContentProviderFactory,
  ) {}

  async list(): Promise<InspirationSource[]> {
    return this.prisma.inspirationSource.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async create(input: InspirationInput): Promise<InspirationSource> {
    return this.prisma.inspirationSource.create({
      data: {
        type: input.type,
        title: input.title,
        sourceUrl: input.sourceUrl ?? null,
        transcript: input.transcript ?? null,
        userNotes: input.userNotes ?? null,
      },
    });
  }

  async update(
    id: string,
    input: Partial<Omit<InspirationInput, 'type'>>,
  ): Promise<InspirationSource> {
    const existing = await this.prisma.inspirationSource.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Inspiration not found');
    return this.prisma.inspirationSource.update({
      where: { id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.sourceUrl !== undefined && { sourceUrl: input.sourceUrl }),
        ...(input.transcript !== undefined && { transcript: input.transcript }),
        ...(input.userNotes !== undefined && { userNotes: input.userNotes }),
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.inspirationSource.delete({ where: { id } });
  }

  async analyze(id: string): Promise<InspirationSource> {
    const source = await this.prisma.inspirationSource.findUnique({ where: { id } });
    if (!source) throw new NotFoundException('Inspiration not found');
    const patterns = await this.providerFactory.getStrategyProvider().analyzeInspiration({
      title: source.title,
      transcript: source.transcript ?? undefined,
      userNotes: source.userNotes ?? undefined,
    });
    return this.prisma.inspirationSource.update({
      where: { id },
      data: {
        extractedPatterns: patterns as unknown as Prisma.InputJsonValue,
        status: 'analyzed',
      },
    });
  }

  /** Approved pattern strings for script-generation prompts. */
  async getPatternStrings(limit = 10): Promise<string[]> {
    const sources = await this.prisma.inspirationSource.findMany({
      where: { status: 'analyzed' },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });
    const strings: string[] = [];
    for (const source of sources) {
      const extracted = source.extractedPatterns as { patterns?: { category: string; pattern: string }[] } | null;
      for (const p of extracted?.patterns ?? []) {
        strings.push(`${p.category}: ${p.pattern}`);
      }
    }
    return strings.slice(0, 20);
  }
}
