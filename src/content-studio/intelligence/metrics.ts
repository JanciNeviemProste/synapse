/**
 * Metric normalization + evidence levels (spec 14.6). Pure — unit tested.
 * Raw view counts are never compared across account sizes; everything is
 * normalized relative to followers/reach and the user's own median.
 */

export interface RawMetrics {
  views?: number | null;
  reach?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  saves?: number | null;
  averageWatchTimeSeconds?: number | null;
  completionRate?: number | null;
  followerCountAtPublish?: number | null;
}

export interface NormalizedMetrics {
  viewsPerFollower: number | null;
  engagementPerReach: number | null;
  savesPerReach: number | null;
  sharesPerReach: number | null;
  commentsPerReach: number | null;
  completionRate: number | null;
}

const ratio = (a?: number | null, b?: number | null): number | null =>
  a != null && b != null && b > 0 ? a / b : null;

export function normalizeMetrics(raw: RawMetrics): NormalizedMetrics {
  const engagement =
    raw.likes != null || raw.comments != null || raw.shares != null || raw.saves != null
      ? (raw.likes ?? 0) + (raw.comments ?? 0) + (raw.shares ?? 0) + (raw.saves ?? 0)
      : null;
  return {
    viewsPerFollower: ratio(raw.views, raw.followerCountAtPublish),
    engagementPerReach: ratio(engagement, raw.reach),
    savesPerReach: ratio(raw.saves, raw.reach),
    sharesPerReach: ratio(raw.shares, raw.reach),
    commentsPerReach: ratio(raw.comments, raw.reach),
    completionRate: raw.completionRate ?? null,
  };
}

export type EvidenceLevel = 'none' | 'low' | 'medium' | 'high';

/**
 * Evidence quality shown in UI (spec 14.6):
 * none  — no metrics at all (creative-only analysis)
 * low   — some metrics but no reach/follower context
 * medium — normalized signals available
 * high  — normalized signals + watch-time/completion data
 */
export function evidenceLevel(raw: RawMetrics): EvidenceLevel {
  const hasAny = Object.values(raw).some((v) => v != null);
  if (!hasAny) return 'none';
  const normalized = normalizeMetrics(raw);
  const hasNormalized =
    normalized.viewsPerFollower != null || normalized.engagementPerReach != null;
  if (!hasNormalized) return 'low';
  const hasWatchData =
    raw.completionRate != null || raw.averageWatchTimeSeconds != null;
  return hasWatchData ? 'high' : 'medium';
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Compare a normalized signal to the user's own median (spec 14.6). */
export function relativeToMedian(
  value: number | null,
  medianValue: number | null,
): 'above' | 'below' | 'at' | 'unknown' {
  if (value == null || medianValue == null) return 'unknown';
  if (medianValue === 0) return value > 0 ? 'above' : 'at';
  const ratio = value / medianValue;
  if (ratio > 1.1) return 'above';
  if (ratio < 0.9) return 'below';
  return 'at';
}
