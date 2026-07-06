import { Injectable } from '@nestjs/common';
import { BrandProfile, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { BrandContext } from '../providers/provider.interfaces';

export interface BrandProfileInput {
  brandName: string;
  industry?: string;
  targetAudience?: string;
  communicationStyle?: string;
  addressing?: string;
  preferredPhrases?: string[];
  forbiddenPhrases?: string[];
  requiredCtas?: string[];
  humorLevel?: number;
  formalityLevel?: number;
  energyLevel?: number;
  trustRules?: string;
  complianceNotes?: string;
}

function toStringArray(value: Prisma.JsonValue | null): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

/** Brand DNA (spec §10) — single-tenant: one active profile. */
@Injectable()
export class BrandProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getActive(): Promise<BrandProfile | null> {
    return this.prisma.brandProfile.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async upsert(input: BrandProfileInput): Promise<BrandProfile> {
    const existing = await this.getActive();
    const data = {
      brandName: input.brandName,
      industry: input.industry ?? null,
      targetAudience: input.targetAudience ?? null,
      communicationStyle: input.communicationStyle ?? null,
      addressing: input.addressing || 'tykanie',
      preferredPhrases: (input.preferredPhrases ?? []) as Prisma.InputJsonValue,
      forbiddenPhrases: (input.forbiddenPhrases ?? []) as Prisma.InputJsonValue,
      requiredCtas: (input.requiredCtas ?? []) as Prisma.InputJsonValue,
      humorLevel: input.humorLevel ?? 3,
      formalityLevel: input.formalityLevel ?? 3,
      energyLevel: input.energyLevel ?? 3,
      trustRules: input.trustRules ?? null,
      complianceNotes: input.complianceNotes ?? null,
      isActive: true,
    };
    if (existing) {
      return this.prisma.brandProfile.update({ where: { id: existing.id }, data });
    }
    return this.prisma.brandProfile.create({ data });
  }

  /** Brand DNA must affect every generated output (spec principle 7). */
  async getContext(): Promise<BrandContext | undefined> {
    const profile = await this.getActive();
    if (!profile) return undefined;
    return {
      brandName: profile.brandName,
      industry: profile.industry ?? undefined,
      targetAudience: profile.targetAudience ?? undefined,
      communicationStyle: profile.communicationStyle ?? undefined,
      addressing: profile.addressing,
      preferredPhrases: toStringArray(profile.preferredPhrases),
      forbiddenPhrases: toStringArray(profile.forbiddenPhrases),
      requiredCtas: toStringArray(profile.requiredCtas),
      humorLevel: profile.humorLevel,
      formalityLevel: profile.formalityLevel,
      energyLevel: profile.energyLevel,
      trustRules: profile.trustRules ?? undefined,
      complianceNotes: profile.complianceNotes ?? undefined,
    };
  }
}
