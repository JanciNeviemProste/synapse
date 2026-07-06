import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ContentDnaProfile, ContentDnaRule, DnaRuleStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ContentProviderFactory } from '../providers/provider.factory';

/**
 * Content DNA (spec 14.8): generated ONLY from approved analyses; every
 * rule requires explicit user approval before it can affect generation.
 * Never overwrites Brand DNA.
 */
@Injectable()
export class ContentDnaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providerFactory: ContentProviderFactory,
  ) {}

  async getLatestProfile(): Promise<(ContentDnaProfile & { rules: ContentDnaRule[] }) | null> {
    return this.prisma.contentDnaProfile.findFirst({
      orderBy: { version: 'desc' },
      include: { rules: { orderBy: { confidence: 'desc' } } },
    });
  }

  async generate(): Promise<ContentDnaProfile & { rules: ContentDnaRule[] }> {
    const approved = await this.prisma.contentVideoAnalysis.findMany({
      where: { status: 'APPROVED' },
      include: { videoAsset: { include: { metrics: true } } },
      orderBy: { approvedAt: 'desc' },
      take: 30,
    });
    if (approved.length === 0) {
      throw new BadRequestException(
        'Žiadne schválené analýzy — Content DNA sa generuje len zo schválených videí.',
      );
    }

    const dna = await this.providerFactory.getContentDnaProvider().generateContentDna(
      approved.map((a) => ({
        title: a.videoAsset.title,
        durationSeconds: a.videoAsset.durationSeconds ?? undefined,
        summary: a.summary,
        reusableInsights: a.reusableInsights,
        normalizedMetrics: a.performanceHypotheses,
      })),
    );

    const previous = await this.getLatestProfile();
    const profile = await this.prisma.contentDnaProfile.create({
      data: {
        version: (previous?.version ?? 0) + 1,
        status: 'draft',
        evidenceVideoCount: approved.length,
        dna: dna as unknown as Prisma.InputJsonValue,
        rules: {
          create: dna.rules.map((r) => ({
            category: r.category,
            rule: r.rule,
            evidence: { note: r.evidence } as Prisma.InputJsonValue,
            confidence: r.confidence,
          })),
        },
      },
      include: { rules: { orderBy: { confidence: 'desc' } } },
    });
    return profile;
  }

  async setRuleStatus(ruleId: string, status: DnaRuleStatus): Promise<ContentDnaRule> {
    const rule = await this.prisma.contentDnaRule.findUnique({ where: { id: ruleId } });
    if (!rule) throw new NotFoundException('Rule not found');
    return this.prisma.contentDnaRule.update({ where: { id: ruleId }, data: { status } });
  }

  async updateRule(ruleId: string, text: string): Promise<ContentDnaRule> {
    const rule = await this.prisma.contentDnaRule.findUnique({ where: { id: ruleId } });
    if (!rule) throw new NotFoundException('Rule not found');
    return this.prisma.contentDnaRule.update({
      where: { id: ruleId },
      data: { rule: text },
    });
  }

  async deleteRule(ruleId: string): Promise<void> {
    await this.prisma.contentDnaRule.delete({ where: { id: ruleId } });
  }

  /** Only APPROVED rules feed script generation (spec 14.9). */
  async getApprovedRuleStrings(limit = 15): Promise<string[]> {
    const rules = await this.prisma.contentDnaRule.findMany({
      where: { status: 'APPROVED' },
      orderBy: { confidence: 'desc' },
      take: limit,
    });
    return rules.map((r) => `${r.category}: ${r.rule} (confidence ${r.confidence})`);
  }
}
