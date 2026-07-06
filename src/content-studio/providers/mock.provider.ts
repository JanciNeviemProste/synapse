import { Injectable } from '@nestjs/common';
import {
  ComplianceResult,
  ContentPillarsOutput,
  ExtractedIdeas,
  GeneratedContentPlan,
  GeneratedScripts,
  InspirationPatterns,
  InterviewBrief,
  ScriptReview,
  StyleMemoryAnalysis,
} from '../schemas/ai-output.schemas';
import {
  BrandContext,
  ComplianceInput,
  ComplianceProvider,
  ContentPillarInput,
  ContentPlanInput,
  ContentStrategyInput,
  ContentStrategyProvider,
  CreateRealtimeSessionInput,
  InspirationAnalysisInput,
  RealtimeSessionToken,
  RealtimeVoiceProvider,
  ScriptGenerationInput,
  ScriptGenerationProvider,
  ScriptReviewInput,
  ScriptReviewProvider,
  StyleMemoryInput,
  TranscriptionInput,
  TranscriptionProvider,
  TranscriptionResult,
} from './provider.interfaces';

/**
 * Mock provider — deterministic Slovak sample data so the whole module
 * works without any paid API key (spec principle 18). Outputs are valid
 * against the Zod schemas (covered by unit tests).
 */
