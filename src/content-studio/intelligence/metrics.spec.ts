import { describe, expect, it } from 'vitest';
import {
  evidenceLevel,
  median,
  normalizeMetrics,
  relativeToMedian,
} from './metrics';

describe('normalizeMetrics (spec 14.6 — never raw cross-account comparison)', () => {
  it('computes normalized ratios', () => {
    const n = normalizeMetrics({
      views: 5000,
      reach: 4000,
      likes: 100,
      comments: 20,
      shares: 30,
      saves: 50,
      followerCountAtPublish: 1000,
    });
    expect(n.viewsPerFollower).toBe(5);
    expect(n.engagementPerReach).toBeCloseTo(200 / 4000);
    expect(n.savesPerReach).toBeCloseTo(50 / 4000);
  });

  it('returns null when denominators are missing or zero', () => {
    const n = normalizeMetrics({ views: 5000, likes: 100 });
    expect(n.viewsPerFollower).toBeNull();
    expect(n.engagementPerReach).toBeNull();
    expect(normalizeMetrics({ views: 10, followerCountAtPublish: 0 }).viewsPerFollower).toBeNull();
  });
});

describe('evidenceLevel', () => {
  it('none without any metrics', () => {
    expect(evidenceLevel({})).toBe('none');
  });

  it('low with raw numbers but no normalization context', () => {
    expect(evidenceLevel({ views: 1000, likes: 50 })).toBe('low');
  });

  it('medium with normalized signals', () => {
    expect(evidenceLevel({ views: 1000, followerCountAtPublish: 500 })).toBe('medium');
  });

  it('high with normalized signals + watch data', () => {
    expect(
      evidenceLevel({ views: 1000, followerCountAtPublish: 500, completionRate: 0.6 }),
    ).toBe('high');
  });
});

describe('median + relativeToMedian', () => {
  it('median handles odd, even, and empty inputs', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(median([])).toBeNull();
  });

  it('relativeToMedian classifies with 10% tolerance', () => {
    expect(relativeToMedian(1.2, 1)).toBe('above');
    expect(relativeToMedian(0.8, 1)).toBe('below');
    expect(relativeToMedian(1.05, 1)).toBe('at');
    expect(relativeToMedian(null, 1)).toBe('unknown');
    expect(relativeToMedian(1, null)).toBe('unknown');
  });
});
