import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PetoBrand, PetoDoc, PetoScript, PetoTemplate, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { SYSTEM_TEMPLATES } from '../content-studio/data/system-templates';
import {
  extractKeywords,
  scoreDocument,
} from '../content-studio/services/knowledge.service';
import {
  BrandContext,
  KnowledgeContext,
} from '../content-studio/providers/provider.interfaces';
import { ContentProviderFactory } from '../content-studio/providers/provider.factory';
import { AiTruncatedOutputError } from '../ai/ai.service';
import {
  EmptyDocumentError,
  extractText,
  UnsupportedFileError,
} from './document-text';
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

// Claude's input context window is huge (100k+ tokens) — these caps exist to
// keep only the most relevant material in the prompt, not to fit a token
// budget. Output-side truncation (the actual failure risk) is handled
// separately in AiService/AnthropicContentProvider.
const DOC_EXCERPT_LENGTH = 3000;
const MAX_DOC_SOURCES = 8;

/**
 * Pick the reference documents most relevant to the transcript and turn them
 * into a KnowledgeContext for the script prompt. Reuses Content Studio's pure
 * keyword-retrieval helpers. Pure — unit tested.
 */
export function selectRelevantDocs(
  docs: Pick<PetoDoc, 'title' | 'content'>[],
  transcript: string,
): KnowledgeContext {
  const keywords = extractKeywords(transcript);
  const scored = docs
    .map((doc) => ({
      doc,
      score: scoreDocument(
        { title: doc.title, content: doc.content, tags: [] },
        keywords,
      ),
    }))
    .filter((d) => d.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_DOC_SOURCES);

  // If nothing scored (very short transcript), fall back to the newest docs so
  // uploaded material still informs generation.
  const chosen = scored.length
    ? scored.map((s) => s.doc)
    : docs.slice(0, MAX_DOC_SOURCES);

  return {
    sources: chosen.map((doc) => ({
      title: doc.title,
      excerpt: doc.content.substring(0, DOC_EXCERPT_LENGTH),
    })),
  };
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
    // Transaction keeps exactly one active brand row even under concurrent
    // saves (double-click) and cleans up any pre-existing duplicates.
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.petoBrand.findMany({
        where: { isActive: true },
        orderBy: { updatedAt: 'desc' },
      });
      if (rows.length === 0) {
        return tx.petoBrand.create({ data });
      }
      if (rows.length > 1) {
        await tx.petoBrand.updateMany({
          where: { id: { in: rows.slice(1).map((r) => r.id) } },
          data: { isActive: false },
        });
      }
      return tx.petoBrand.update({ where: { id: rows[0].id }, data });
    });
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

  async updateTemplate(id: string, input: PetoTemplateInput): Promise<PetoTemplate> {
    const existing = await this.prisma.petoTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Šablóna neexistuje.');
    return this.prisma.petoTemplate.update({
      where: { id },
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
    const existing = await this.prisma.petoTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Šablóna neexistuje.');
    await this.prisma.petoTemplate.delete({ where: { id } });
  }

  // ---- Reference documents (PDF / Word / text) ----

  async listDocs(): Promise<PetoDoc[]> {
    return this.prisma.petoDoc.findMany({ orderBy: { createdAt: 'desc' } });
  }

  /** Extract text from an uploaded file and store it (text only, no binary). */
  async addDoc(buffer: Buffer, mimeType: string, fileName: string): Promise<PetoDoc> {
    const { text, sourceType } = await this.extractTextOrThrow(buffer, mimeType, fileName);
    const category = await this.classifyDocBestEffort(fileName, text);
    return this.prisma.petoDoc.create({
      data: {
        title: fileName.slice(0, 200),
        sourceType,
        category,
        content: text,
        charCount: text.length,
      },
    });
  }

  /** Extract text from a file without persisting anything — used to feed
   * other sections' manual fields (templates, transcript) from a dropped
   * document. */
  async extractTextOnly(
    buffer: Buffer,
    mimeType: string,
    fileName: string,
  ): Promise<{ text: string; sourceType: string }> {
    return this.extractTextOrThrow(buffer, mimeType, fileName);
  }

  /** AI-guessed Brand DNA fields from a dropped document — returned for the
   * user to review/edit, never persisted directly. */
  async extractBrandFromDoc(
    buffer: Buffer,
    mimeType: string,
    fileName: string,
  ): Promise<{ brandName: string; industry: string; targetAudience: string; communicationStyle: string; preferredPhrases: string[]; forbiddenPhrases: string[]; requiredCtas: string[] }> {
    const { text } = await this.extractTextOrThrow(buffer, mimeType, fileName);
    try {
      return await this.providerFactory
        .getBrandExtractionProvider()
        .extractBrandFields(text.slice(0, 3000));
    } catch (error) {
      this.logger.error(`brand extraction failed: ${(error as Error).message}`);
      throw new BadRequestException('Z dokumentu sa nepodarilo odhadnúť brand polia.');
    }
  }

  private async extractTextOrThrow(
    buffer: Buffer,
    mimeType: string,
    fileName: string,
  ): Promise<{ text: string; sourceType: string }> {
    try {
      return await extractText(buffer, mimeType, fileName);
    } catch (error) {
      if (
        error instanceof UnsupportedFileError ||
        error instanceof EmptyDocumentError
      ) {
        throw new BadRequestException(error.message);
      }
      this.logger.error(`peto doc extraction failed: ${(error as Error).message}`);
      throw new BadRequestException('Súbor sa nepodarilo spracovať.');
    }
  }

  /** AI-guessed document category — best-effort, never blocks the upload. */
  private async classifyDocBestEffort(
    fileName: string,
    text: string,
  ): Promise<string | null> {
    try {
      const { category } = await this.providerFactory
        .getDocumentClassificationProvider()
        .classifyDocument(fileName, text.slice(0, 1500));
      return category;
    } catch (error) {
      this.logger.warn(`document classification failed: ${(error as Error).message}`);
      return null;
    }
  }

  async deleteDoc(id: string): Promise<void> {
    const existing = await this.prisma.petoDoc.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Podklad neexistuje.');
    await this.prisma.petoDoc.delete({ where: { id } });
  }

  /**
   * Map a provider/network error to a friendly HTTP failure. Keeps the raw
   * detail out of a bare 500 and points at the likely cause (bad API key).
   */
  private aiFailure(error: unknown, prefix: string): ServiceUnavailableException {
    const msg = (error as Error).message || 'neznáma chyba';
    this.logger.error(`${prefix}: ${msg}`);
    if (error instanceof AiTruncatedOutputError) {
      return new ServiceUnavailableException(error.message);
    }
    if (msg.includes('401')) {
      return new ServiceUnavailableException(
        'AI služba odmietla API kľúč (401). Skontroluj kľúč v .env (OPENROUTER_API_KEY / GROQ_API_KEY) a reštartuj.',
      );
    }
    if (msg.includes('429')) {
      return new ServiceUnavailableException('AI služba je preťažená (429). Skús o chvíľu.');
    }
    return new ServiceUnavailableException(msg);
  }

  /** True when text generation would run on the mock provider (no AI key). */
  isMockMode(): boolean {
    return this.providerFactory.isTextGenerationMock();
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
    try {
      const result = await this.providerFactory.getTranscriptionProvider().transcribeAudio({
        fileBuffer: buffer,
        mimeType,
        language: 'sk',
      });
      return { text: result.text, durationSeconds: result.durationSeconds };
    } catch (error) {
      throw this.aiFailure(error, 'Prepis zlyhal');
    }
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

    const docs = await this.prisma.petoDoc.findMany();
    const knowledge = selectRelevantDocs(docs, transcript);
    if (knowledge.sources.length) {
      this.logger.log(
        `peto: using ${knowledge.sources.length} reference doc(s) for generation`,
      );
    }

    let generated;
    try {
      generated = await this.providerFactory.getScriptProvider().generateScripts({
        topic,
        rawIdea: transcript,
        brand,
        knowledge: knowledge.sources.length ? knowledge : undefined,
        template: template
          ? {
              name: template.name,
              structure: template.structure ?? { sections: [] },
              hookPattern: template.hookPattern ?? undefined,
              ctaPattern: template.ctaPattern ?? undefined,
            }
          : undefined,
      });
    } catch (error) {
      throw this.aiFailure(error, 'Generovanie zlyhalo');
    }

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
