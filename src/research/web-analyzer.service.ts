import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import puppeteer, { Browser } from 'puppeteer';
import { AiService } from '../ai/ai.service';

export interface WebAnalysis {
  url: string;
  mobileResponsive: boolean;
  loadTimeSeconds: number;
  hasSSL: boolean;
  hasMeta: boolean;
  hasAnalytics: boolean;
  designAssessment: string;
  seoIssues: string[];
  recommendation: string;
}

@Injectable()
export class WebAnalyzerService {
  private readonly logger = new Logger(WebAnalyzerService.name);
  private readonly timeout = 30000;

  constructor(
    private configService: ConfigService,
    private aiService: AiService,
  ) {}

  async analyzeWebsite(url: string): Promise<WebAnalysis> {
    const result: WebAnalysis = {
      url,
      mobileResponsive: false,
      loadTimeSeconds: 0,
      hasSSL: false,
      hasMeta: false,
      hasAnalytics: false,
      designAssessment: '',
      seoIssues: [],
      recommendation: '',
    };

    if (!url) {
      this.logger.warn('Empty URL provided — skipping web analysis');
      return result;
    }

    let browser: Browser | null = null;

    try {
      const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
      result.hasSSL = normalizedUrl.startsWith('https://');

      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const desktopAnalysis = await this.analyzeDesktop(browser, normalizedUrl);
      result.loadTimeSeconds = desktopAnalysis.loadTimeSeconds;
      result.hasMeta = desktopAnalysis.hasMeta;
      result.hasAnalytics = desktopAnalysis.hasAnalytics;
      result.seoIssues = desktopAnalysis.seoIssues;

      const mobileAnalysis = await this.analyzeMobile(browser, normalizedUrl);
      result.mobileResponsive = mobileAnalysis.mobileResponsive;

      try {
        const designResult = await this.assessDesign(
          normalizedUrl,
          desktopAnalysis.pageTitle,
          desktopAnalysis.htmlSample,
        );
        result.designAssessment = designResult.assessment;
        result.recommendation = designResult.recommendation;
      } catch (aiError) {
        this.logger.warn(
          'AI design assessment failed — using fallback',
          (aiError as Error).message,
        );
        result.designAssessment = this.generateFallbackAssessment(result);
        result.recommendation = this.generateFallbackRecommendation(result);
      }

      this.logger.log(
        `Website analysis completed for ${url} — load: ${result.loadTimeSeconds}s, mobile: ${result.mobileResponsive}, SSL: ${result.hasSSL}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Website analysis failed for ${url}`,
        (error as Error).message,
      );
      return result;
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          this.logger.error(
            'Failed to close browser',
            (closeError as Error).message,
          );
        }
      }
    }
  }

  private async analyzeDesktop(
    browser: Browser,
    url: string,
  ): Promise<{
    loadTimeSeconds: number;
    hasMeta: boolean;
    hasAnalytics: boolean;
    seoIssues: string[];
    pageTitle: string;
    htmlSample: string;
  }> {
    const page = await browser.newPage();

    try {
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      );

      const startTime = Date.now();
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: this.timeout,
      });
      const loadTimeSeconds =
        Math.round(((Date.now() - startTime) / 1000) * 100) / 100;

      const pageData = await page.evaluate(() => {
        const title = document.title || '';
        const metaDescription = document.querySelector(
          'meta[name="description"]',
        );
        const metaKeywords = document.querySelector('meta[name="keywords"]');
        const ogTitle = document.querySelector('meta[property="og:title"]');
        const ogDescription = document.querySelector(
          'meta[property="og:description"]',
        );
        const canonical = document.querySelector('link[rel="canonical"]');
        const viewport = document.querySelector('meta[name="viewport"]');

        const hasGA =
          !!document.querySelector('script[src*="google-analytics"]') ||
          !!document.querySelector('script[src*="googletagmanager"]') ||
          !!document.querySelector('script[src*="gtag"]');
        const hasFBPixel = !!document.querySelector(
          'script[src*="connect.facebook"]',
        );
        const hasHotjar = !!document.querySelector(
          'script[src*="hotjar"]',
        );

        const h1Elements = document.querySelectorAll('h1');
        const images = document.querySelectorAll('img');
        const imagesWithoutAlt = document.querySelectorAll('img:not([alt])');

        const seoIssues: string[] = [];
        if (!title) seoIssues.push('Missing page title');
        if (title.length > 60)
          seoIssues.push('Title too long (over 60 characters)');
        if (!metaDescription)
          seoIssues.push('Missing meta description');
        if (!ogTitle) seoIssues.push('Missing Open Graph title');
        if (!ogDescription)
          seoIssues.push('Missing Open Graph description');
        if (!canonical) seoIssues.push('Missing canonical URL');
        if (!viewport) seoIssues.push('Missing viewport meta tag');
        if (h1Elements.length === 0) seoIssues.push('Missing H1 tag');
        if (h1Elements.length > 1) seoIssues.push('Multiple H1 tags');
        if (imagesWithoutAlt.length > 0)
          seoIssues.push(
            `${imagesWithoutAlt.length} images without alt text`,
          );

        const htmlSample = document.documentElement.outerHTML.substring(
          0,
          3000,
        );

        return {
          title,
          hasMeta: !!(metaDescription || metaKeywords),
          hasAnalytics: hasGA || hasFBPixel || hasHotjar,
          seoIssues,
          htmlSample,
        };
      });

      return {
        loadTimeSeconds,
        hasMeta: pageData.hasMeta,
        hasAnalytics: pageData.hasAnalytics,
        seoIssues: pageData.seoIssues,
        pageTitle: pageData.title,
        htmlSample: pageData.htmlSample,
      };
    } catch (error) {
      this.logger.error('Desktop analysis failed', (error as Error).message);
      return {
        loadTimeSeconds: 0,
        hasMeta: false,
        hasAnalytics: false,
        seoIssues: ['Failed to load page'],
        pageTitle: '',
        htmlSample: '',
      };
    } finally {
      try {
        await page.close();
      } catch {
        // Page already closed
      }
    }
  }

  private async analyzeMobile(
    browser: Browser,
    url: string,
  ): Promise<{ mobileResponsive: boolean }> {
    const page = await browser.newPage();

    try {
      await page.setViewport({ width: 375, height: 812, isMobile: true });
      await page.setUserAgent(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
      );

      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: this.timeout,
      });

      const mobileData = await page.evaluate(() => {
        const viewport = document.querySelector('meta[name="viewport"]');
        const hasViewport = !!viewport;

        const bodyWidth = document.body.scrollWidth;
        const windowWidth = window.innerWidth;
        const noHorizontalOverflow = bodyWidth <= windowWidth + 10;

        const hasMediaQueries = Array.from(document.styleSheets)
          .some((sheet) => {
            try {
              return Array.from(sheet.cssRules).some(
                (rule) => rule instanceof CSSMediaRule,
              );
            } catch {
              return false;
            }
          });

        return {
          hasViewport,
          noHorizontalOverflow,
          hasMediaQueries,
        };
      });

      const mobileResponsive =
        mobileData.hasViewport &&
        (mobileData.noHorizontalOverflow || mobileData.hasMediaQueries);

      return { mobileResponsive };
    } catch (error) {
      this.logger.error('Mobile analysis failed', (error as Error).message);
      return { mobileResponsive: false };
    } finally {
      try {
        await page.close();
      } catch {
        // Page already closed
      }
    }
  }

  private async assessDesign(
    url: string,
    pageTitle: string,
    htmlSample: string,
  ): Promise<{ assessment: string; recommendation: string }> {
    const systemPrompt = `You are a web design expert. Analyze the provided website HTML snippet and provide a brief assessment. Respond in JSON format with two fields: "assessment" (2-3 sentences about the design quality, modernity, and user experience) and "recommendation" (1-2 sentences of actionable improvement advice). Be concise and professional.`;

    const userMessage = `Analyze this website:
URL: ${url}
Title: ${pageTitle}
HTML sample (first 3000 chars):
${htmlSample.substring(0, 2000)}`;

    const result = await this.aiService.generateJson<{
      assessment: string;
      recommendation: string;
    }>(systemPrompt, userMessage);

    return {
      assessment: result.assessment || '',
      recommendation: result.recommendation || '',
    };
  }

  private generateFallbackAssessment(analysis: WebAnalysis): string {
    const aspects: string[] = [];

    if (analysis.hasSSL) {
      aspects.push('The site uses HTTPS encryption');
    } else {
      aspects.push('The site lacks HTTPS encryption');
    }

    if (analysis.mobileResponsive) {
      aspects.push('appears mobile-responsive');
    } else {
      aspects.push('may not be mobile-responsive');
    }

    if (analysis.loadTimeSeconds > 5) {
      aspects.push(`has slow load times (${analysis.loadTimeSeconds}s)`);
    } else if (analysis.loadTimeSeconds > 0) {
      aspects.push(
        `loads in acceptable time (${analysis.loadTimeSeconds}s)`,
      );
    }

    return aspects.join(', ') + '.';
  }

  private generateFallbackRecommendation(analysis: WebAnalysis): string {
    const recs: string[] = [];

    if (!analysis.hasSSL) recs.push('Enable HTTPS');
    if (!analysis.mobileResponsive) recs.push('Improve mobile responsiveness');
    if (analysis.loadTimeSeconds > 5) recs.push('Optimize page load speed');
    if (!analysis.hasMeta) recs.push('Add meta tags for SEO');
    if (!analysis.hasAnalytics) recs.push('Install analytics tracking');
    if (analysis.seoIssues.length > 3) recs.push('Address SEO issues');

    return recs.length > 0
      ? `Recommended improvements: ${recs.join(', ')}.`
      : 'Website meets basic quality standards.';
  }
}
