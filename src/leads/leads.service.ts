import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { GmailService } from '../gmail/gmail.service';
import { GmailParser, FacebookNotification } from '../gmail/gmail.parser';
import { AiService } from '../ai/ai.service';
import { AiLearningService } from '../ai/ai-learning.service';
import { TelegramService } from '../telegram/telegram.service';
import { TrackingService } from '../tracking/tracking.service';
import { ResearchService, ResearchResult } from '../research/research.service';
import { InlineKeyboard } from 'grammy';
import { v4 as uuid } from 'uuid';
import { Lead, LeadStatus, Note } from '@prisma/client';
import {
  bold,
  italic,
  link,
  code,
  formatLeadStatus,
  formatDate,
  truncate,
} from '../common/utils/telegram-formatter';

const LEAD_KEYWORDS = [
  'web', 'webstránk', 'website', 'stránk', 'e-shop', 'eshop',
  'online obchod', 'internetový obchod',
  'wordpress', 'woocommerce', 'shopify', 'prestashop',
  'frontend', 'backend', 'fullstack', 'developer', 'programátor',
  'web design', 'ux', 'ui', 'landing page', 'redesign',
  'programovanie', 'vývoj', 'development', 'aplikáci', 'appk',
  'ppc', 'google ads', 'facebook ads', 'meta ads', 'reklam',
  'kampaň', 'kampane', 'marketing', 'digitálny marketing',
  'online marketing', 'performance', 'lead generation', 'konverz',
  'remarketing', 'seo', 'sem', 'optimalizáci', 'agentúr', 'agency',
  'ai', 'umelá inteligencia', 'automatizáci', 'automat',
  'video', 'animáci', 'kóder', 'kodér', 'IT',
  'hľadám programátora', 'hľadám webára', 'potrebujem web',
  'potrebujem stránku', 'potrebujem eshop', 'robí niekto web',
  'viete mi odporučiť', 'odporúčte', 'poraďte', 'kto robí',
  'koľko stojí web', 'cena za web', 'cenová ponuka',
];

interface AiRelevanceResult {
  isRelevant: boolean;
  confidence: number;
  category: string;
  reasoning: string;
}

interface AiResponseResult {
  publicComment: string;
  privateMessage: string;
  toneStyle: string;
  keyPhrase: string;
}

interface LeadWithRelations extends Lead {
  notes: Note[];
  activities: Array<{
    id: string;
    leadId: string;
    event: string;
    metadata: string | null;
    createdAt: Date;
  }>;
}

