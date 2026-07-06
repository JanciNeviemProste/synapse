import {
  ANTI_INJECTION_RULES,
  OUTPUT_RULES,
  jsonSchemaInstruction,
  wrapUntrusted,
} from './prompt-helpers';

export interface DnaPromptAnalysis {
  title: string;
  durationSeconds?: number;
  summary: unknown;
  reusableInsights: unknown;
  normalizedMetrics?: unknown;
}

const SHAPE = `{
  "dominantPillars": string[], "commonFormats": string[], "recurringHookStructures": string[],
  "typicalDurationSeconds": number, "speechPace": string, "visualRhythm": string,
  "ctaPatterns": string[], "strongestTopics": string[], "underperformingPatterns": string[],
  "contentGaps": string[],
  "rules": [{
    "category": string, // hook | structure | pacing | cta | topic | format
    "rule": string,
    "evidence": string, // z kolkych videi a preco
    "confidence": number // 0-1, konzervativne
  }]
}`;

export function buildContentDnaPrompt(analyses: DnaPromptAnalysis[]): {
  system: string;
  user: string;
} {
  return {
    system: `Zo schválených video analýz vytvor Content DNA profil — opakujúce sa vzory obsahu používateľa.
Každé pravidlo musí mať evidence (koľko videí ho podporuje) a konzervatívnu confidence.
Content DNA popisuje POZOROVANÉ vzory — nikdy neprepisuje Brand DNA (želanú identitu).
Pri metrikách pracuj len s hypotézami, nie kauzalitou.
${ANTI_INJECTION_RULES}
${OUTPUT_RULES}
${jsonSchemaInstruction(SHAPE)}`,
    user: wrapUntrusted(
      'approved-analyses',
      JSON.stringify(analyses).substring(0, 60000),
    ),
  };
}
