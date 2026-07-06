import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ReelScript, StylePreference, StylePreferenceStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ContentProviderFactory } from '../providers/provider.factory';

/**
 * Style Memory (spec §23): learns from user edits via EXPLICIT preference
 * records. New inferences land as PROPOSED — only ACTIVE preferences
 * (user-approved) affect generation. Weak signals never silently become
 * permanent preferences.
 */
@Injectable()
export class StyleMemoryService {
  private readonly logger = new Logger(StyleMemoryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providerFactory: ContentProviderFactory,
  ) {}

  /** Diff the approved script against its generation-time snapshot. */
  async analyzeScriptEdits(script: ReelScript): Promise<StylePreference[]> {
    const original = (script.strategy as { _original?: { hook?: string; cta?: string; spokenScript?: string } } | null)
      ?._original;
    if (!original?.spokenScript || !script.spokenScript) return [];

    const originalText = [original.hook, original.spokenScript, original.cta]
      .filter(Boolean)
      .join('\n');
    const editedText = [script.hook, script.spokenScript, script.cta]
      .filter(Boolean)
      .join('\n');
    if (originalText === editedText) return [];

    const analysis = await this.providerFactory.getStrategyProvider().analyzeStyle({
      originalScript: originalText,
      editedScript: editedText,
    });

    const created = await Promise.all(
      analysis.preferences.map((p) =>
        this.prisma.stylePreference.create({
          data: {
            sourceScriptId: script.id,
            preferenceType: p.preferenceType,
            preferenceValue: p.preferenceValue,
            confidence: p.confidence,
            status: 'PROPOSED',
          },
        }),
      ),
    );
    this.logger.log(
      `style memory: ${created.length} proposed preferences from script ${script.id}`,
    );
    return created;
  }

  async list(): Promise<StylePreference[]> {
    return this.prisma.stylePreference.findMany({
      orderBy: [{ status: 'asc' }, { confidence: 'desc' }],
    });
  }

  async setStatus(id: string, status: StylePreferenceStatus): Promise<StylePreference> {
    const pref = await this.prisma.stylePreference.findUnique({ where: { id } });
    if (!pref) throw new NotFoundException('Preference not found');
    return this.prisma.stylePreference.update({ where: { id }, data: { status } });
  }

  async updateValue(id: string, value: string): Promise<StylePreference> {
    const pref = await this.prisma.stylePreference.findUnique({ where: { id } });
    if (!pref) throw new NotFoundException('Preference not found');
    return this.prisma.stylePreference.update({
      where: { id },
      data: { preferenceValue: value },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.stylePreference.delete({ where: { id } });
  }

  /** "Disable Style Memory" (spec §23) — deactivates everything at once. */
  async disableAll(): Promise<number> {
    const result = await this.prisma.stylePreference.updateMany({
      where: { status: 'ACTIVE' },
      data: { status: 'DISABLED' },
    });
    return result.count;
  }
}
