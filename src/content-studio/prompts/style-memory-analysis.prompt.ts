import { StyleMemoryInput } from '../providers/provider.interfaces';
import {
  ANTI_INJECTION_RULES,
  OUTPUT_RULES,
  jsonSchemaInstruction,
  wrapUntrusted,
} from './prompt-helpers';

const SHAPE = `{
  "preferences": [{
    "preferenceType": string, // hook_style | cta_style | sentence_length | tone | phrase_added | phrase_removed | structure
    "preferenceValue": string,
    "confidence": number // 0-1, konzervativne
  }]
}`;

export function buildStyleMemoryPrompt(input: StyleMemoryInput): {
  system: string;
  user: string;
} {
  return {
    system: `Porovnaj pôvodný AI skript s verziou po úpravách používateľa a odvoď jeho štýlové preferencie.
Buď konzervatívny: slabé signály dostávajú nízku confidence. Nikdy nevymýšľaj preferencie, ktoré z rozdielov nevyplývajú.
${ANTI_INJECTION_RULES}
${OUTPUT_RULES}
${jsonSchemaInstruction(SHAPE)}`,
    user: [
      wrapUntrusted('original-script', input.originalScript),
      wrapUntrusted('edited-script', input.editedScript),
    ].join('\n'),
  };
}
