import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PetoBrand, PetoScript, PetoTemplate, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { SYSTEM_TEMPLATES } from '../content-studio/data/system-templates';
import { BrandContext } from '../content-studio/providers/provider.interfaces';
import { ContentProviderFactory } from '../content-studio/providers/provider.factory';
import { ContentStorageService } from '../content-studio/storage/content-storage.service';
import { GeneratedScriptVariant } from '../content-studio/schemas/ai-output.schemas';
import { PrismaService } from '../database/prisma.service';

export interface PetoBrandInput {
  brandName: string;
  industry?: string;
  targetAudience?: string;
  communicationStyle?: string;
  addressing?: string;
  preferredPhrases?: string[];
  forbiddenPhrases?: string[];
  requiredCtas?: string[];
  notes?: string;
}

export interface PetoTemplateInput {
  name: string;
  description?: string;
  structure?: string;
  hookPattern?: string;
  ctaPattern?: string;
}

export interface PetoScriptBatch {
  batchId: string;
  createdAt: Date;
  topic: string | null;
  sourceTranscript: string | null;
  variants: PetoScript[];
}

function toStringArray(value: Prisma.JsonValue | null | undefined): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === 'string')
    : [];
}

/**
 * Peťové Studio — simplified voice → scripts flow.
 * Fully isolated from Content Studio: its own lean tables (PetoBrand,
 * PetoTemplate, PetoScript). Reuses the shared AI layer (transcription +
 * script-generation providers) via ContentProviderFactory.
 */
@Injectable()
export class PetoService {
  private readonly logger = new Logger(PetoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providerFactory: ContentProviderFactory,
    private readonly storage: ContentStorageService,
  ) {}

  // ---- Brand DNA (single active row) ----

