import { BrandContext, InterviewTurn } from '../providers/provider.interfaces';
import {
  ANTI_INJECTION_RULES,
  OUTPUT_RULES,
  jsonSchemaInstruction,
  renderBrandContext,
  wrapUntrusted,
} from './prompt-helpers';

/** System instructions for the live AI interview session (spec §7.4). */
export function buildInterviewInstructions(brand?: BrandContext): string {
  return `Si AI content stratég vedúci krátky hlasový rozhovor v slovenčine.
Cieľ: vytiahnuť z používateľa materiál na content (čo sa stalo, najväčšia chyba, pre koho je to video, čo sa má divák naučiť, aký je cieľ, aká akcia diváka).
Pravidlá: krátke relevantné otázky, žiadne monológy, neopakuj sa, neprerušuj zbytočne, skonči keď máš dosť informácií. Ak zaznejú citlivé údaje klientov, upozorni na anonymizáciu.
${renderBrandContext(brand)}`;
}

const NEXT_QUESTION_SHAPE = `{
  "question": string, // dalsia kratka otazka v slovencine; prazdne ak done=true
  "done": boolean,    // true ak uz mas dost informacii na content brief
  "reason": string    // strucne preco pokracujes / koncis
}`;

export function buildNextQuestionPrompt(
  history: InterviewTurn[],
  brand?: BrandContext,
): { system: string; user: string } {
  const rendered = history
    .map((t) => `${t.role === 'ai' ? 'AI' : 'POUŽÍVATEĽ'}: ${t.text}`)
    .join('\n');
  return {
    system: `${buildInterviewInstructions(brand)}
${ANTI_INJECTION_RULES}
${OUTPUT_RULES}
${jsonSchemaInstruction(NEXT_QUESTION_SHAPE)}`,
    user: [
      history.length === 0
        ? 'Rozhovor sa začína. Polož úvodnú otázku (napr. čo sa dnes stalo / čo chceš natočiť).'
        : wrapUntrusted('interview-history', rendered),
      'Neopakuj už položené otázky. Ak máš dosť informácií (téma, publikum, cieľ, pointa), ukonči rozhovor (done=true).',
    ].join('\n'),
  };
}

const BRIEF_SHAPE = `{
  "summary": string,
  "keyThoughts": string[],
  "ideas": [{
    "title": string, "description": string, "keyMessage": string,
    "suggestedGoal": string, "suggestedHook": string, "suggestedCta": string,
    "suggestedFormats": string[], "targetAudience": string
  }],
  "suggestedPillars": string[],
  "missingInformation": string[],
  "warnings": string[],
  "uncertainty": string[]
}`;

export function buildInterviewBriefPrompt(
  transcript: string,
  brand?: BrandContext,
): { system: string; user: string } {
  return {
    system: `Si content stratég. Z prepisu rozhovoru vytvor štruktúrovaný content brief.
Explicitne označ neistotu a chýbajúce informácie.
${renderBrandContext(brand)}
${ANTI_INJECTION_RULES}
${OUTPUT_RULES}
${jsonSchemaInstruction(BRIEF_SHAPE)}`,
    user: wrapUntrusted('interview-transcript', transcript),
  };
}
