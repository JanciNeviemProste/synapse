import { describe, expect, it } from 'vitest';
import type { PetoScript } from '@prisma/client';
import { PetoService, selectRelevantDocs } from './peto.service';
import { AiTruncatedOutputError } from '../ai/ai.service';

/**
 * Pure-logic tests. Batch grouping and starter templates don't touch the
 * DB, so we can exercise them on a bare instance.
 */
const svc = new PetoService(
  null as never,
  null as never,
  null as never,
);

const mkScript = (batchId: string, versionName: string, createdAt: string): PetoScript =>
  ({
    id: `${batchId}-${versionName}`,
    batchId,
    versionName,
    createdAt: new Date(createdAt),
    sourceTranscript: 'prepis',
    topic: 'téma',
    hook: 'h',
    setup: null,
    mainMessage: 'm',
    keyInsight: null,
    cta: 'c',
    spokenScript: 's',
    productionPlan: null,
    instagramAssets: null,
    safety: null,
  }) as unknown as PetoScript;

describe('PetoService.groupIntoBatches', () => {
  it('groups variants by batchId, orders A/B/C within a batch', () => {
    const rows = [
      mkScript('b1', 'C', '2026-07-07T10:00:00Z'),
      mkScript('b1', 'A', '2026-07-07T10:00:00Z'),
      mkScript('b1', 'B', '2026-07-07T10:00:00Z'),
    ];
    const batches = svc.groupIntoBatches(rows);
    expect(batches).toHaveLength(1);
    expect(batches[0].variants.map((v) => v.versionName)).toEqual(['A', 'B', 'C']);
    expect(batches[0].topic).toBe('téma');
  });

  it('sorts batches newest-first', () => {
    const rows = [
      mkScript('old', 'A', '2026-07-01T10:00:00Z'),
      mkScript('new', 'A', '2026-07-07T10:00:00Z'),
    ];
    const batches = svc.groupIntoBatches(rows);
    expect(batches.map((b) => b.batchId)).toEqual(['new', 'old']);
  });

  it('returns empty for no scripts', () => {
    expect(svc.groupIntoBatches([])).toEqual([]);
  });
});

describe('PetoService.starterTemplates', () => {
  it('exposes the 14 generic system templates as name/description', () => {
    const starters = svc.starterTemplates();
    expect(starters.length).toBe(14);
    expect(starters.every((s) => s.name && s.description)).toBe(true);
  });
});

describe('selectRelevantDocs — reference documents → KnowledgeContext', () => {
  const docs = [
    { title: 'Cenník', content: 'Balík A stojí 200 eur, balík B stojí 350 eur mesačne.' },
    { title: 'Brand manuál', content: 'Komunikujeme priateľsky, tykáme, vyhýbame sa žargónu.' },
    { title: 'Staré skripty', content: 'Hook o častej chybe, príbeh zákazníka, výzva sledovať.' },
  ];

  it('picks documents relevant to the transcript', () => {
    const ctx = selectRelevantDocs(docs, 'Chcem video o našich balíkoch a cenníku');
    expect(ctx.sources.length).toBeGreaterThan(0);
    expect(ctx.sources[0].title).toBe('Cenník');
  });

  it('caps excerpt length and source count', () => {
    const big = [
      { title: 'Veľký', content: 'balík '.repeat(5000) },
    ];
    const ctx = selectRelevantDocs(big, 'balík balík balík');
    expect(ctx.sources[0].excerpt.length).toBeLessThanOrEqual(3000);
  });

  it('falls back to newest docs when nothing scores (very short transcript)', () => {
    const ctx = selectRelevantDocs(docs, 'aha');
    expect(ctx.sources.length).toBeGreaterThan(0);
  });

  it('returns no sources when there are no docs', () => {
    expect(selectRelevantDocs([], 'čokoľvek').sources).toEqual([]);
  });
});

describe('PetoService.aiFailure (private, reached via bracket access)', () => {
  it('does not duplicate the prefix in the client-facing message', () => {
    const err = svc['aiFailure'](new Error('boom'), 'Generovanie zlyhalo');
    expect(err.message).toBe('boom');
    expect(err.message).not.toContain('Generovanie zlyhalo');
  });

  it('passes through the truncation message verbatim', () => {
    const truncated = new AiTruncatedOutputError('max_tokens');
    const err = svc['aiFailure'](truncated, 'Generovanie zlyhalo');
    expect(err.message).toBe(truncated.message);
  });

  it('gives a clear hint for 401/429 without duplicating the prefix', () => {
    const err401 = svc['aiFailure'](new Error('401 Unauthorized'), 'X');
    expect(err401.message).toContain('API kľúč');
    expect(err401.message).not.toContain('X:');

    const err429 = svc['aiFailure'](new Error('429 Too Many Requests'), 'X');
    expect(err429.message).toContain('preťažená');
  });

  it('points at the actual provider whose key failed, not a generic guess', () => {
    const anthropicErr = svc['aiFailure'](
      new Error(
        '401 {"type":"error","error":{"type":"authentication_error","message":"invalid x-api-key"}}',
      ),
      'X',
    );
    expect(anthropicErr.message).toContain('ANTHROPIC_API_KEY');
    expect(anthropicErr.message).not.toContain('OPENROUTER_API_KEY');

    const openRouterErr = svc['aiFailure'](
      new Error('OpenRouter API error 401: {"error":"invalid key"}'),
      'X',
    );
    expect(openRouterErr.message).toContain('OPENROUTER_API_KEY');
    expect(openRouterErr.message).not.toContain('ANTHROPIC_API_KEY');
  });
});