  async getBrand(): Promise<PetoBrand | null> {
    return this.prisma.petoBrand.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async upsertBrand(input: PetoBrandInput): Promise<PetoBrand> {
    const existing = await this.getBrand();
    const data = {
      brandName: input.brandName,
      industry: input.industry ?? null,
      targetAudience: input.targetAudience ?? null,
      communicationStyle: input.communicationStyle ?? null,
      addressing: input.addressing || 'tykanie',
      preferredPhrases: (input.preferredPhrases ?? []) as Prisma.InputJsonValue,
      forbiddenPhrases: (input.forbiddenPhrases ?? []) as Prisma.InputJsonValue,
      requiredCtas: (input.requiredCtas ?? []) as Prisma.InputJsonValue,
      notes: input.notes ?? null,
      isActive: true,
    };
    return existing
      ? this.prisma.petoBrand.update({ where: { id: existing.id }, data })
      : this.prisma.petoBrand.create({ data });
  }

  private async brandContext(): Promise<BrandContext | undefined> {
    const brand = await this.getBrand();
    if (!brand) return undefined;
    return {
      brandName: brand.brandName,
      industry: brand.industry ?? undefined,
      targetAudience: brand.targetAudience ?? undefined,
      communicationStyle: brand.communicationStyle ?? undefined,
      addressing: brand.addressing,
      preferredPhrases: toStringArray(brand.preferredPhrases),
      forbiddenPhrases: toStringArray(brand.forbiddenPhrases),
      requiredCtas: toStringArray(brand.requiredCtas),
      complianceNotes: brand.notes ?? undefined,
    };
  }

  // ---- Templates (Peťo's own + generic starters) ----

  async listTemplates(): Promise<PetoTemplate[]> {
    return this.prisma.petoTemplate.findMany({ orderBy: { createdAt: 'desc' } });
  }

  /** Generic system templates offered read-only as starting points. */
  starterTemplates(): { name: string; description: string }[] {
    return SYSTEM_TEMPLATES.map((t) => ({ name: t.name, description: t.description }));
  }

  async createTemplate(input: PetoTemplateInput): Promise<PetoTemplate> {
    return this.prisma.petoTemplate.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        structure: input.structure ?? null,
        hookPattern: input.hookPattern ?? null,
        ctaPattern: input.ctaPattern ?? null,
      },
    });
  }

  async deleteTemplate(id: string): Promise<void> {
    await this.prisma.petoTemplate.delete({ where: { id } });
  }

  // ---- Voice → text ----

  async transcribe(
    buffer: Buffer,
    mimeType: string,
    sizeBytes: number,
  ): Promise<{ text: string; durationSeconds?: number }> {
    const validationError = this.storage.validate('audio', mimeType, sizeBytes);
    if (validationError) {
      throw new BadRequestException(validationError);
    }
    // Audio is transcribed from memory and never stored (privacy + simplicity).
    const result = await this.providerFactory.getTranscriptionProvider().transcribeAudio({
      fileBuffer: buffer,
      mimeType,
      language: 'sk',
    });
    return { text: result.text, durationSeconds: result.durationSeconds };
  }

  // ---- Generate scripts ----

  async generate(input: {
    transcript: string;
    templateId?: string;
  }): Promise<PetoScriptBatch> {
    const transcript = input.transcript.trim();
    if (!transcript) {
      throw new BadRequestException('Prázdny prepis — nahraj hlasovku alebo napíš text.');
    }

    const brand = await this.brandContext();
    const template = input.templateId
      ? await this.prisma.petoTemplate.findUnique({ where: { id: input.templateId } })
      : null;
    if (input.templateId && !template) {
      throw new NotFoundException('Šablóna neexistuje.');
    }

    const topic = transcript.replace(/\s+/g, ' ').slice(0, 80);

    const generated = await this.providerFactory.getScriptProvider().generateScripts({
      topic,
      rawIdea: transcript,
      brand,
      template: template
        ? {
            name: template.name,
            structure: template.structure ?? { sections: [] },
            hookPattern: template.hookPattern ?? undefined,
            ctaPattern: template.ctaPattern ?? undefined,
          }
        : undefined,
    });

    const batchId = randomUUID();
    await this.prisma.petoScript.createMany({
      data: generated.variants.map((v: GeneratedScriptVariant) => ({
        batchId,
        sourceTranscript: transcript,
        topic,
        versionName: v.versionName,
        hook: v.hook,
        setup: v.setup || null,
        mainMessage: v.mainMessage,
        keyInsight: v.keyInsight || null,
        cta: v.cta,
        spokenScript: v.spokenScript,
        productionPlan: v.productionPlan as unknown as Prisma.InputJsonValue,
        instagramAssets: v.instagramAssets as unknown as Prisma.InputJsonValue,
        safety: v.safety as unknown as Prisma.InputJsonValue,
      })),
    });

    this.logger.log(
      `peto: generated ${generated.variants.length} variants (batch ${batchId})`,
    );
    const batch = await this.getBatch(batchId);
    if (!batch) throw new Error('Batch not found after creation');
    return batch;
  }

  // ---- History ----

  async listBatches(limit = 20): Promise<PetoScriptBatch[]> {
    const scripts = await this.prisma.petoScript.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit * 3,
    });
    return this.groupIntoBatches(scripts).slice(0, limit);
  }

  async getBatch(batchId: string): Promise<PetoScriptBatch | null> {
    const scripts = await this.prisma.petoScript.findMany({
      where: { batchId },
      orderBy: { versionName: 'asc' },
    });
    if (scripts.length === 0) return null;
    return {
      batchId,
      createdAt: scripts[0].createdAt,
      topic: scripts[0].topic,
      sourceTranscript: scripts[0].sourceTranscript,
      variants: scripts,
    };
  }

  async deleteBatch(batchId: string): Promise<void> {
    await this.prisma.petoScript.deleteMany({ where: { batchId } });
  }

  /** Pure: group flat script rows into ordered batches. */
  groupIntoBatches(scripts: PetoScript[]): PetoScriptBatch[] {
    const byBatch = new Map<string, PetoScript[]>();
    for (const s of scripts) {
      const list = byBatch.get(s.batchId) ?? [];
      list.push(s);
      byBatch.set(s.batchId, list);
    }
    return [...byBatch.values()]
      .map((variants) => {
        const ordered = [...variants].sort((a, b) =>
          a.versionName.localeCompare(b.versionName),
        );
        return {
          batchId: ordered[0].batchId,
          createdAt: ordered[0].createdAt,
          topic: ordered[0].topic,
          sourceTranscript: ordered[0].sourceTranscript,
          variants: ordered,
        };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}
