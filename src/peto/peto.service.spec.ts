import { describe, expect, it } from 'vitest';
import type { PetoScript } from '@prisma/client';
import { PetoService } from './peto.service';

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
