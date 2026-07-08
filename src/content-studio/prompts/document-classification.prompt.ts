import { ANTI_INJECTION_RULES, jsonSchemaInstruction, wrapUntrusted } from './prompt-helpers';

const SHAPE = `{ "category": string }`;

const SUGGESTED_CATEGORIES = [
  'cenník',
  'brand manuál',
  'staré skripty',
  'produktové info',
  'dáta/analytika',
  'iné',
];

export function buildDocumentClassificationPrompt(
  fileName: string,
  textExcerpt: string,
): { system: string; user: string } {
  return {
    system: `Si asistent, ktorý triedi nahraté podkladové dokumenty pre tvorbu obsahu.
Úloha: na základe názvu súboru a krátkeho úryvku textu urči, o aký typ dokumentu ide.
Použi jednu z týchto kategórií, ak sa hodí: ${SUGGESTED_CATEGORIES.join(', ')}.
Ak sa nehodí žiadna, vráť krátky (2-3 slová) vlastný výstižný názov kategórie v slovenčine.
${ANTI_INJECTION_RULES}
${jsonSchemaInstruction(SHAPE)}`,
    user: [`Názov súboru: ${fileName}`, wrapUntrusted('document-excerpt', textExcerpt)].join('\n'),
  };
}
