import { describe, expect, it } from 'vitest';
import {
  HEAT_SCORE_MAP,
  HOT_LEAD_THRESHOLD,
  crossedHotThreshold,
} from './heat-score.service';

describe('crossedHotThreshold', () => {
  it('fires when the update crosses the threshold', () => {
    expect(crossedHotThreshold(55, 70)).toBe(true);
    expect(crossedHotThreshold(60, 75)).toBe(true);
    expect(crossedHotThreshold(69, HOT_LEAD_THRESHOLD)).toBe(true);
  });

  it('does not fire again once the lead is already hot', () => {
    expect(crossedHotThreshold(70, 85)).toBe(false);
    expect(crossedHotThreshold(75, 90)).toBe(false);
  });

  it('does not fire below the threshold', () => {
    expect(crossedHotThreshold(0, 0)).toBe(false);
    expect(crossedHotThreshold(40, 69)).toBe(false);
  });
});

describe('HEAT_SCORE_MAP', () => {
  it('scores every tracked event type positively', () => {
    for (const [event, score] of Object.entries(HEAT_SCORE_MAP)) {
      expect(score, `score for ${event}`).toBeGreaterThan(0);
    }
  });

  it('yields 0 (skip) for unknown events via the ?? 0 contract', () => {
    expect(HEAT_SCORE_MAP['unknown_event'] ?? 0).toBe(0);
  });

  it('lets a lead reach hot within a realistic session', () => {
    const session =
      HEAT_SCORE_MAP.link_opened +
      HEAT_SCORE_MAP.preview_viewed +
      HEAT_SCORE_MAP.form_started +
      HEAT_SCORE_MAP.form_completed +
      HEAT_SCORE_MAP.preview_revisit;
    expect(session).toBeGreaterThanOrEqual(HOT_LEAD_THRESHOLD);
  });
});
