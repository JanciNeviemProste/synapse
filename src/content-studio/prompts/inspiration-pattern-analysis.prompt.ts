import { InspirationAnalysisInput } from '../providers/provider.interfaces';
import {
  ANTI_INJECTION_RULES,
  OUTPUT_RULES,
  jsonSchemaInstruction,
  wrapUntrusted,
} from './prompt-helpers';

const SHAPE = `{
  "patterns": [{
    "category": string, // hook_style | structure | pacing | tone | storytelling | text_overlay | cta | visual_format | editing
    "pattern": string,  // opis vzoru vlastnymi slovami
    "note": string
  }]
}`;

export function buildInspirationAnalysisPrompt(input: InspirationAnalysisInput): {
  system: string;
  user: string;
} {
  return {
    system: `Analyzuj inšpiračný obsah a extrahuj znovupoužiteľné ŠTRUKTÚRNE a ŠTYLISTICKÉ vzory.
TVRDÉ PRAVIDLO: Použi inšpiráciu len na identifikáciu vzorov. Nikdy nereprodukuj charakteristické vety, skripty, formulácie ani kreatívne vyjadrenia.
${ANTI_INJECTION_RULES}
${OUTPUT_RULES}
${jsonSchemaInstruction(SHAPE)}`,
    user: [
      `Názov: ${input.title}`,
      input.userNotes ? wrapUntrusted('user-notes', input.userNotes) : '',
      input.transcript ? wrapUntrusted('transcript', input.transcript) : '',
    ]
      .filter(Boolean)
      .join('\n'),
  };
}
