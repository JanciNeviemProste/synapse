import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, ReelScript, ReelScriptStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { canHandOff, canTransitionScript, ReelScriptStatusValue } from '../domain/status';
import { ContentDnaService } from '../intelligence/content-dna.service';
import { ContentProviderFactory } from '../providers/provider.factory';
import { GeneratedScriptVariant } from '../schemas/ai-output.schemas';
import { BrandProfileService } from './brand-profile.service';
import { InspirationService } from './inspiration.service';
import { KnowledgeService } from './knowledge.service';
import { TemplatesService } from './templates.service';

export interface GenerateScriptsInput {
  topic: string;
  rawIdea?: string;
  contentIdeaId?: string;
  contentPlanItemId?: string;
  templateId?: string;
  goal?: string;
  targetAudience?: string;
  length?: string;
  style?: string;
  emotion?: string;
  cta?: string;
}

/** Reel script generation — 3 variants with full §17 output (spec §16–17). */
@Injectable()
export class ScriptsService {
  private readonly logger = new Logger(ScriptsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providerFactory: ContentProviderFactory,
    private readonly brandProfile: BrandProfileService,
    private readonly knowledge: KnowledgeService,
    private readonly templates: TemplatesService,
    private readonly inspiration: InspirationService,
    private readonly contentDna: ContentDnaService,
  ) {}

  async generate(input: GenerateScriptsInput): Promise<ReelScript[]> {
    const [brand, knowledgeCtx, stylePrefs, inspirationPatterns, dnaRules] =
      await Promise.all([
        this.brandProfile.getContext(),
        this.knowledge.retrieve(input.topic),
        this.prisma.stylePreference.findMany({
          where: { status: 'ACTIVE' },
          orderBy: { confidence: 'desc' },
          take: 15,
        }),
        this.inspiration.getPatternStrings(),
        this.contentDna.getApprovedRuleStrings(),
      ]);

    const template = input.templateId
      ? await this.templates.get(input.templateId)
      : null;

    const generated = await this.providerFactory.getScriptProvider().generateScripts({
      topic: input.topic,
      rawIdea: input.rawIdea,
      goal: input.goal,
      targetAudience: input.targetAudience,
      length: input.length,
      style: input.style,
      emotion: input.emotion,
      cta: input.cta,
      template: template
        ? {
            name: template.name,
            structure: template.structure,
            hookPattern: template.hookPattern ?? undefined,
            bodyPattern: template.bodyPattern ?? undefined,
            ctaPattern: template.ctaPattern ?? undefined,
            complianceRules: template.complianceRules ?? undefined,
          }
        : undefined,
      brand,
      knowledge: knowledgeCtx,
      stylePreferences: [
        ...stylePrefs.map((p) => `${p.preferenceType}: ${p.preferenceValue}`),
        ...dnaRules,
      ],
      inspirationPatterns,
    });

    const scripts = await Promise.all(
      generated.variants.map((variant) => this.persistVariant(variant, input)),
    );

    if (input.contentIdeaId) {
      await this.prisma.contentIdea
        .update({ where: { id: input.contentIdeaId }, data: { status: 'CONVERTED' } })
        .catch(() => {});
    }
    if (input.contentPlanItemId) {
      await this.prisma.contentPlanItem
        .update({ where: { id: input.contentPlanItemId }, data: { status: 'SCRIPT_DRAFT' } })
        .catch(() => {});
    }

    this.logger.log(`generated ${scripts.length} script variants for "${input.topic}"`);
    return scripts;
  }

  private persistVariant(
    variant: GeneratedScriptVariant,
    input: GenerateScriptsInput,
  ): Promise<ReelScript> {
    return this.prisma.reelScript.create({
      data: {
        contentIdeaId: input.contentIdeaId ?? null,
        contentPlanItemId: input.contentPlanItemId ?? null,
        versionName: variant.versionName,
        strategy: variant.strategy as unknown as Prisma.InputJsonValue,
        hook: variant.hook,
        setup: variant.setup || null,
        mainMessage: variant.mainMessage,
        keyInsight: variant.keyInsight || null,
        cta: variant.cta,
        spokenScript: variant.spokenScript,
        productionPlan: variant.productionPlan as unknown as Prisma.InputJsonValue,
        instagramAssets: variant.instagramAssets as unknown as Prisma.InputJsonValue,
        safety: variant.safety as unknown as Prisma.InputJsonValue,
        status: 'GENERATED',
      },
    });
  }

