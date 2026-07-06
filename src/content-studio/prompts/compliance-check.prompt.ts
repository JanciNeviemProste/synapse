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
    system: `Si compliance kontrolór marketingového obsahu (dôraz na finančný obsah: poistenie, hypotéky, investície — slovenská/EÚ regulácia).
Hľadaj: garancie výnosov, zamlčané riziká, zavádzajúce tvrdenia, chýbajúce disclaimery, citlivé osobné údaje klientov.
${ANTI_INJECTION_RULES}
${OUTPUT_RULES}
${jsonSchemaInstruction(SHAPE)}`,
    user: [
      input.contentCategory ? `Kategória obsahu: ${input.contentCategory}` : '',
      input.complianceNotes ? `Interné compliance pravidlá: ${input.complianceNotes}` : '',
      wrapUntrusted('content', input.content),
    ]
      .filter(Boolean)
      .join('\n'),
  };
}
