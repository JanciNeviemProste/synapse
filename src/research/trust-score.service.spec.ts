import { describe, expect, it } from 'vitest';
import { ResearchData, TrustScoreService } from './trust-score.service';

const NOTHING: ResearchData = {
  hasFacebookProfile: false,
  facebookFriends: 0,
  hasLinkedIn: false,
  hasCompanyInORSR: false,
  companyAge: 0,
  revenue: 0,
  hasWebsite: false,
  websiteIsModern: false,
  multipleSocialProfiles: false,
};

const EVERYTHING: ResearchData = {
  hasFacebookProfile: true,
  facebookFriends: 500,
  hasLinkedIn: true,
  hasCompanyInORSR: true,
  companyAge: 10,
  revenue: 300000,
  hasWebsite: true,
  websiteIsModern: true,
  multipleSocialProfiles: true,
};

describe('TrustScoreService.calculateTrustScore', () => {
  const service = new TrustScoreService();

  it('returns 0 with a full unmet breakdown when nothing is known', () => {
    const result = service.calculateTrustScore(NOTHING);
    expect(result.score).toBe(0);
    expect(result.maxScore).toBe(100);
    expect(result.breakdown).toHaveLength(10);
    expect(result.breakdown.every((b) => !b.met)).toBe(true);
  });

  it('sums all criteria to 90 when everything is met', () => {
    const result = service.calculateTrustScore(EVERYTHING);
    expect(result.score).toBe(90);
    expect(result.breakdown.every((b) => b.met)).toBe(true);
  });

  it('never exceeds 100', () => {
    const result = service.calculateTrustScore(EVERYTHING);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('uses strict > for facebook friends (100 is not enough)', () => {
    const at100 = service.calculateTrustScore({ ...NOTHING, facebookFriends: 100 });
    const at101 = service.calculateTrustScore({ ...NOTHING, facebookFriends: 101 });
    expect(at100.score).toBe(0);
    expect(at101.score).toBe(5);
  });

  it('uses strict > for company age (2 years is not enough)', () => {
    const at2 = service.calculateTrustScore({ ...NOTHING, companyAge: 2 });
    const at3 = service.calculateTrustScore({ ...NOTHING, companyAge: 3 });
    expect(at2.score).toBe(0);
    expect(at3.score).toBe(5);
  });

  it('awards revenue tiers cumulatively', () => {
    const at50k = service.calculateTrustScore({ ...NOTHING, revenue: 50000 });
    const at60k = service.calculateTrustScore({ ...NOTHING, revenue: 60000 });
    const at250k = service.calculateTrustScore({ ...NOTHING, revenue: 250000 });
    expect(at50k.score).toBe(0);
    expect(at60k.score).toBe(10);
    expect(at250k.score).toBe(15);
  });

  it('weights ORSR registration highest (20 points)', () => {
    const result = service.calculateTrustScore({ ...NOTHING, hasCompanyInORSR: true });
    expect(result.score).toBe(20);
    expect(
      result.breakdown.find((b) => b.criterion.includes('ORSR'))?.met,
    ).toBe(true);
  });
});
