import { ANTI_INJECTION_RULES, jsonSchemaInstruction, wrapUntrusted } from './prompt-helpers';

const SHAPE = `{
  "brandName": string, "industry": string, "targetAudience": string,
  "communicationStyle": string,
  "preferredPhrases": string[], "forbiddenPhrases": string[], "requiredCtas": string[]
}`;

export function buildBrandExtractionPrompt(textExcerpt: string): {
  system: string;
  user: string;
} {
  return {
    system: `Si asistent, ktorý z nahraného dokumentu (napr. brand manuál, popis firmy, staré príspevky) odhadne polia pre Brand DNA profil tvorcu obsahu.
Vyplň len to, čo vieš z textu skutočne odvodiť — nevymýšľaj si. Pole, ktoré sa nedá odvodiť, nechaj prázdne (string) alebo prázdne pole.
${ANTI_INJECTION_RULES}
${jsonSchemaInstruction(SHAPE)}`,
    user: wrapUntrusted('brand-document-excerpt', textExcerpt),
  };
}