interface LeadStats {
  total: number;
  byStatus: Record<string, number>;
  todayCount: number;
  weekCount: number;
  avgConfidence: number;
  avgHeatScore: number;
  conversionRate: number;
  topCategories: Array<{ category: string; count: number }>;
}

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);
  private readonly appUrl: string;
  private readonly minConfidence: number;

  constructor(
    private prisma: PrismaService,
    private gmailService: GmailService,
    private gmailParser: GmailParser,
    private aiService: AiService,
    private aiLearningService: AiLearningService,
    private telegramService: TelegramService,
    private trackingService: TrackingService,
    private researchService: ResearchService,
    private configService: ConfigService,
  ) {
    this.appUrl = this.configService.get<string>('appUrl') || 'http://localhost:3000';
    this.minConfidence = this.configService.get<number>('cron.leadMinConfidence') || 0.5;
  }

  async processNewLeads(): Promise<void> {
    try {
      const emails = await this.gmailService.fetchUnreadFacebookEmails();
      if (emails.length === 0) {
        this.logger.debug('No new Facebook emails to process');
        return;
      }

      this.logger.log(`Processing ${emails.length} new Facebook emails`);

      for (const email of emails) {
        try {
          await this.processEmail(email.messageId, email.htmlBody, email.snippet);
          await this.gmailService.markAsRead(email.messageId);
        } catch (error) {
          this.logger.error(
            `Failed to process email ${email.messageId}`,
            (error as Error).message,
          );
        }
      }
    } catch (error) {
      this.logger.error('Failed to process new leads', (error as Error).message);
    }
  }

  async getLeads(status?: string, limit?: number): Promise<Lead[]> {
    try {
      const where = status ? { status: status as LeadStatus } : {};
      return await this.prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit || 50,
        include: { notes: true },
      });
    } catch (error) {
      this.logger.error('Failed to get leads', (error as Error).message);
      return [];
    }
  }

  async getLeadById(id: string): Promise<LeadWithRelations | null> {
    try {
      return await this.prisma.lead.findUnique({
        where: { id },
        include: {
          notes: { orderBy: { createdAt: 'desc' } },
          activities: { orderBy: { createdAt: 'desc' } },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to get lead ${id}`, (error as Error).message);
      return null;
    }
  }

  async updateLeadStatus(id: string, status: string): Promise<Lead | null> {
    try {
      const updateData: Record<string, unknown> = {
        status: status as LeadStatus,
      };

      if (status === 'CONTACTED') {
        updateData.contactedAt = new Date();
      }

      const lead = await this.prisma.lead.update({
        where: { id },
        data: updateData,
      });

      await this.trackingService.recordEvent(id, 'status_changed', {
        newStatus: status,
      });

      this.logger.log(`Lead ${id} status updated to ${status}`);
      return lead;
    } catch (error) {
      this.logger.error(
        `Failed to update lead ${id} status`,
        (error as Error).message,
      );
      return null;
    }
  }

  async addNote(leadId: string, content: string): Promise<Note | null> {
    try {
      const note = await this.prisma.note.create({
        data: {
          id: uuid(),
          leadId,
          content,
        },
      });

      this.logger.log(`Note added to lead ${leadId}`);
      return note;
    } catch (error) {
      this.logger.error(
        `Failed to add note to lead ${leadId}`,
        (error as Error).message,
      );
      return null;
    }
  }

  async getStats(): Promise<LeadStats> {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - 7);

      const [total, todayCount, weekCount, leads, statusCounts] = await Promise.all([
        this.prisma.lead.count(),
        this.prisma.lead.count({ where: { createdAt: { gte: todayStart } } }),
        this.prisma.lead.count({ where: { createdAt: { gte: weekStart } } }),
        this.prisma.lead.findMany({
          select: { confidence: true, heatScore: true, category: true, status: true },
        }),
        this.prisma.lead.groupBy({
          by: ['status'],
          _count: { status: true },
        }),
      ]);

      const byStatus: Record<string, number> = {};
      for (const sc of statusCounts) {
        byStatus[sc.status] = sc._count.status;
      }

      const confidences = leads
        .filter((l) => l.confidence !== null)
        .map((l) => l.confidence as number);
      const avgConfidence =
        confidences.length > 0
          ? confidences.reduce((a, b) => a + b, 0) / confidences.length
          : 0;

      const avgHeatScore =
        leads.length > 0
          ? leads.reduce((a, l) => a + l.heatScore, 0) / leads.length
          : 0;

      const converted = leads.filter((l) => l.status === 'CONVERTED').length;
      const conversionRate = total > 0 ? (converted / total) * 100 : 0;

      const categoryMap = new Map<string, number>();
      for (const l of leads) {
        const cat = l.category || 'uncategorized';
        categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
      }
      const topCategories = Array.from(categoryMap.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        total,
        byStatus,
        todayCount,
        weekCount,
        avgConfidence: Math.round(avgConfidence * 100) / 100,
        avgHeatScore: Math.round(avgHeatScore),
        conversionRate: Math.round(conversionRate * 10) / 10,
        topCategories,
      };
    } catch (error) {
      this.logger.error('Failed to get stats', (error as Error).message);
      return {
        total: 0,
        byStatus: {},
        todayCount: 0,
        weekCount: 0,
        avgConfidence: 0,
        avgHeatScore: 0,
        conversionRate: 0,
        topCategories: [],
      };
    }
  }

  async getLeadsByDateRange(from: Date, to: Date): Promise<Lead[]> {
    try {
      return await this.prisma.lead.findMany({
        where: {
          createdAt: {
            gte: from,
            lte: to,
          },
        },
        orderBy: { createdAt: 'desc' },
        include: { notes: true },
      });
    } catch (error) {
      this.logger.error('Failed to get leads by date range', (error as Error).message);
      return [];
    }
  }

  private async processEmail(
    messageId: string,
    htmlBody: string,
    snippet: string,
  ): Promise<void> {
    const existing = await this.prisma.lead.findUnique({
      where: { emailMessageId: messageId },
    });
    if (existing) {
      this.logger.debug(`Email ${messageId} already processed, skipping`);
      return;
    }

    const parsed = this.gmailParser.parseFacebookNotification(htmlBody, snippet);
    if (!parsed.authorName) {
      this.logger.debug(`Could not parse author from email ${messageId}`);
      return;
    }

    const isBlacklisted = await this.checkBlacklist(parsed.authorName, parsed.profileUrl);
    if (isBlacklisted) {
      this.logger.log(`Skipping blacklisted author: ${parsed.authorName}`);
      return;
    }

    const passesKeywordFilter = this.keywordPreFilter(parsed.postText);
    if (!passesKeywordFilter) {
      this.logger.debug(
        `Post from ${parsed.authorName} did not pass keyword pre-filter`,
      );
      return;
    }

    const relevance = await this.checkAiRelevance(parsed);
    if (!relevance.isRelevant || relevance.confidence < this.minConfidence) {
      this.logger.debug(
        `Post from ${parsed.authorName} not relevant (confidence: ${relevance.confidence})`,
      );
      return;
    }

    let researchSummary: string | null = null;
    let trustScore = 0;
    let webAnalysis: string | null = null;
    let priceEstimate: string | null = null;
    let researchData: ResearchResult | null = null;

    try {
      const research = await this.runResearch(parsed);
      researchSummary = research.summary;
      trustScore = research.trustScore;
      webAnalysis = research.webAnalysis;
      priceEstimate = research.priceEstimate;
      researchData = research.researchData;
    } catch (error) {
      this.logger.warn(
        `Research failed for ${parsed.authorName}`,
        (error as Error).message,
      );
    }

    const learningInsights = await this.aiLearningService.getInsights();

    const aiResponse = await this.generateAiResponse(
      parsed,
      relevance.category,
      researchSummary,
      learningInsights,
    );

    const leadId = uuid();
    const messageVariant = `v${Math.floor(Math.random() * 3) + 1}`;

    const lead = await this.prisma.lead.create({
      data: {
        id: leadId,
        authorName: parsed.authorName,
        profileUrl: parsed.profileUrl || null,
        postUrl: parsed.postUrl || null,
        messengerUrl: parsed.messengerUrl || null,
        groupName: parsed.groupName || null,
        postSummary: parsed.postText || snippet,
        publicComment: aiResponse.publicComment,
        privateMessage: aiResponse.privateMessage,
        source: 'facebook',
        category: relevance.category,
        confidence: relevance.confidence,
        researchSummary,
        trustScore,
        webAnalysis,
        priceEstimate,
        heatScore: 10,
        status: LeadStatus.NEW,
        emailMessageId: messageId,
        rawEmailSnippet: snippet,
        messageVariant,
      },
    });

    await this.aiLearningService.recordMessagePerformance({
      leadId: lead.id,
      variant: messageVariant,
      messageType: 'initial_outreach',
      toneStyle: aiResponse.toneStyle,
      phraseUsed: aiResponse.keyPhrase,
      linkType: relevance.category,
    });

    await this.sendLeadTelegramNotifications(lead, parsed, relevance, aiResponse, researchData);

    this.logger.log(
      `New lead created: ${parsed.authorName} (category: ${relevance.category}, confidence: ${relevance.confidence})`,
    );
  }

  private keywordPreFilter(text: string): boolean {
    if (!text) return false;
    const lower = text.toLowerCase();
    return LEAD_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
  }

  private async checkBlacklist(
    authorName: string,
    profileUrl: string,
  ): Promise<boolean> {
    try {
      const blacklisted = await this.prisma.blacklist.findFirst({
        where: {
          OR: [
            { name: { equals: authorName, mode: 'insensitive' } },
            ...(profileUrl
              ? [{ profileUrl: { equals: profileUrl, mode: 'insensitive' as const } }]
              : []),
          ],
        },
      });
      return blacklisted !== null;
    } catch (error) {
      this.logger.error('Failed to check blacklist', (error as Error).message);
      return false;
    }
  }

  private async checkAiRelevance(
    parsed: FacebookNotification,
  ): Promise<AiRelevanceResult> {
    try {
      const systemPrompt = `Si AI asistent specializovany na analyzu Facebook prispevkov pre digitalnu agenturu.

Tvoja uloha je urcit, ci prispevok od potencialneho klienta je relevantny pre nasu agenturu.

Nasa agentura ponuka:
- Tvorba webovych stranok a e-shopov
- Webdizajn a redizajn
- Graficky dizajn (loga, branding)
- Online marketing (SEO, PPC, socialne siete)
- Vyvoj aplikacii a softveru
- Automatizacia procesov

Kategorie leadov:
- "web" — hlada tvorbu webstranky alebo e-shopu
- "design" — hlada graficky dizajn, logo, branding
- "marketing" — hlada online marketing, SEO, reklamu
- "app" — hlada vyvoj aplikacie alebo softveru
- "consulting" — hlada poradenstvo v digitalnej oblasti
- "other" — ine relevantne poptavky

Odpoved v JSON formate:
{
  "isRelevant": true/false,
  "confidence": 0.0-1.0,
  "category": "web|design|marketing|app|consulting|other",
  "reasoning": "kratke zdovodnenie"
}

Bud prisny — oznac ako relevantne len prispevky, kde autor jasne hlada sluzby ktore ponukame.
Ignoruj prispevky ktore su len diskusia, zdielanie clankov, alebo nesuvisiace otazky.`;

      const userMessage = `Analyzuj tento Facebook prispevok:

Autor: ${parsed.authorName}
Skupina: ${parsed.groupName || 'N/A'}
Text prispevku: ${parsed.postText}`;

      const result = await this.aiService.generateJson<AiRelevanceResult>(
        systemPrompt,
        userMessage,
      );

      return result;
    } catch (error) {
      this.logger.error(
        'AI relevance check failed',
        (error as Error).message,
      );
      return {
        isRelevant: false,
        confidence: 0,
        category: 'other',
        reasoning: 'AI analysis failed',
      };
    }
  }

  private async runResearch(
    parsed: FacebookNotification,
  ): Promise<{
    summary: string | null;
    trustScore: number;
    webAnalysis: string | null;
    priceEstimate: string | null;
    researchData: ResearchResult | null;
  }> {
    try {
      const result = await this.researchService.runResearch(
        parsed.authorName,
        parsed.profileUrl,
      );

      const summaryParts: string[] = [];
      if (result.company.found) {
        summaryParts.push(`Firma: ${result.company.companyName} (IČO: ${result.company.ico})`);
        if (result.company.foundingDate) summaryParts.push(`Založená: ${result.company.foundingDate}`);
      }
      if (result.finstatData.found) {
        if (result.finstatData.revenue) summaryParts.push(`Obrat: ${result.finstatData.revenue}€`);
        if (result.finstatData.employeeCount) summaryParts.push(`Zamestnanci: ${result.finstatData.employeeCount}`);
      }
      if (result.googleSearch.linkedInUrl) summaryParts.push(`LinkedIn: ${result.googleSearch.linkedInUrl}`);
      if (result.googleSearch.websiteUrl) summaryParts.push(`Web: ${result.googleSearch.websiteUrl}`);

      let webAnalysisSummary: string | null = null;
      if (result.webAnalysis) {
        const wa = result.webAnalysis;
        webAnalysisSummary = [
          `Mobile: ${wa.mobileResponsive ? '✅' : '❌'}`,
          wa.loadTimeSeconds ? `Rýchlosť: ${wa.loadTimeSeconds}s` : null,
          wa.hasSSL ? 'SSL: ✅' : 'SSL: ❌',
          wa.designAssessment ? `Dizajn: ${wa.designAssessment}` : null,
        ].filter(Boolean).join(' | ');
      }

      const priceEstimate = await this.generatePriceEstimate(parsed, result);

      return {
        summary: summaryParts.length > 0 ? summaryParts.join('\n') : null,
        trustScore: result.trustScore.score,
        webAnalysis: webAnalysisSummary,
        priceEstimate,
        researchData: result,
      };
    } catch (error) {
      this.logger.warn('Research failed', (error as Error).message);
      return {
        summary: null,
        trustScore: 0,
        webAnalysis: null,
        priceEstimate: null,
        researchData: null,
      };
    }
  }

  private async generatePriceEstimate(
    parsed: FacebookNotification,
    research: ResearchResult,
  ): Promise<string | null> {
    try {
      const result = await this.aiService.generateJson<{
        estimate: string;
        type: string;
        affordable: boolean;
      }>(
        `Na základe typu požiadavky a informácií o klientovi odhadni cenový rozsah.

Kategórie:
- Jednoduchý web (landing page): 500-1000€
- Firemný web (5-10 podstránok): 1500-3000€
- E-shop (WooCommerce/Shopify): 2000-5000€
- Customný web/aplikácia: 3000-10000€
- PPC setup + manažment: 300-800€/mesiac
- SEO audit + optimalizácia: 500-2000€

Zohľadni obrat klienta — ak je vysoký, cenový rozsah môže byť vyšší.
Odpovedz JSON: {"estimate":"1500-3000€","type":"Firemný web (redesign)","affordable":true}`,
        `Požiadavka: ${parsed.postText}
Obrat firmy: ${research.finstatData.revenue || 'neznámy'}
Firma: ${research.company.companyName || 'neznáma'}
Súčasný web: ${research.googleSearch.websiteUrl || 'nemá'}`,
      );

      return `${result.estimate} (${result.type})`;
    } catch (error) {
      this.logger.warn('Price estimate failed', (error as Error).message);
      return null;
    }
  }

  private async generateAiResponse(
    parsed: FacebookNotification,
    category: string,
    researchSummary: string | null,
    learningInsights?: { topPhrases: string[]; avoidPhrases: string[]; recommendedTone: string; builderConversionRate: number; bookingConversionRate: number },
  ): Promise<AiResponseResult> {
    try {
      const trackingLink = this.buildDynamicLink(category);

      let learningContext = '';
      if (learningInsights && learningInsights.topPhrases.length > 0) {
        learningContext = `

HISTORICKE DATA (pouzi na optimalizaciu tonu):
- Najuspesnejsie frazy: ${learningInsights.topPhrases.join(', ') || 'zatial nedostatok dat'}
- Frazy s nizkou konverziou: ${learningInsights.avoidPhrases.join(', ') || 'zatial nedostatok dat'}
- Odporucany ton: ${learningInsights.recommendedTone}
- Builder link konverzia: ${learningInsights.builderConversionRate}%
- Booking link konverzia: ${learningInsights.bookingConversionRate}%`;
      }

      const systemPrompt = `Si skuseny obchodnik digitalnej agentury. Generujes odpovede na Facebook prispevky potencialnych klientov.

PRAVIDLA:
1. Pis v slovencine, priatelsky ale profesionalne
2. Nepouzivaj emoji nadmerne — max 1-2 na spravu
3. Nebud agresivne predajny, bud naturally helpful
4. Uved konkretny priklad alebo referenciu ak je to relevantne
5. Sprava musi byt kratka a k veci — max 3-4 vety

VYSTUP v JSON formate:
{
  "publicComment": "verejny komentar pod prispevok — 1-2 vety, priatelsky, s hodnotou, bez priameho predaja",
  "privateMessage": "sukromna sprava cez Messenger — 2-4 vety, osobnejsia, s konkretnym navrhom a linkom",
  "toneStyle": "typ tonu pouziteho v sprave (napr. helpful, casual, expert, empathetic)",
  "keyPhrase": "klucova fraza pouzita v sprave"
}

DYNAMICKY LINK na vlozenie do sukromnej spravy: ${trackingLink}
Tento link vloz prirodzene do sukromnej spravy ako odkaz na portfolio/ukazku/formular.${learningContext}`;

      const userMessage = `Vygeneruj odpovede pre tento lead:

Meno: ${parsed.authorName}
Skupina: ${parsed.groupName || 'N/A'}
Kategoria: ${category}
Prispevok: ${parsed.postText}
${researchSummary ? `Research: ${researchSummary}` : ''}`;

      const result = await this.aiService.generateJson<AiResponseResult>(
        systemPrompt,
        userMessage,
      );

      return result;
    } catch (error) {
      this.logger.error(
        'AI response generation failed',
        (error as Error).message,
      );
      return {
        publicComment: '',
        privateMessage: '',
        toneStyle: 'neutral',
        keyPhrase: '',
      };
    }
  }

  private buildDynamicLink(category: string): string {
    const linkMap: Record<string, string> = {
      web: `${this.appUrl}/builder`,
      design: `${this.appUrl}/portfolio/design`,
      marketing: `${this.appUrl}/marketing-audit`,
      app: `${this.appUrl}/builder`,
      consulting: `${this.appUrl}/booking`,
      other: `${this.appUrl}/booking`,
    };
    return linkMap[category] || `${this.appUrl}/booking`;
  }

  private async sendLeadTelegramNotifications(
    lead: Lead,
    parsed: FacebookNotification,
    relevance: AiRelevanceResult,
    aiResponse: AiResponseResult,
    researchData: ResearchResult | null,
  ): Promise<void> {
    try {
      const shortId = lead.id.substring(0, 8);

      // MESSAGE 1 — Lead Info + Research
      let message1 =
        `🔥 ${bold('Nový lead z FB skupiny')}\n\n` +
        `👤 ${lead.authorName}\n` +
        `📊 Trust: ${lead.trustScore}% | 🔥 Heat: ${lead.heatScore}/100\n` +
        `📂 Kategória: ${relevance.category}\n`;

      if (researchData) {
        message1 += `\n🔍 ${bold('RESEARCH:')}\n`;
        message1 += `🏢 Firma: ${researchData.company.companyName || 'nenájdená'}\n`;
        message1 += `🔢 IČO: ${researchData.company.ico || 'N/A'}\n`;
        message1 += `💰 Obrat: ${researchData.finstatData.revenue ? `${researchData.finstatData.revenue}€` : 'N/A'}\n`;
        message1 += `🌐 Web: ${researchData.googleSearch.websiteUrl || 'nenájdený'}\n`;
        message1 += `💼 LinkedIn: ${researchData.googleSearch.linkedInUrl || 'nenájdený'}\n`;
        message1 += `📱 Facebook: ${researchData.profileUrl ? '✅' : '❌'}\n`;
        message1 += `📅 Firma založená: ${researchData.company.foundingDate || 'N/A'}\n`;

        if (researchData.webAnalysis) {
          const wa = researchData.webAnalysis;
          message1 += `\n🌐 ${bold('WEB ANALÝZA:')}\n`;
          message1 += `📱 Mobile: ${wa.mobileResponsive ? '✅' : '❌'}\n`;
          if (wa.loadTimeSeconds) message1 += `⚡ Rýchlosť: ${wa.loadTimeSeconds}s\n`;
          message1 += `🔒 SSL: ${wa.hasSSL ? '✅' : '❌'}\n`;
          if (wa.designAssessment) message1 += `🎨 Dizajn: ${wa.designAssessment}\n`;
          if (wa.seoIssues?.length) message1 += `🔍 SEO: ${wa.seoIssues.length} problém(ov)\n`;
          if (wa.recommendation) message1 += `💡 ${wa.recommendation}\n`;
        }
      }

      if (lead.priceEstimate) {
        message1 += `\n💶 Cenový odhad: ${lead.priceEstimate}\n`;
      }

      message1 +=
        `\n📝 ${bold('Príspevok:')}\n"${truncate(lead.postSummary, 400)}"\n`;

      if (lead.postUrl) message1 += `\n🔗 FB príspevok: ${lead.postUrl}\n`;
      if (lead.messengerUrl) message1 += `💬 Messenger: ${lead.messengerUrl}\n`;

      message1 += `\n🆔 #lead_${shortId}`;

      const keyboard1 = new InlineKeyboard()
        .text('✅ Kontaktovaný', `lead_contact_${lead.id}`)
        .text('❌ Ignorovať', `lead_reject_${lead.id}`)
        .row()
        .text('📊 Viac info', `lead_detail_${lead.id}`)
        .text('🚫 Blacklist', `lead_blacklist_${lead.id}`);

      await this.telegramService.sendWithKeyboard(
        this.telegramService.getOwnerChatId(),
        message1,
        keyboard1,
      );

      // MESSAGE 2 — Public Comment
      if (aiResponse.publicComment) {
        const message2 =
          `💬 Komentár pre: ${lead.authorName}\n` +
          `━━━━━━━━━━━━━━━━━\n` +
          `${aiResponse.publicComment}\n` +
          `━━━━━━━━━━━━━━━━━`;

        const keyboard2 = new InlineKeyboard()
          .text('📋 Kopírovať text', `lead_copy_comment_${lead.id}`);

        await this.telegramService.sendWithKeyboard(
          this.telegramService.getOwnerChatId(),
          message2,
          keyboard2,
        );
      }

      // MESSAGE 3 — Private Message
      if (aiResponse.privateMessage) {
        const message3 =
          `✉️ Správa pre: ${lead.authorName}\n` +
          `━━━━━━━━━━━━━━━━━\n` +
          `${aiResponse.privateMessage}\n` +
          `━━━━━━━━━━━━━━━━━`;

        const keyboard3 = new InlineKeyboard()
          .text('📋 Kopírovať text', `lead_copy_message_${lead.id}`);

        await this.telegramService.sendWithKeyboard(
          this.telegramService.getOwnerChatId(),
          message3,
          keyboard3,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to send Telegram notifications for lead ${lead.id}`,
        (error as Error).message,
      );
    }
  }
}
