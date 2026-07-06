import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, ScriptTemplate } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { SYSTEM_TEMPLATES } from '../data/system-templates';

export interface TemplateInput {
  name: string;
  description?: string;
  structure?: unknown;
  recommendedGoal?: string;
  recommendedLength?: string;
  recommendedStyle?: string;
  recommendedEmotion?: string;
  hookPattern?: string;
  bodyPattern?: string;
  ctaPattern?: string;
  complianceRules?: string;
}

/** Script templates (spec §12). System templates immutable but duplicable. */
@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);
  private seeded = false;

  constructor(private readonly prisma: PrismaService) {}

  /** Idempotent seed of the 14 built-in Slovak templates. */
  async ensureSystemTemplates(): Promise<void> {
    if (this.seeded) return;
    const count = await this.prisma.scriptTemplate.count({
      where: { isSystemTemplate: true },
    });
    if (count === 0) {
      await this.prisma.scriptTemplate.createMany({
        data: SYSTEM_TEMPLATES.map((t) => ({
          name: t.name,
          description: t.description,
          structure: t.structure as unknown as Prisma.InputJsonValue,
          recommendedGoal: t.recommendedGoal,
          recommendedLength: t.recommendedLength,
          recommendedStyle: t.recommendedStyle,
          recommendedEmotion: t.recommendedEmotion,
          hookPattern: t.hookPattern,
          bodyPattern: t.bodyPattern,
          ctaPattern: t.ctaPattern,
          complianceRules: t.complianceRules ?? null,
          isSystemTemplate: true,
        })),
      });
      this.logger.log(`seeded ${SYSTEM_TEMPLATES.length} system templates`);
    }
    this.seeded = true;
  }

  async list(includeArchived = false): Promise<ScriptTemplate[]> {
    await this.ensureSystemTemplates();
    return this.prisma.scriptTemplate.findMany({
      where: includeArchived ? undefined : { isArchived: false },
      orderBy: [{ isFavorite: 'desc' }, { isSystemTemplate: 'desc' }, { name: 'asc' }],
    });
  }

  async get(id: string): Promise<ScriptTemplate> {
    const template = await this.prisma.scriptTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  async create(input: TemplateInput): Promise<ScriptTemplate> {
    return this.prisma.scriptTemplate.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        structure: (input.structure ?? { sections: [] }) as Prisma.InputJsonValue,
        recommendedGoal: input.recommendedGoal ?? null,
        recommendedLength: input.recommendedLength ?? null,
        recommendedStyle: input.recommendedStyle ?? null,
        recommendedEmotion: input.recommendedEmotion ?? null,
        hookPattern: input.hookPattern ?? null,
        bodyPattern: input.bodyPattern ?? null,
        ctaPattern: input.ctaPattern ?? null,
        complianceRules: input.complianceRules ?? null,
      },
    });
  }

  async update(id: string, input: Partial<TemplateInput>): Promise<ScriptTemplate> {
    const template = await this.get(id);
    if (template.isSystemTemplate) {
      throw new ForbiddenException(
        'Systémová šablóna sa nedá upraviť — vytvor si jej kópiu (duplicate).',
      );
    }
    return this.prisma.scriptTemplate.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.structure !== undefined && {
          structure: input.structure as Prisma.InputJsonValue,
        }),
        ...(input.recommendedGoal !== undefined && { recommendedGoal: input.recommendedGoal }),
        ...(input.recommendedLength !== undefined && { recommendedLength: input.recommendedLength }),
        ...(input.recommendedStyle !== undefined && { recommendedStyle: input.recommendedStyle }),
        ...(input.recommendedEmotion !== undefined && { recommendedEmotion: input.recommendedEmotion }),
        ...(input.hookPattern !== undefined && { hookPattern: input.hookPattern }),
        ...(input.bodyPattern !== undefined && { bodyPattern: input.bodyPattern }),
        ...(input.ctaPattern !== undefined && { ctaPattern: input.ctaPattern }),
        ...(input.complianceRules !== undefined && { complianceRules: input.complianceRules }),
      },
    });
  }

  async duplicate(id: string): Promise<ScriptTemplate> {
    const template = await this.get(id);
    return this.prisma.scriptTemplate.create({
      data: {
        name: `${template.name} (kópia)`,
        description: template.description,
        structure: template.structure as Prisma.InputJsonValue,
        recommendedGoal: template.recommendedGoal,
        recommendedLength: template.recommendedLength,
        recommendedStyle: template.recommendedStyle,
        recommendedEmotion: template.recommendedEmotion,
        hookPattern: template.hookPattern,
        bodyPattern: template.bodyPattern,
        ctaPattern: template.ctaPattern,
        complianceRules: template.complianceRules,
        isSystemTemplate: false,
      },
    });
  }

  async setFlags(
    id: string,
    flags: { isFavorite?: boolean; isArchived?: boolean; isDefault?: boolean },
  ): Promise<ScriptTemplate> {
    const template = await this.get(id);
    if (template.isSystemTemplate && flags.isArchived) {
      throw new ForbiddenException('Systémová šablóna sa nedá archivovať.');
    }
    if (flags.isDefault) {
      await this.prisma.scriptTemplate.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }
    return this.prisma.scriptTemplate.update({
      where: { id },
      data: {
        ...(flags.isFavorite !== undefined && { isFavorite: flags.isFavorite }),
        ...(flags.isArchived !== undefined && { isArchived: flags.isArchived }),
        ...(flags.isDefault !== undefined && { isDefault: flags.isDefault }),
      },
    });
  }
}