  async list(status?: ReelScriptStatus): Promise<ReelScript[]> {
    return this.prisma.reelScript.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async get(id: string): Promise<ReelScript> {
    const script = await this.prisma.reelScript.findUnique({ where: { id } });
    if (!script) throw new NotFoundException('Script not found');
    return script;
  }

  /** Sibling variants generated in the same batch (same idea/plan item, ±2 min). */
  async getWithSiblings(id: string): Promise<{ script: ReelScript; siblings: ReelScript[] }> {
    const script = await this.get(id);
    const windowMs = 2 * 60 * 1000;
    const siblings = await this.prisma.reelScript.findMany({
      where: {
        id: { not: script.id },
        contentIdeaId: script.contentIdeaId,
        contentPlanItemId: script.contentPlanItemId,
        createdAt: {
          gte: new Date(script.createdAt.getTime() - windowMs),
          lte: new Date(script.createdAt.getTime() + windowMs),
        },
      },
      orderBy: { versionName: 'asc' },
    });
    return { script, siblings };
  }

  async review(id: string): Promise<ReelScript> {
    const script = await this.get(id);
    const brand = await this.brandProfile.getContext();
    const review = await this.providerFactory.getReviewProvider().reviewScript({
      spokenScript: script.spokenScript || '',
      hook: script.hook || '',
      cta: script.cta || '',
      goal: (script.strategy as { goal?: string } | null)?.goal,
      brand,
    });
    return this.prisma.reelScript.update({
      where: { id },
      data: {
        reviewerScores: review.scores as unknown as Prisma.InputJsonValue,
        reviewerFeedback: {
          strengths: review.strengths,
          weaknesses: review.weaknesses,
          suggestedImprovements: review.suggestedImprovements,
          confusingSentences: review.confusingSentences,
          genericLanguage: review.genericLanguage,
          unsupportedClaims: review.unsupportedClaims,
          complianceWarnings: review.complianceWarnings,
          improvedHook: review.improvedHook,
          improvedCta: review.improvedCta,
        } as unknown as Prisma.InputJsonValue,
        status: script.status === 'GENERATED' ? 'UNDER_REVIEW' : script.status,
      },
    });
  }

  async complianceCheck(id: string): Promise<ReelScript> {
    const script = await this.get(id);
    const brand = await this.brandProfile.getContext();
    const result = await this.providerFactory.getComplianceProvider().checkContent({
      content: [script.hook, script.spokenScript, script.cta].filter(Boolean).join('\n'),
      contentCategory: (script.strategy as { contentPillar?: string } | null)?.contentPillar,
      complianceNotes: brand?.complianceNotes,
    });
    const safety = (script.safety as Record<string, unknown> | null) ?? {};
    return this.prisma.reelScript.update({
      where: { id },
      data: {
        safety: { ...safety, complianceCheck: result } as unknown as Prisma.InputJsonValue,
      },
    });
  }

  /** Server-side status transition enforcement (spec §22). */
  async setStatus(id: string, status: ReelScriptStatus): Promise<ReelScript> {
    const script = await this.get(id);
    if (
      !canTransitionScript(
        script.status as ReelScriptStatusValue,
        status as ReelScriptStatusValue,
      )
    ) {
      throw new BadRequestException(
        `Neplatný prechod statusu ${script.status} → ${status}`,
      );
    }
    return this.prisma.reelScript.update({
      where: { id },
      data: {
        status,
        ...(status === 'APPROVED' && { approvedAt: new Date() }),
        ...(status === 'APPROVED' && { isSelected: true }),
      },
    });
  }

  async updateContent(
    id: string,
    input: Partial<Pick<ReelScript, 'hook' | 'setup' | 'mainMessage' | 'keyInsight' | 'cta' | 'spokenScript'>>,
  ): Promise<ReelScript> {
    const script = await this.get(id);
    const editable: ReelScriptStatusValue[] = ['GENERATED', 'UNDER_REVIEW', 'EDITED', 'REJECTED', 'APPROVED'];
    if (!editable.includes(script.status as ReelScriptStatusValue)) {
      throw new BadRequestException(`Skript v statuse ${script.status} sa nedá upravovať.`);
    }
    return this.prisma.reelScript.update({
      where: { id },
      data: {
        ...(input.hook !== undefined && { hook: input.hook }),
        ...(input.setup !== undefined && { setup: input.setup }),
        ...(input.mainMessage !== undefined && { mainMessage: input.mainMessage }),
        ...(input.keyInsight !== undefined && { keyInsight: input.keyInsight }),
        ...(input.cta !== undefined && { cta: input.cta }),
        ...(input.spokenScript !== undefined && { spokenScript: input.spokenScript }),
        status: script.status === 'APPROVED' ? 'EDITED' : script.status === 'GENERATED' ? 'EDITED' : script.status,
      },
    });
  }

  /** Video Studio handoff payload (spec §27) — approved scripts only. */
  async buildHandoff(id: string): Promise<Record<string, unknown>> {
    const script = await this.get(id);
    if (!canHandOff(script.status as ReelScriptStatusValue)) {
      throw new BadRequestException(
        'Do Video Studia sa dá poslať len schválený skript (spec §22/§27).',
      );
    }
    const strategy = (script.strategy as Record<string, unknown> | null) ?? {};
    return {
      scriptId: script.id,
      title: strategy['workingTitle'] ?? null,
      approvedSpokenScript: script.spokenScript,
      cta: script.cta,
      emotion: strategy['recommendedEmotion'] ?? null,
      estimatedDurationSeconds:
        (script.productionPlan as { estimatedDurationSeconds?: number } | null)
          ?.estimatedDurationSeconds ?? null,
      productionPlan: script.productionPlan,
      instagramAssets: script.instagramAssets,
      safety: script.safety,
      approvedAt: script.approvedAt,
    };
  }

  async delete(id: string): Promise<void> {
    await this.prisma.reelScript.delete({ where: { id } });
  }
}
