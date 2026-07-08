import { Injectable } from '@nestjs/common';
import {
  BrandExtraction,
  ComplianceResult,
  ContentPillarsOutput,
  DocumentClassification,
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
  BrandExtractionProvider,
  ComplianceInput,
  ComplianceProvider,
  ContentPillarInput,
  ContentPlanInput,
  ContentStrategyInput,
  ContentStrategyProvider,
  CreateRealtimeSessionInput,
  DocumentClassificationProvider,
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
    RealtimeVoiceProvider,
    DocumentClassificationProvider,
    BrandExtractionProvider
{
  async extractIdeas(input: ContentStrategyInput): Promise<ExtractedIdeas> {
    const topic = input.rawText.slice(0, 60) || 'tvoja téma';
    return {
      mainTopic: `[MOCK] ${topic}`,
      clientProblem: 'Zákazník nevie, ako si vybrať medzi možnosťami, ktoré ponúkaš.',
      keyLesson: 'Konkrétny príklad z praxe presvedčí viac než všeobecné tvrdenie.',
      openQuestions: ['Kto je typický zákazník?', 'Aký výsledok očakáva?'],
      ideas: [
        {
          title: 'Najčastejšia chyba, ktorú vidím u zákazníkov',
          description: 'Edukačné video o častej chybe v tvojom obore a ako sa jej vyhnúť.',
          keyMessage: 'Malá zmena prístupu ušetrí zákazníkovi čas aj peniaze.',
          suggestedGoal: 'Education',
          suggestedHook: 'Túto chybu robí 8 z 10 ľudí a ani o nej nevedia.',
          suggestedCta: 'Ulož si to, kým to budeš potrebovať.',
          suggestedFormats: ['3 najčastejšie chyby', 'Jedna rada za 30 sekúnd'],
          targetAudience: 'Tvoji potenciálni zákazníci',
        },
        {
          title: 'Príbeh spokojného zákazníka',
          description: 'Anonymizovaný príbeh: východisková situácia → čo si urobil → výsledok.',
          keyMessage: 'Ukáž reálny výsledok, nie sľuby.',
          suggestedGoal: 'Trust building',
          suggestedHook: 'Prišiel za mnou s problémom, ktorý poznáš aj ty.',
          suggestedCta: 'Chceš podobný výsledok? Napíš mi.',
          suggestedFormats: ['Príbeh klienta', 'Mini prípadová štúdia'],
          targetAudience: 'Ľudia zvažujúci tvoju službu',
        },
        {
          title: 'Rýchly tip za 30 sekúnd',
          description: 'Jedna okamžite použiteľná rada z tvojej praxe.',
          keyMessage: 'Daj hodnotu zadarmo — dôvera príde sama.',
          suggestedGoal: 'Lead generation',
          suggestedHook: 'Jedna vec, ktorú sprav ešte dnes.',
          suggestedCta: 'Sleduj pre viac praktických tipov.',
          suggestedFormats: ['Jedna rada za 30 sekúnd'],
          targetAudience: 'Všetci, ktorých téma zaujíma',
        },
      ],
    };
  }

  async createContentPillars(input: ContentPillarInput): Promise<ContentPillarsOutput> {
    const existing = new Set(input.existingPillars.map((p) => p.toLowerCase()));
    const all = [
      { name: 'Tipy a rady', description: '[MOCK] Praktické rady z tvojho oboru', priority: 9, targetFrequency: '2x týždenne', complianceNotes: '' },
      { name: 'Príbehy zákazníkov', description: '[MOCK] Anonymizované príbehy z praxe', priority: 8, targetFrequency: '1x týždenne', complianceNotes: 'Anonymizovať údaje zákazníkov' },
      { name: 'Za zákulisím', description: '[MOCK] Ako to u teba funguje, osobná značka', priority: 6, targetFrequency: '1x za 2 týždne', complianceNotes: '' },
      { name: 'Časté otázky', description: '[MOCK] Odpovede na opakujúce sa otázky', priority: 7, targetFrequency: '1x týždenne', complianceNotes: '' },
      { name: 'Novinky a inšpirácia', description: '[MOCK] Novinky v obore a inšpiratívny obsah', priority: 5, targetFrequency: '1x za 2 týždne', complianceNotes: '' },
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
      : ['Tipy a rady', 'Príbehy zákazníkov', 'Časté otázky'];
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
        targetAudience: 'Tvoji potenciálni zákazníci',
        template: 'Jedna rada za 30 sekúnd',
        length: 'Short: 20–35 sekúnd',
        style: 'Conversational',
        emotion: 'Confident',
        suggestedHook: 'Toto ti o tejto téme nikto nepovie.',
        cta: 'Sleduj pre viac praktických tipov.',
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
      keyThoughts: ['Zákazníci ocenia konkrétne príklady', 'Príbehy fungujú lepšie ako poučky'],
      ideas,
      suggestedPillars: ['Tipy a rady', 'Príbehy zákazníkov'],
      missingInformation: ['Konkrétne čísla pre príklad'],
      warnings: ['Skontrolovať anonymizáciu zákazníka'],
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

  async classifyDocument(
    _fileName: string,
    _textExcerpt: string,
  ): Promise<DocumentClassification> {
    return { category: 'iné (mock)' };
  }

  async extractBrandFields(_textExcerpt: string): Promise<BrandExtraction> {
    return {
      brandName: '[MOCK] Značka',
      industry: '',
      targetAudience: '',
      communicationStyle: '',
      preferredPhrases: [],
      forbiddenPhrases: [],
      requiredCtas: [],
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
    const topic = input.topic || 'tvoja téma';
    const mk = (versionName: string, hook: string, angle: string) => ({
      versionName,
      strategy: {
        workingTitle: `[MOCK ${versionName}] ${topic}`,
        goal: input.goal || 'Education',
        targetAudience: input.targetAudience || 'Tvoji potenciálni zákazníci',
        contentPillar: 'Tipy a rady',
        recommendedLength: input.length || 'Short: 20–35 sekúnd',
        recommendedStyle: input.style || 'Conversational',
        recommendedEmotion: input.emotion || 'Confident',
        template: input.template?.name || 'Jedna rada za 30 sekúnd',
        contentAngle: angle,
        angleReason: 'Mock zdôvodnenie uhla pohľadu.',
      },
      hook,
      setup: 'Minulý týždeň sa ma na to spýtal jeden zákazník.',
      mainMessage: `Hlavná myšlienka k téme „${topic}": konkrétny príklad povie viac než teória.`,
      keyInsight: 'Keď ukážeš reálny výsledok, dôvera príde sama.',
      cta: input.cta || 'Sleduj pre viac praktických tipov.',
      spokenScript: `${hook} Minulý týždeň sa ma na to spýtal zákazník. Ukázal som mu jednoduchý postup a za pár minút mal jasno. Presne toto trápi väčšinu ľudí — a pritom je to riešiteľné. ${input.cta || 'Ak riešiš to isté, napíš mi.'}`,
      productionPlan: {
        estimatedDurationSeconds: 30,
        scenes: [
          { description: 'Talking head, detail na tvár', onScreenText: hook, brollSuggestion: 'Detail na tvoju prácu/produkt', deliveryNote: 'Pomaly, s pauzou po hooku' },
          { description: 'Talking head, mierny zoom', onScreenText: 'Krok za krokom', brollSuggestion: '', deliveryNote: 'Zrýchliť tempo' },
        ],
        pacingNotes: 'Strih každé 2–3 sekundy.',
        pauses: ['po hooku', 'pred CTA'],
        emphasizedWords: ['jednoducho', 'výsledok'],
      },
      instagramAssets: {
        caption: `[MOCK] ${topic} — na čo si dať pozor.`,
        shortCaption: '[MOCK] Toto si vyskúšaj ešte dnes.',
        thumbnailText: 'Rýchly tip',
        firstComment: 'Aké máš s tým skúsenosti? 👇',
        ctaText: input.cta || 'Napíš mi do správ.',
        hashtags: ['tipy', 'obsah', 'slovensko'],
        alternativeHooks: ['Toto ti o tejto téme nikto nepovie.', 'Robíš to aj ty takto?'],
        alternativeTitles: ['Rýchly tip za 30 sekúnd', 'Najčastejšia chyba v obore'],
      },
      safety: {
        factualUncertainty: ['Príklad je ilustračný'],
        complianceRisks: [],
        recommendedDisclaimer: 'Konkrétny výsledok závisí od individuálnej situácie.',
        sensitiveInfoWarnings: ['Neuvádzať skutočné meno zákazníka'],
        claimsToVerify: [],
        sourceReferences: [],
      },
    });

    return {
      variants: [
        mk('A', 'Túto chybu robí 8 z 10 ľudí a ani o nej nevedia.', 'Čistý profesionálny výklad'),
        mk('B', 'Zákazník sa posadil oproti mne a povedal jednu vetu.', 'Storytelling — príbeh zákazníka'),
        mk('C', 'Toto ti o tejto téme nikto nepovie.', 'Najsilnejší hook — curiosity gap'),
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
      improvedHook: '[MOCK] Túto chybu robí 8 z 10 ľudí — a stojí ich to čas aj peniaze.',
      improvedCta: '[MOCK] Napíš mi do správ a ukážem ti jednoduchý postup.',
    };
  }

  async checkContent(input: ComplianceInput): Promise<ComplianceResult> {
    const text = input.content.toLowerCase();
    const risky = /garantovan|zaručen|bez rizika|stopercentn/.test(text);
    return {
      riskLevel: risky ? 'high' : 'low',
      findings: risky ? ['[MOCK] Obsah naznačuje garanciu výsledku'] : [],
      requiredDisclaimers: ['Overte tvrdenia pred zverejnením.'],
      blockedClaims: risky ? ['garancia výsledku'] : [],
      notes: '[MOCK] Kontrola prebehla v mock móde.',
    };
  }

  async transcribeAudio(input: TranscriptionInput): Promise<TranscriptionResult> {
    const name = input.filePath?.split(/[\\/]/).pop() || `in-memory ${input.mimeType}`;
    return {
      text: `[MOCK PREPIS] Audio (${name}) — tu by bol skutočný prepis. Dnes sa ma zákazník spýtal na jednu vec, ktorá trápi väčšinu ľudí v mojom obore, a ukázal som mu jednoduchý postup.`,
      language: 'sk',
      durationSeconds: 42,
      segments: [
        { startMs: 0, endMs: 21000, text: '[MOCK] Prvá polovica prepisu.' },
        { startMs: 21000, endMs: 42000, text: '[MOCK] Druhá polovica prepisu.' },
      ],
    };
  }

  async analyzeVideo(
    input: import('./provider.interfaces').VideoUnderstandingInput,
  ): Promise<import('../schemas/video-analysis.schemas').VideoUnderstandingOutput> {
    const dur = Math.round((input.durationSeconds || 30) * 1000);
    const seg = (startMs: number, endMs: number, purpose: string, text: string) => ({
      startMs, endMs, transcriptText: text, visualDescription: '[MOCK] Talking head',
      onScreenText: '', editingEvent: 'strih', deliveryStyle: 'pokojný',
      purpose, attentionMechanism: purpose === 'Hook' ? 'curiosity gap' : '', confidence: 0.6,
    });
    return {
      language: 'sk',
      summary: {
        summary: `[MOCK] Analýza videa "${input.title}" na základe prepisu.`,
        topic: 'tipy z tvojho oboru', targetAudience: 'tvoji potenciálni zákazníci', viewerProblem: 'nevie sa v téme zorientovať',
        corePromise: 'zistíš jednoduchý postup', mainLesson: 'konkrétny príklad > teória',
        contentPillar: 'Tipy a rady', contentGoal: 'Education',
        hook: '[MOCK] Prvá veta videa', setup: 'príbeh zákazníka', mainArgument: 'jednoduchý postup krok za krokom',
        payoff: 'divák vie, čo má urobiť', cta: 'napíš mi do správ', likelyTemplate: 'Príbeh klienta',
        claimsToVerify: ['[MOCK] konkrétne čísla v príklade'],
      },
      segments: [
        seg(0, Math.round(dur * 0.1), 'Hook', '[MOCK] úvodný hook'),
        seg(Math.round(dur * 0.1), Math.round(dur * 0.4), 'Problem', '[MOCK] opis problému'),
        seg(Math.round(dur * 0.4), Math.round(dur * 0.8), 'Example', '[MOCK] príklad zákazníka'),
        seg(Math.round(dur * 0.8), dur, 'CTA', '[MOCK] výzva na akciu'),
      ],
      creativeAnalysis: {
        firstFrameClarity: '[MOCK] jasný', firstThreeSecondsHook: '[MOCK] silný — konkrétny príklad',
        curiosityGap: 'prítomný', specificity: 'vysoká', emotionalTension: 'stredná',
        storytellingStructure: 'problém→príklad→riešenie', pacing: 'strih ~2,5s', captionUse: 'titulky celý čas',
        patternInterruptions: ['zoom v 12s'], openLoops: ['ako to celé dopadlo'],
        trustSignals: ['konkrétny príklad'], ctaStrength: 'stredná', dropOffRisks: ['dlhší úsek bez zmeny záberu v strede'],
      },
      reusableInsights: {
        strongPatterns: ['[MOCK] konkrétny príklad v hooku'], weakPatterns: ['[MOCK] generické CTA'],
        reusableHookPatterns: ['tvrdenie + paradox'], reusableStructurePatterns: ['problém→príklad→riešenie→CTA'],
        pacingRecommendations: ['strih každé 2–3 s'], contentGaps: ['chýba séria o častých otázkach'],
        inspiredIdeas: ['[MOCK] 3 časté chyby', '[MOCK] otázky a odpovede naživo', '[MOCK] za zákulisím'],
        recommendedImprovements: ['konkrétnejšie CTA'],
      },
      aiScores: {
        hookStrength: 7, clarity: 8, pacing: 7, visualEngagement: 6, trust: 7,
        retentionPotential: 7, cta: 5, originality: 6, overall: 7,
      },
    };
  }

  async generateContentDna(
    analyses: import('../prompts/content-dna-generation.prompt').DnaPromptAnalysis[],
  ): Promise<import('../schemas/video-analysis.schemas').ContentDnaOutput> {
    return {
      dominantPillars: ['[MOCK] Tipy a rady', 'Príbehy zákazníkov'],
      commonFormats: ['talking head s titulkami'],
      recurringHookStructures: ['tvrdenie + paradox', 'priznanie chyby'],
      typicalDurationSeconds: 32,
      speechPace: 'svižné, ~150 slov/min',
      visualRhythm: 'strih každé 2–3 sekundy',
      ctaPatterns: ['napíš mi [slovo]'],
      strongestTopics: ['praktické tipy z oboru'],
      underperformingPatterns: ['dlhé intro bez pointy'],
      contentGaps: ['časté otázky', 'obsah pre začiatočníkov'],
      rules: [
        { category: 'hook', rule: '[MOCK] Hook s konkrétnym príkladom v prvej vete', evidence: `${analyses.length} videí`, confidence: 0.6 },
        { category: 'structure', rule: '[MOCK] Problém → príklad → riešenie → CTA', evidence: `${analyses.length} videí`, confidence: 0.55 },
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
