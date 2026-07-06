import { ContentPlanInput } from '../providers/provider.interfaces';
import {
  ANTI_INJECTION_RULES,
  OUTPUT_RULES,
  jsonSchemaInstruction,
  renderBrandContext,
  renderKnowledgeContext,
} from './prompt-helpers';

const SHAPE = `{
  "name": string,
  "items": [{
    "scheduledDate": string, // ISO datum YYYY-MM-DD v zadanom rozsahu
    "workingTitle": string,
    "topic": string,
    "pillar": string,
    "goal": string,
    "targetAudience": string,
    "template": string,
    "length": string,
    "style": string,
    "emotion": string,
    "suggestedHook": string,
    "cta": string
  }],
  "notes": string[]
}`;

export function buildContentPlanPrompt(input: ContentPlanInput): {
  system: string;
  user: string;
} {
  return {
    system: `Si content stratég. Vytvor publikačný plán krátkych videí (Instagram Reels).
${renderBrandContext(input.brand)}
${renderKnowledgeContext(input.knowledge)}
${ANTI_INJECTION_RULES}
${OUTPUT_RULES}
${jsonSchemaInstruction(SHAPE)}`,
    user: [
      `Obdobie: ${input.startDate} až ${input.endDate}`,
      `Počet postov týždenne: ${input.postsPerWeek}`,
      input.preferredDays?.length
        ? `Preferované dni: ${input.preferredDays.join(', ')}`
        : '',
      `Ciele: ${input.goals.join(', ') || 'vyvážený mix edukácia/dôvera/predaj'}`,
      `Piliere na pokrytie: ${input.pillars.join(', ') || 'navrhni sám podľa Brand DNA'}`,
      input.preferredLengths?.length
        ? `Preferované dĺžky: ${input.preferredLengths.join(', ')}`
        : '',
      input.preferredStyles?.length
        ? `Preferované štýly: ${input.preferredStyles.join(', ')}`
        : '',
      input.campaignContext ? `Kampaňový kontext: ${input.campaignContext}` : '',
      'Rozlož témy rovnomerne medzi piliere, striedaj ciele a formáty.',
    ]
      .filter(Boolean)
      .join('\n'),
  };
}
