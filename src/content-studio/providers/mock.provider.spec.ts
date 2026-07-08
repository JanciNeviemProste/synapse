import { describe, expect, it } from 'vitest';
import {
  brandExtractionSchema,
  complianceResultSchema,
  contentPillarsSchema,
  documentClassificationSchema,
  extractedIdeasSchema,
  generatedContentPlanSchema,
  generatedScriptsSchema,
  interviewBriefSchema,
  inspirationPatternsSchema,
  scriptReviewSchema,
  styleMemoryAnalysisSchema,
} from '../schemas/ai-output.schemas';
import { MockContentProvider } from './mock.provider';

/**
 * Mock mode is a spec requirement (principle 18): the module must work
 * without paid API keys. Every mock output must be valid against the same
 * Zod schemas as real provider output.
 */
describe('MockContentProvider produces schema-valid outputs', () => {
  const provider = new MockContentProvider();

  it('extractIdeas', async () => {
    const out = await provider.extractIdeas({
      rawText: 'Zákazník nevedel, ktorý z mojich balíkov si vybrať.',
      sourceType: 'text_note',
    });
    expect(() => extractedIdeasSchema.parse(out)).not.toThrow();
    expect(out.ideas.length).toBeGreaterThanOrEqual(3);
  });

  it('createContentPillars respects existing pillars', async () => {
    const out = await provider.createContentPillars({
      existingIdeas: [],
      existingPillars: ['Tipy a rady'],
    });
    expect(() => contentPillarsSchema.parse(out)).not.toThrow();
    expect(out.pillars.map((p) => p.name)).not.toContain('Tipy a rady');
  });

  it('createContentPlan generates items inside the date range', async () => {
    const out = await provider.createContentPlan({
      pillars: [],
      startDate: '2026-08-01',
      endDate: '2026-08-31',
      postsPerWeek: 3,
      goals: [],
    });
    expect(() => generatedContentPlanSchema.parse(out)).not.toThrow();
    expect(out.items.length).toBeGreaterThan(5);
    for (const item of out.items) {
      expect(item.scheduledDate >= '2026-08-01').toBe(true);
      expect(item.scheduledDate <= '2026-08-31').toBe(true);
    }
  });

  it('buildInterviewBrief', async () => {
    const out = await provider.buildInterviewBrief('prepis rozhovoru...');
    expect(() => interviewBriefSchema.parse(out)).not.toThrow();
  });

  it('generateScripts returns exactly variants A, B, C with full §17 output', async () => {
    const out = await provider.generateScripts({ topic: 'ako si vybrať službu' });
    expect(() => generatedScriptsSchema.parse(out)).not.toThrow();
    expect(out.variants.map((v) => v.versionName)).toEqual(['A', 'B', 'C']);
    for (const v of out.variants) {
      expect(v.spokenScript.length).toBeGreaterThan(50);
      expect(v.hook.length).toBeGreaterThan(5);
      expect(v.safety.recommendedDisclaimer.length).toBeGreaterThan(0);
    }
  });

  it('reviewScript scores stay in 0–10 (AI estimates)', async () => {
    const out = await provider.reviewScript({
      spokenScript: 'test skript',
      hook: 'hook',
      cta: 'cta',
    });
    expect(() => scriptReviewSchema.parse(out)).not.toThrow();
  });

  it('checkContent flags guarantee claims as high risk', async () => {
    const risky = await provider.checkContent({
      content: 'Garantovaný výnos 10 % bez rizika!',
    });
    expect(() => complianceResultSchema.parse(risky)).not.toThrow();
    expect(risky.riskLevel).toBe('high');

    const safe = await provider.checkContent({
      content: 'Tri veci, ktoré si over pred nákupom.',
    });
    expect(safe.riskLevel).toBe('low');
  });

  it('analyzeInspiration and analyzeStyle', async () => {
    const patterns = await provider.analyzeInspiration({ title: 'Reel X' });
    expect(() => inspirationPatternsSchema.parse(patterns)).not.toThrow();

    const style = await provider.analyzeStyle({
      originalScript: 'a',
      editedScript: 'b',
    });
    expect(() => styleMemoryAnalysisSchema.parse(style)).not.toThrow();
    for (const p of style.preferences) {
      expect(p.confidence).toBeGreaterThanOrEqual(0);
      expect(p.confidence).toBeLessThanOrEqual(1);
    }
  });

  it('classifyDocument', async () => {
    const out = await provider.classifyDocument('cennik.pdf', 'Balík A stojí 200 eur.');
    expect(() => documentClassificationSchema.parse(out)).not.toThrow();
    expect(out.category.length).toBeGreaterThan(0);
  });

  it('extractBrandFields', async () => {
    const out = await provider.extractBrandFields('Sme malá kaviareň v Bratislave.');
    expect(() => brandExtractionSchema.parse(out)).not.toThrow();
  });

  it('transcribeAudio returns timestamped segments', async () => {
    const out = await provider.transcribeAudio({
      filePath: 'audio/test.webm',
      mimeType: 'audio/webm',
    });
    expect(out.text.length).toBeGreaterThan(0);
    expect(out.segments?.length).toBeGreaterThan(0);
  });
});
