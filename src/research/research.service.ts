import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleSearchService, GoogleSearchResult } from './google-search.service';
import { OrsrService, OrsrCompanyResult } from './orsr.service';
import { FinstatService, FinstatCompanyData } from './finstat.service';
import { WebAnalyzerService, WebAnalysis } from './web-analyzer.service';
import {
  TrustScoreService,
  ResearchData,
  TrustScoreResult,
} from './trust-score.service';

export interface ResearchResult {
  authorName: string;
  profileUrl: string;
  googleSearch: GoogleSearchResult;
  company: OrsrCompanyResult;
  finstatData: FinstatCompanyData;
  webAnalysis: WebAnalysis | null;
  trustScore: TrustScoreResult;
  researchedAt: Date;
}

@Injectable()
export class ResearchService {
  private readonly logger = new Logger(ResearchService.name);

  constructor(
    private configService: ConfigService,
    private googleSearchService: GoogleSearchService,
    private orsrService: OrsrService,
    private finstatService: FinstatService,
    private webAnalyzerService: WebAnalyzerService,
    private trustScoreService: TrustScoreService,
  ) {}

  async runResearch(
    authorName: string,
    profileUrl?: string,
  ): Promise<ResearchResult> {
    this.logger.log(`Starting research for "${authorName}"`);

    const googleSearch: GoogleSearchResult = {
      linkedInUrl: '',
      companyName: '',
      companyIco: '',
      websiteUrl: '',
      otherLinks: [],
    };

    const emptyCompany: OrsrCompanyResult = {
      companyName: '',
      ico: '',
      foundingDate: '',
      registrationCourt: '',
      address: '',
      found: false,
      source: '',
    };

    const emptyFinstat: FinstatCompanyData = {
      companyName: '',
      ico: '',
      revenue: 0,
      employeeCount: 0,
      profit: 0,
      found: false,
    };

    let searchResult = googleSearch;
    let company = emptyCompany;
    let finstatData = emptyFinstat;
    let webAnalysis: WebAnalysis | null = null;

    try {
      searchResult = await this.googleSearchService.searchPerson(authorName);
      this.logger.debug(
        `Google search completed — LinkedIn: ${searchResult.linkedInUrl ? 'found' : 'not found'}`,
      );
    } catch (error) {
      this.logger.error(
        'Google search step failed',
        (error as Error).message,
      );
    }

    try {
      company = await this.orsrService.searchCompany(authorName);
      if (!company.found && searchResult.companyName) {
        company = await this.orsrService.searchCompany(
          searchResult.companyName,
        );
      }
    } catch (error) {
      this.logger.error('ORSR search step failed', (error as Error).message);
    }

    const ico = company.ico || searchResult.companyIco;
    if (ico) {
      try {
        finstatData = await this.finstatService.getCompanyData(ico);
      } catch (error) {
        this.logger.error(
          'FinStat lookup step failed',
          (error as Error).message,
        );
      }
    }

    const websiteUrl = searchResult.websiteUrl || this.findWebsiteUrl(searchResult.otherLinks);
    if (websiteUrl) {
      try {
        webAnalysis = await this.webAnalyzerService.analyzeWebsite(websiteUrl);
      } catch (error) {
        this.logger.error(
          'Website analysis step failed',
          (error as Error).message,
        );
      }
    }

    const companyAge = this.calculateCompanyAge(company.foundingDate);

    const researchData: ResearchData = {
      hasFacebookProfile: !!profileUrl,
      facebookFriends: 0,
      hasLinkedIn: !!searchResult.linkedInUrl,
      hasCompanyInORSR: company.found,
      companyAge,
      revenue: finstatData.revenue,
      hasWebsite: !!websiteUrl,
      websiteIsModern:
        !!webAnalysis?.mobileResponsive && !!webAnalysis?.hasSSL,
      multipleSocialProfiles:
        !!profileUrl && !!searchResult.linkedInUrl,
    };

    const trustScore = this.trustScoreService.calculateTrustScore(researchData);

    this.logger.log(
      `Research completed for "${authorName}" — trust score: ${trustScore.score}/100`,
    );

    return {
      authorName,
      profileUrl: profileUrl || '',
      googleSearch: searchResult,
      company,
      finstatData,
      webAnalysis,
      trustScore,
      researchedAt: new Date(),
    };
  }

  private calculateCompanyAge(foundingDate: string): number {
    if (!foundingDate) return 0;

    try {
      let date: Date;

      const ddmmyyyyMatch = foundingDate.match(
        /(\d{1,2})\.(\d{1,2})\.(\d{4})/,
      );
      if (ddmmyyyyMatch) {
        date = new Date(
          parseInt(ddmmyyyyMatch[3], 10),
          parseInt(ddmmyyyyMatch[2], 10) - 1,
          parseInt(ddmmyyyyMatch[1], 10),
        );
      } else {
        date = new Date(foundingDate);
      }

      if (isNaN(date.getTime())) return 0;

      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const years = diffMs / (1000 * 60 * 60 * 24 * 365.25);
      return Math.floor(years);
    } catch {
      return 0;
    }
  }

  private findWebsiteUrl(links: string[]): string {
    for (const link of links) {
      if (
        !link.includes('facebook.com') &&
        !link.includes('linkedin.com') &&
        !link.includes('twitter.com') &&
        !link.includes('instagram.com') &&
        !link.includes('youtube.com') &&
        !link.includes('google.com') &&
        !link.includes('orsr.sk') &&
        !link.includes('finstat.sk') &&
        !link.includes('zrsr.sk') &&
        !link.includes('wikipedia.org')
      ) {
        return link;
      }
    }
    return '';
  }
}
