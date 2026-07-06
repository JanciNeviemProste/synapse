import { ScriptGenerationInput } from '../providers/provider.interfaces';
import {
  ANTI_INJECTION_RULES,
  OUTPUT_RULES,
  jsonSchemaInstruction,
  renderBrandContext,
  renderKnowledgeContext,
  wrapUntrusted,
} from './prompt-helpers';

const SHAPE = `{
  "variants": [ // presne 3 varianty: A = cisty profesionalny, B = storytelling, C = najsilnejsi hook
    {
      "versionName": "A" | "B" | "C",
      "strategy": {
        "workingTitle": string, "goal": string, "targetAudience": string,
        "contentPillar": string, "recommendedLength": string, "recommendedStyle": string,
        "recommendedEmotion": string, "template": string, "contentAngle": string, "angleReason": string
      },
      "hook": string,
      "setup": string,
      "mainMessage": string,
      "keyInsight": string,
      "cta": string,
      "spokenScript": string, // kompletny hovoreny skript v prirodzenej slovencine
      "productionPlan": {
        "estimatedDurationSeconds": number,
        "scenes": [{ "description": string, "onScreenText": string, "brollSuggestion": string, "deliveryNote": string }],
        "pacingNotes": string, "pauses": string[], "emphasizedWords": string[]
      },
      "instagramAssets": {
        "caption": string, "shortCaption": string, "thumbnailText": string, "firstComment": string,
        "ctaText": string, "hashtags": string[], "alternativeHooks": string[], "alternativeTitles": string[]
      },
      "safety": {
        "factualUncertainty": string[], "complianceRisks": string[], "recommendedDisclaimer": string,
        "sensitiveInfoWarnings": string[], "claimsToVerify": string[], "sourceReferences": string[]
      }
    }
  ]
}`;

export function buildScriptGenerationPrompt(input: ScriptGenerationInput): {
  system: string;
  user: string;
} {
  const templateBlock = input.template
    ? `ŠABLÓNA "${input.template.name}":
Štruktúra: ${JSON.stringify(input.template.structure)}
${input.template.hookPattern ? `Hook vzor: ${input.template.hookPattern}` : ''}
${input.template.bodyPattern ? `Telo vzor: ${input.template.bodyPattern}` : ''}
${input.template.ctaPattern ? `CTA vzor: ${input.template.ctaPattern}` : ''}
${input.template.complianceRules ? `Compliance: ${input.template.complianceRules}` : ''}`
    : '';

  return {
    system: `Si špičkový scenárista krátkych videí (Instagram Reels) pre slovenský trh.
Úloha: vygeneruj TRI kompletné varianty skriptu — A (čistý profesionálny), B (storytelling), C (najsilnejší hook).
Výstup musí znieť ako používateľ, nie ako generická AI kópia.
${renderBrandContext(input.brand)}
${renderKnowledgeContext(input.knowledge)}
${templateBlock}
${
  input.stylePreferences?.length
    ? `NAUČENÉ ŠTÝLOVÉ PREFERENCIE POUŽÍVATEĽA:\n${input.stylePreferences.join('\n')}`
    : ''
}
${
  input.inspirationPatterns?.length
    ? `INŠPIRAČNÉ VZORY (len štruktúra/štýl — NIKDY nekopíruj formulácie):\n${input.inspirationPatterns.join('\n')}`
    : ''
}
${ANTI_INJECTION_RULES}
${OUTPUT_RULES}
${jsonSchemaInstruction(SHAPE)}`,
    user: [
      `Téma: ${input.topic}`,
      input.rawIdea ? wrapUntrusted('raw-idea', input.rawIdea) : '',
      input.goal ? `Cieľ: ${input.goal}` : '',
      input.targetAudience ? `Publikum: ${input.targetAudience}` : '',
      input.length ? `Dĺžka: ${input.length}` : '',
      input.style ? `Štýl: ${input.style}` : '',
      input.emotion ? `Emócia: ${input.emotion}` : '',
      input.cta ? `Požadované CTA: ${input.cta}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
  };
}
