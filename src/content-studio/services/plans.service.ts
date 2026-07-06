import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ContentItemStatus, ContentPlan, ContentPlanItem, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { canTransitionItem, ContentItemStatusValue } from '../domain/status';
import { ContentProviderFactory } from '../providers/provider.factory';
import { BrandProfileService } from './brand-profile.service';
import { KnowledgeService } from './knowledge.service';
import { PillarsService } from './pillars.service';

export interface GeneratePlanInput {
  startDate: string;
  endDate: string;
  postsPerWeek: number;
  goals: string[];
  preferredDays?: string[];
  preferredLengths?: string[];
  preferredStyles?: string[];
  campaignContext?: string;
}

/** Content plan generator (spec §15). */
@Injectable()
export class PlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providerFactory: ContentProviderFactory,
    private readonly brandProfile: BrandProfileService,
    private readonly knowledge: KnowledgeService,
    private readonly pillars: PillarsService,
  ) {}

  async generate(input: GeneratePlanInput): Promise<ContentPlan & { items: ContentPlanItem[] }> {
    const [brand, activePillars] = await Promise.all([
      this.brandProfile.getContext(),
      this.pillars.list().then((all) => all.filter((p) => p.isActive)),
    ]);
    const knowledgeCtx = await this.knowledge.retrieve(
      [brand?.industry, input.goals.join(' ')].filter(Boolean).join(' ') || 'obsah',
    );

    const generated = await this.providerFactory.getStrategyProvider().createContentPlan({
      brand,
      knowledge: knowledgeCtx,
      pillars: activePillars.map((p) => p.name),
      startDate: input.startDate,
      endDate: input.endDate,
      postsPerWeek: input.postsPerWeek,
      goals: input.goals,
      preferredDays: input.preferredDays,
      preferredLengths: input.preferredLengths,
      preferredStyles: input.preferredStyles,
      campaignContext: input.campaignContext,
    });

    return this.prisma.contentPlan.create({
      data: {
        name: generated.name,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        postsPerWeek: input.postsPerWeek,
        goals: input.goals as Prisma.InputJsonValue,
        status: 'DRAFT',
        generationContext: {
          notes: generated.notes,
          campaignContext: input.campaignContext ?? null,
        } as Prisma.InputJsonValue,
        items: {
          create: generated.items.map((item, i) => ({
            scheduledDate: new Date(item.scheduledDate),
            workingTitle: item.workingTitle,
            topic: item.topic || null,
            goal: item.goal || null,
            targetAudience: item.targetAudience || null,
            length: item.length || null,
            style: item.style || null,
            emotion: item.emotion || null,
            suggestedHook: item.suggestedHook || null,
            cta: item.cta || null,
            pillarId:
              activePillars.find(
                (p) => p.name.toLowerCase() === (item.pillar || '').toLowerCase(),
              )?.id ?? null,
            status: 'PLANNED',
            sortOrder: i,
          })),
        },
      },
      include: { items: { orderBy: { scheduledDate: 'asc' } } },
    });
  }

  async list(): Promise<(ContentPlan & { items: ContentPlanItem[] })[]> {
    return this.prisma.contentPlan.findMany({
      orderBy: { createdAt: 'desc' },
      include: { items: { orderBy: { scheduledDate: 'asc' } } },
    });
  }

  async get(id: string): Promise<ContentPlan & { items: ContentPlanItem[] }> {
    const plan = await this.prisma.contentPlan.findUnique({
      where: { id },
      include: { items: { orderBy: { scheduledDate: 'asc' } } },
    });
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  async setStatus(id: string, status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'): Promise<ContentPlan> {
    await this.get(id);
    return this.prisma.contentPlan.update({ where: { id }, data: { status } });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.contentPlan.delete({ where: { id } });
  }

  async updateItem(
    itemId: string,
    input: { scheduledDate?: string; workingTitle?: string; status?: ContentItemStatus },
  ): Promise<ContentPlanItem> {
    const item = await this.prisma.contentPlanItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Plan item not found');
    if (
      input.status &&
      !canTransitionItem(item.status as ContentItemStatusValue, input.status as ContentItemStatusValue)
    ) {
      throw new BadRequestException(
        `Neplatný prechod statusu ${item.status} → ${input.status}`,
      );
    }
    return this.prisma.contentPlanItem.update({
      where: { id: itemId },
      data: {
        ...(input.scheduledDate !== undefined && { scheduledDate: new Date(input.scheduledDate) }),
        ...(input.workingTitle !== undefined && { workingTitle: input.workingTitle }),
        ...(input.status !== undefined && { status: input.status }),
      },
    });
  }
}
