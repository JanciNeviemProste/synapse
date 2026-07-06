import { Injectable, NotFoundException } from '@nestjs/common';
import { ContentPillar } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ContentProviderFactory } from '../providers/provider.factory';
import { BrandProfileService } from './brand-profile.service';
import { KnowledgeService } from './knowledge.service';

export interface PillarInput {
  name: string;
  description?: string;
  priority?: number;
  targetFrequency?: string;
  complianceNotes?: string;
  isActive?: boolean;
  sortOrder?: number;
}

/** Content pillars (spec §14b). Suggestions come from AI; user approves. */
@Injectable()
export class PillarsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providerFactory: ContentProviderFactory,
    private readonly brandProfile: BrandProfileService,
    private readonly knowledge: KnowledgeService,
  ) {}

  async list(): Promise<ContentPillar[]> {
    return this.prisma.contentPillar.findMany({
      orderBy: [{ sortOrder: 'asc' }, { priority: 'desc' }],
    });
  }

  async create(input: PillarInput): Promise<ContentPillar> {
    return this.prisma.contentPillar.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        priority: input.priority ?? 0,
        targetFrequency: input.targetFrequency ?? null,
        complianceNotes: input.complianceNotes ?? null,
        sortOrder: input.sortOrder ?? 0,
      },
    });
  }

  async update(id: string, input: Partial<PillarInput>): Promise<ContentPillar> {
    const existing = await this.prisma.contentPillar.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Pillar not found');
    return this.prisma.contentPillar.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.priority !== undefined && { priority: input.priority }),
        ...(input.targetFrequency !== undefined && { targetFrequency: input.targetFrequency }),
        ...(input.complianceNotes !== undefined && { complianceNotes: input.complianceNotes }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
        ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.contentPillar.delete({ where: { id } });
  }

  /** AI suggestions — returned to UI for approval, NOT auto-saved (spec: user approves). */
  async suggest(): Promise<
    { name: string; description: string; priority: number; targetFrequency: string; complianceNotes: string }[]
  > {
    const [brand, existing, ideas] = await Promise.all([
      this.brandProfile.getContext(),
      this.list(),
      this.prisma.contentIdea.findMany({
        where: { status: { in: ['NEW', 'APPROVED'] } },
        take: 30,
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    const knowledgeCtx = await this.knowledge.retrieve(
      [brand?.industry, brand?.targetAudience].filter(Boolean).join(' ') || 'obsah',
    );
    const result = await this.providerFactory.getStrategyProvider().createContentPillars({
      brand,
      knowledge: knowledgeCtx,
      existingPillars: existing.map((p) => p.name),
      existingIdeas: ideas.map((i) => i.title),
    });
    return result.pillars;
  }
}
