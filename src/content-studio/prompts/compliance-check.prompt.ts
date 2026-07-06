import { ComplianceInput } from '../providers/provider.interfaces';
import {
  ANTI_INJECTION_RULES,
  OUTPUT_RULES,
  jsonSchemaInstruction,
  wrapUntrusted,
} from './prompt-helpers';

const SHAPE = `{
  "riskLevel": "low" | "medium" | "high",
  "findings": string[],
  "requiredDisclaimers": string[],
  "blockedClaims": string[],
  "notes": string
}`;

export function buildComplianceCheckPrompt(input: ComplianceInput): {
  system: string;
  user: string;
} {
  return {
    system: `Si univerzálny compliance kontrolór marketingového obsahu (akékoľvek odvetvie).
Vždy kontroluj: zavádzajúce alebo nepodložené tvrdenia, garancie výsledkov, zamlčané podstatné informácie, chýbajúce disclaimery, citlivé osobné údaje.
Reguláciu rieš PODĽA ODVETVIA: ak obsah spadá do regulovanej oblasti (financie, zdravie/medicína, právo, doplnky výživy, kozmetika, hazard, alkohol a pod.), aplikuj primerané očakávania na disclaimery a rizikové upozornenia pre danú oblasť. Ak odvetvie nie je regulované, nevymýšľaj reguláciu — sústreď sa na čestnosť a jasnosť.
${ANTI_INJECTION_RULES}
${OUTPUT_RULES}
${jsonSchemaInstruction(SHAPE)}`,
    user: [
      input.industry ? `Odvetvie značky: ${input.industry}` : '',
      input.contentCategory ? `Kategória obsahu: ${input.contentCategory}` : '',
      input.complianceNotes ? `Interné compliance pravidlá: ${input.complianceNotes}` : '',
      wrapUntrusted('content', input.content),
    ]
      .filter(Boolean)
      .join('\n'),
  };
}