@Injectable()
export class MockContentProvider
  implements
    ContentStrategyProvider,
    ScriptGenerationProvider,
    ScriptReviewProvider,
    ComplianceProvider,
    TranscriptionProvider,
    RealtimeVoiceProvider
{
  async extractIdeas(input: ContentStrategyInput): Promise<ExtractedIdeas> {
    const topic = input.rawText.slice(0, 60) || 'finančné chyby klientov';
    return {
      mainTopic: `[MOCK] ${topic}`,
      clientProblem: 'Klient má tri poistky, ale žiadna nekryje výpadok príjmu.',
      keyLesson: 'Počet zmlúv nie je to isté ako reálne krytie rizika.',
      openQuestions: ['Koľko klient platí mesačne?', 'Kto mu zmluvy nastavil?'],
      ideas: [
        {
          title: '3 poistky a aj tak bez krytia',
          description: 'Príbeh klienta, ktorý platil tri poistky zbytočne.',
          keyMessage: 'Poistka bez analýzy potrieb je len výdavok.',
          suggestedGoal: 'Trust building',
          suggestedHook: 'Platil 87 € mesačne za tri poistky. Kryli ho na... nič.',
          suggestedCta: 'Napíš mi „AUDIT" a pozriem sa na tvoje zmluvy.',
          suggestedFormats: ['Príbeh klienta', 'Mýtus vs. realita'],
          targetAudience: 'Ľudia 30–45 s existujúcimi poistkami',
        },
        {
          title: 'Najčastejšia chyba pri poistení príjmu',
          description: 'Edukačné video o krytí výpadku príjmu.',
          keyMessage: 'Najprv kryť príjem, potom majetok.',
          suggestedGoal: 'Education',
          suggestedHook: 'Toto ti poisťovák pri podpise nepovedal.',
          suggestedCta: 'Ulož si to, kým to nebudeš potrebovať.',
          suggestedFormats: ['Jedna rada za 30 sekúnd'],
          targetAudience: 'Živnostníci a rodiny s hypotékou',
        },
        {
          title: 'Ako si skontrolovať poistku za 5 minút',
          description: 'Krok za krokom kontrola vlastnej zmluvy.',
          keyMessage: 'Tri veci, ktoré si vieš skontrolovať sám.',
          suggestedGoal: 'Lead generation',
          suggestedHook: 'Vytiahni svoju poistku. Ideme na to spolu.',
          suggestedCta: 'Nevieš sa v tom vyznať? Napíš mi.',
          suggestedFormats: ['Krok za krokom'],
          targetAudience: 'Všetci s uzavretou životnou poistkou',
        },
      ],
    };
  }

  async createContentPillars(input: ContentPillarInput): Promise<ContentPillarsOutput> {
    const existing = new Set(input.existingPillars.map((p) => p.toLowerCase()));
    const all = [
      { name: 'Životné poistenie', description: '[MOCK] Krytie rizík a príjmu', priority: 8, targetFrequency: '1x týždenne', complianceNotes: '' },
      { name: 'Hypotéky', description: '[MOCK] Financovanie bývania', priority: 7, targetFrequency: '1x týždenne', complianceNotes: '' },
      { name: 'Finančné chyby', description: '[MOCK] Chyby z praxe a ako sa im vyhnúť', priority: 9, targetFrequency: '2x týždenne', complianceNotes: '' },
      { name: 'Príbehy z praxe', description: '[MOCK] Anonymizované príbehy klientov', priority: 8, targetFrequency: '1x týždenne', complianceNotes: 'Anonymizovať údaje klientov' },
      { name: 'Budovanie dôvery', description: '[MOCK] Osobná značka a zákulisie', priority: 6, targetFrequency: '1x za 2 týždne', complianceNotes: '' },
    ];
    return { pillars: all.filter((p) => !existing.has(p.name.toLowerCase())) };
  }

  async createContentPlan(input: ContentPlanInput): Promise<GeneratedContentPlan> {
    const start = new Date(input.startDate);
    const end = new Date(input.endDate);
    const days = Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / 86_400_000),
    );
    const total = Math.max(1, Math.round((days / 7) * input.postsPerWeek));
    const pillars = input.pillars.length
      ? input.pillars
      : ['Finančné chyby', 'Príbehy z praxe', 'Životné poistenie'];
    const goals = input.goals.length
      ? input.goals
      : ['Education', 'Trust building', 'Lead generation'];

    const items = Array.from({ length: Math.min(total, 31) }, (_, i) => {
      const date = new Date(start.getTime() + Math.floor((i * days) / total) * 86_400_000);
      return {
        scheduledDate: date.toISOString().slice(0, 10),
        workingTitle: `[MOCK] Reel #${i + 1}: ${pillars[i % pillars.length]}`,
        topic: pillars[i % pillars.length],
        pillar: pillars[i % pillars.length],
        goal: goals[i % goals.length],
        targetAudience: 'Ľudia 30–45 riešiaci financie',
        template: 'Jedna rada za 30 sekúnd',
        length: 'Short: 20–35 sekúnd',
        style: 'Conversational',
        emotion: 'Confident',
        suggestedHook: 'Toto ti nikto pri podpise nepovie.',
        cta: 'Sleduj pre viac praktických rád.',
      };
    });

    return {
      name: `[MOCK] Content plán ${input.startDate} – ${input.endDate}`,
      items,
      notes: ['Mock plán — vygenerované bez AI volania.'],
    };
  }

  async buildInterviewBrief(
    transcript: string,
    _brand?: BrandContext,
  ): Promise<InterviewBrief> {
    const ideas = (await this.extractIdeas({ rawText: transcript, sourceType: 'ai_interview' }))
      .ideas;
    return {
      summary: `[MOCK] Brief z rozhovoru (${transcript.length} znakov prepisu).`,
      keyThoughts: ['Klienti podceňujú krytie príjmu', 'Príbehy fungujú lepšie ako poučky'],
      ideas,
      suggestedPillars: ['Finančné chyby', 'Príbehy z praxe'],
      missingInformation: ['Konkrétne čísla pre príklad'],
      warnings: ['Skontrolovať anonymizáciu klienta'],
      uncertainty: ['Cieľová skupina odhadnutá z kontextu'],
    };
  }

  private static readonly INTERVIEW_QUESTIONS = [
    'Čo sa dnes stalo — o čom by si chcel natočiť video?',
    'Aká bola najväčšia chyba alebo prekvapenie v tej situácii?',
    'Kto presne by mal to video vidieť?',
    'Čo sa má divák naučiť alebo urobiť po pozretí?',
    'Je tam niečo citlivé, čo treba anonymizovať?',
  ];

  async nextInterviewQuestion(
    history: import('./provider.interfaces').InterviewTurn[],
  ): Promise<import('./provider.interfaces').InterviewNextQuestion> {
    const askedCount = history.filter((t) => t.role === 'ai').length;
    if (askedCount >= MockContentProvider.INTERVIEW_QUESTIONS.length) {
      return { question: '', done: true, reason: '[MOCK] Mám dosť informácií na brief.' };
    }
    return {
      question: `[MOCK] ${MockContentProvider.INTERVIEW_QUESTIONS[askedCount]}`,
      done: false,
      reason: '[MOCK] Zbieram kontext.',
    };
  }

  async analyzeInspiration(
    input: InspirationAnalysisInput,
  ): Promise<InspirationPatterns> {
    return {
      patterns: [
        { category: 'hook_style', pattern: '[MOCK] Krátka osobná otázka v prvej sekunde', note: `Zdroj: ${input.title}` },
        { category: 'structure', pattern: '[MOCK] Problém → príklad → riešenie → CTA', note: '' },
        { category: 'pacing', pattern: '[MOCK] Strih každé 2–3 sekundy', note: '' },
      ],
    };
  }

  async analyzeStyle(_input: StyleMemoryInput): Promise<StyleMemoryAnalysis> {
    return {
      preferences: [
        { preferenceType: 'sentence_length', preferenceValue: '[MOCK] Kratšie vety, max ~10 slov', confidence: 0.6 },
        { preferenceType: 'tone', preferenceValue: '[MOCK] Menej formálne, viac priamo', confidence: 0.5 },
      ],
    };
  }

  async generateScripts(input: ScriptGenerationInput): Promise<GeneratedScripts> {
    const topic = input.topic || 'finančné chyby';
    const mk = (versionName: string, hook: string, angle: string) => ({
      versionName,
      strategy: {
        workingTitle: `[MOCK ${versionName}] ${topic}`,
        goal: input.goal || 'Education',
        targetAudience: input.targetAudience || 'Ľudia 30–45',
        contentPillar: 'Finančné chyby',
        recommendedLength: input.length || 'Short: 20–35 sekúnd',
        recommendedStyle: input.style || 'Conversational',
        recommendedEmotion: input.emotion || 'Confident',
        template: input.template?.name || 'Jedna rada za 30 sekúnd',
        contentAngle: angle,
        angleReason: 'Mock zdôvodnenie uhla pohľadu.',
      },
      hook,
      setup: 'Minulý týždeň mi klient ukázal svoje zmluvy.',
      mainMessage: `Hlavná myšlienka k téme „${topic}": dôležité je krytie, nie počet zmlúv.`,
      keyInsight: 'Analýza potrieb pred podpisom šetrí tisíce eur.',
      cta: input.cta || 'Sleduj pre viac praktických rád.',
      spokenScript: `${hook} Minulý týždeň mi klient ukázal tri poistky. Platil 87 eur mesačne. A keď sme si prešli krytie? Výpadok príjmu — nula. Presne to, čo živí jeho rodinu, nemal kryté. ${input.cta || 'Ak si nie si istý svojou zmluvou, napíš mi.'}`,
      productionPlan: {
        estimatedDurationSeconds: 30,
        scenes: [
          { description: 'Talking head, detail na tvár', onScreenText: hook, brollSuggestion: 'Detail zmlúv na stole', deliveryNote: 'Pomaly, s pauzou po hooku' },
          { description: 'Talking head, mierny zoom', onScreenText: '87 € mesačne', brollSuggestion: '', deliveryNote: 'Zrýchliť tempo' },
        ],
        pacingNotes: 'Strih každé 2–3 sekundy.',
        pauses: ['po hooku', 'pred CTA'],
        emphasizedWords: ['nula', 'krytie'],
      },
      instagramAssets: {
        caption: `[MOCK] ${topic} — na čo si dať pozor. #financie`,
        shortCaption: '[MOCK] Toto si skontroluj vo svojej poistke.',
        thumbnailText: '3 poistky, 0 krytia',
        firstComment: 'Aké máš skúsenosti s poistkami? 👇',
        ctaText: input.cta || 'Napíš mi „AUDIT".',
        hashtags: ['financie', 'poistenie', 'slovensko'],
        alternativeHooks: ['Toto ti poisťovák nepovie.', 'Platíš za poistku, ktorá ťa nekryje?'],
        alternativeTitles: ['Poistka, ktorá nekryje nič', 'Audit poistiek za 30 sekúnd'],
      },
      safety: {
        factualUncertainty: ['Suma 87 € je ilustračná'],
        complianceRisks: [],
        recommendedDisclaimer: 'Nejde o finančné poradenstvo; konkrétne riešenie závisí od individuálnej situácie.',
        sensitiveInfoWarnings: ['Neuvádzať skutočné meno klienta'],
        claimsToVerify: [],
        sourceReferences: [],
      },
    });

    return {
      variants: [
        mk('A', 'Platil 87 € mesačne za tri poistky. Krytie? Takmer žiadne.', 'Čistý profesionálny výklad'),
        mk('B', 'Klient sadol oproti mne a položil na stôl tri zmluvy.', 'Storytelling — príbeh klienta'),
        mk('C', 'Toto ti poisťovák pri podpise nikdy nepovie.', 'Najsilnejší hook — curiosity gap'),
      ],
    };
  }

  async reviewScript(_input: ScriptReviewInput): Promise<ScriptReview> {
    return {
      scores: {
        hookStrength: 7, clarity: 8, naturalSpeech: 7, audienceRelevance: 8,
        trust: 7, brandDnaMatch: 6, ctaQuality: 6, retentionPotential: 7,
        originality: 6, complianceSafety: 8, overall: 7,
      },
      strengths: ['[MOCK] Konkrétny príklad s číslom', 'Jasná štruktúra'],
      weaknesses: ['[MOCK] CTA je generické'],
      suggestedImprovements: ['Pridať konkrétnejšie CTA s jedným krokom'],
      confusingSentences: [],
      genericLanguage: ['„praktické rady"'],
      unsupportedClaims: [],
      complianceWarnings: [],
      improvedHook: '[MOCK] 87 eur mesačne. Tri poistky. Nulové krytie príjmu.',
      improvedCta: '[MOCK] Napíš mi slovo AUDIT a pozriem sa na tvoje zmluvy zadarmo.',
    };
  }

  async checkContent(input: ComplianceInput): Promise<ComplianceResult> {
    const text = input.content.toLowerCase();
    const risky = /garantovan|zaručen|bez rizika|stopercentn/.test(text);
    return {
      riskLevel: risky ? 'high' : 'low',
      findings: risky ? ['[MOCK] Obsah naznačuje garanciu výsledku'] : [],
      requiredDisclaimers: ['Nejde o finančné poradenstvo.'],
      blockedClaims: risky ? ['garancia výnosu'] : [],
      notes: '[MOCK] Kontrola prebehla v mock móde.',
    };
  }

  async transcribeAudio(input: TranscriptionInput): Promise<TranscriptionResult> {
    const name = input.filePath?.split(/[\\/]/).pop() || `in-memory ${input.mimeType}`;
    return {
      text: `[MOCK PREPIS] Audio (${name}) — tu by bol skutočný prepis. Dnes som riešil klienta, ktorý mal tri poistky, ale ani jedna mu dobre nekryla výpadok príjmu.`,
      language: 'sk',
      durationSeconds: 42,
      segments: [
        { startMs: 0, endMs: 21000, text: '[MOCK] Prvá polovica prepisu.' },
        { startMs: 21000, endMs: 42000, text: '[MOCK] Druhá polovica prepisu.' },
      ],
    };
  }

  /** Real WebRTC voice can't run against a mock — UI falls back to text interview. */
  isAvailable(): boolean {
    return false;
  }

  async createSessionToken(
    _input: CreateRealtimeSessionInput,
  ): Promise<RealtimeSessionToken> {
    return {
      token: 'mock-realtime-token',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      model: 'mock-realtime',
      provider: 'mock',
    };
  }
}
