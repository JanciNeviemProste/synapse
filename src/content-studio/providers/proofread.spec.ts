import { describe, expect, it } from 'vitest';
import { mergeProofread } from './anthropic.provider';
import {
  proofreadFieldsSchema,
  type GeneratedScriptVariant,
} from '../schemas/ai-output.schemas';

const baseVariant = (): GeneratedScriptVariant => ({
  versionName: 'A',
  strategy: {
    workingTitle: 't',
    goal: '',
    targetAudience: '',
    contentPillar: '',
    recommendedLength: '',
    recommendedStyle: '',
    recommendedEmotion: '',
    template: '',
    contentAngle: '',
    angleReason: '',
  },
  hook: 'ten hook ma chibu',
  setup: 'setap',
  mainMessage: 'hlavna myslienka',
  keyInsight: '',
  cta: 'napis mi',
  spokenScript: 'cely skript s chibami',
  productionPlan: {
    estimatedDurationSeconds: 30,
    scenes: [],
    pacingNotes: '',
    pauses: [],
    emphasizedWords: [],
  },
  instagramAssets: {
    caption: 'popis',
    shortCaption: '',
    thumbnailText: '',
    firstComment: '',
    ctaText: '',
    hashtags: ['tag'],
    alternativeHooks: [],
    alternativeTitles: [],
  },
  safety: {
    factualUncertainty: [],
    complianceRisks: [],
    recommendedDisclaimer: '',
    sensitiveInfoWarnings: [],
    claimsToVerify: [],
    sourceReferences: [],
  },
});

describe('mergeProofread', () => {
  it('replaces text fields with corrected values, keeps everything else', () => {
    const v = baseVariant();
    const merged = mergeProofread(v, {
      hook: 'Ten hook má chybu.',
      setup: 'Setup',
      mainMessage: 'Hlavná myšlienka',
      keyInsight: '',
      cta: 'Napíš mi',
      spokenScript: 'Celý skript s chybami',
      caption: 'Popis',
    });
    expect(merged.hook).toBe('Ten hook má chybu.');
    expect(merged.spokenScript).toBe('Celý skript s chybami');
    expect(merged.cta).toBe('Napíš mi');
    expect(merged.instagramAssets.caption).toBe('Popis');
    // untouched
    expect(merged.instagramAssets.hashtags).toEqual(['tag']);
    expect(merged.productionPlan.estimatedDurationSeconds).toBe(30);
    expect(merged.versionName).toBe('A');
  });

  it('keeps the original when a corrected field comes back empty', () => {
    const v = baseVariant();
    const merged = mergeProofread(v, {
      hook: '',
      setup: '',
      mainMessage: '',
      keyInsight: '',
      cta: '',
      spokenScript: '   ',
      caption: '',
    });
    expect(merged.hook).toBe(v.hook);
    expect(merged.spokenScript).toBe(v.spokenScript);
    expect(merged.instagramAssets.caption).toBe(v.instagramAssets.caption);
  });

  it('proofreadFieldsSchema accepts a partial payload', () => {
    expect(() => proofreadFieldsSchema.parse({ hook: 'Ahoj' })).not.toThrow();
    const parsed = proofreadFieldsSchema.parse({ hook: 'Ahoj' });
    expect(parsed.spokenScript).toBe('');
  });
});
