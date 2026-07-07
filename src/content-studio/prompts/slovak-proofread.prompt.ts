import { ProofreadFields } from '../schemas/ai-output.schemas';
import {
  ANTI_INJECTION_RULES,
  jsonSchemaInstruction,
  wrapUntrusted,
} from './prompt-helpers';

const SHAPE = `{
  "hook": string, "setup": string, "mainMessage": string, "keyInsight": string,
  "cta": string, "spokenScript": string, "caption": string
}`;

/**
 * Ask the model to correct ONLY Slovak grammar/spelling/diacritics/punctuation
 * of a script variant's text fields, changing nothing else. Returns the same
 * field set, corrected.
 */
export function buildProofreadPrompt(fields: ProofreadFields): {
  system: string;
  user: string;
} {
  return {
    system: `Si dôsledný slovenský korektor. Oprav gramatiku, pravopis, diakritiku, interpunkciu, skloňovanie a časovanie tak, aby text bol v 100 % správnej spisovnej slovenčine.
PRÍSNE PRAVIDLÁ:
- NIČ iné nemeň — zachovaj význam, štýl, tón, dĺžku, emoji, oslovenie (tykanie/vykanie) aj formátovanie a zalomenia.
- Nepridávaj ani neuberaj obsah, needituj myšlienku, needituj hashtagy.
- Ak je pole prázdne, vráť ho prázdne.
- Vráť VÝLUČNE JSON s tými istými poľami, bez komentárov, bez markdown.
${ANTI_INJECTION_RULES}
${jsonSchemaInstruction(SHAPE)}`,
    user: wrapUntrusted('script-fields-json', JSON.stringify(fields)),
  };
}
