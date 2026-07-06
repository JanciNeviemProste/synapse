import { ScriptReviewInput } from '../providers/provider.interfaces';
import {
  ANTI_INJECTION_RULES,
  OUTPUT_RULES,
  jsonSchemaInstruction,
  renderBrandContext,
  wrapUntrusted,
} from './prompt-helpers';

const SHAPE = `{
  "scores": {
    "hookStrength": number, "clarity": number, "naturalSpeech": number,
    "audienceRelevance": number, "trust": number, "brandDnaMatch": number,
    "ctaQuality": number, "retentionPotential": number, "originality": number,
    "complianceSafety": number, "overall": number
  }, // vsetko 0-10, su to AI odhady
  "strengths": string[],
  "weaknesses": string[],
  "suggestedImprovements": string[],
  "confusingSentences": string[],
  "genericLanguage": string[],
  "unsupportedClaims": string[],
  "complianceWarnings": string[],
  "improvedHook": string,
  "improvedCta": string
}`;

export function buildScriptReviewPrompt(input: ScriptReviewInput): {
  system: string;
  user: string;
} {
  return {
    system: `Si prísny editor krátkych videí. Ohodnoť skript — všetky skóre sú AI odhady (0–10), nikdy nie predikcie virality.
${renderBrandContext(input.brand)}
${ANTI_INJECTION_RULES}
${OUTPUT_RULES}
${jsonSchemaInstruction(SHAPE)}`,
    user: [
      input.goal ? `Cieľ skriptu: ${input.goal}` : '',
      `Hook: ${input.hook}`,
      `CTA: ${input.cta}`,
      wrapUntrusted('script', input.spokenScript),
    ]
      .filter(Boolean)
      .join('\n'),
  };
}
