import { Injectable, Logger } from '@nestjs/common';

export interface ResearchData {
  hasFacebookProfile: boolean;
  facebookFriends: number;
  hasLinkedIn: boolean;
  hasCompanyInORSR: boolean;
  companyAge: number;
  revenue: number;
  hasWebsite: boolean;
  websiteIsModern: boolean;
  multipleSocialProfiles: boolean;
}

export interface TrustScoreResult {
  score: number;
  maxScore: number;
  breakdown: TrustScoreBreakdownItem[];
}

export interface TrustScoreBreakdownItem {
  criterion: string;
  points: number;
  met: boolean;
}

@Injectable()
export class TrustScoreService {
  private readonly logger = new Logger(TrustScoreService.name);

  calculateTrustScore(data: ResearchData): TrustScoreResult {
    const breakdown: TrustScoreBreakdownItem[] = [];
    let score = 0;

    try {
      const criteria: Array<{
        criterion: string;
        points: number;
        condition: boolean;
      }> = [
        {
          criterion: 'Has Facebook profile',
          points: 10,
          condition: data.hasFacebookProfile,
        },
        {
          criterion: 'Facebook friends > 100',
          points: 5,
          condition: data.facebookFriends > 100,
        },
        {
          criterion: 'Has LinkedIn profile',
          points: 15,
          condition: data.hasLinkedIn,
        },
        {
          criterion: 'Company registered in ORSR',
          points: 20,
          condition: data.hasCompanyInORSR,
        },
        {
          criterion: 'Company age > 2 years',
          points: 5,
          condition: data.companyAge > 2,
        },
        {
          criterion: 'Revenue > 50,000 EUR',
          points: 10,
          condition: data.revenue > 50000,
        },
        {
          criterion: 'Revenue > 200,000 EUR',
          points: 5,
          condition: data.revenue > 200000,
        },
        {
          criterion: 'Has website',
          points: 10,
          condition: data.hasWebsite,
        },
        {
          criterion: 'Website is modern',
          points: 5,
          condition: data.websiteIsModern,
        },
        {
          criterion: 'Multiple social profiles',
          points: 5,
          condition: data.multipleSocialProfiles,
        },
      ];

      for (const item of criteria) {
        const met = item.condition;
        if (met) {
          score += item.points;
        }
        breakdown.push({
          criterion: item.criterion,
          points: item.points,
          met,
        });
      }

      const finalScore = Math.min(score, 100);

      this.logger.debug(
        `Trust score calculated: ${finalScore}/100 (${breakdown.filter((b) => b.met).length}/${breakdown.length} criteria met)`,
      );

      return {
        score: finalScore,
        maxScore: 100,
        breakdown,
      };
    } catch (error) {
      this.logger.error(
        'Failed to calculate trust score',
        (error as Error).message,
      );
      return { score: 0, maxScore: 100, breakdown };
    }
  }
}
