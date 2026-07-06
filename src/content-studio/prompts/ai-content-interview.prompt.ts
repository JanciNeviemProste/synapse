import { BrandContext } from '../providers/provider.interfaces';
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
