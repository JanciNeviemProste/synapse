import { ContentPillarInput } from '../providers/provider.interfaces';
import {
  ANTI_INJECTION_RULES,
  OUTPUT_RULES,
  jsonSchemaInstruction,
  renderBrandContext,
  renderKnowledgeContext,
  wrapUntrusted,
} from './prompt-helpers';

const SHAPE = `{
  "pillars": [{
    "name": string,
    "description": string,
    "priority": number, // 0-10
    "targetFrequency": string,
    "complianceNotes": string
  }]
}`;

export function buildContentPillarsPrompt(input: ContentPillarInput): {
  system: string;
  user: string;
} {
  return {
    system: `Si content stratég. Navrhni obsahové piliere (content pillars) pre krátke videá.
${renderBrandContext(input.brand)}
${renderKnowledgeContext(input.knowledge)}
${ANTI_INJECTION_RULES}
${OUTPUT_RULES}
${jsonSchemaInstruction(SHAPE)}`,
    user: [
      input.existingPillars.length
        ? `Existujúce piliere (nenavrhuj duplikáty): ${input.existingPillars.join(', ')}`
        : 'Zatiaľ žiadne piliere.',
      input.existingIdeas.length
        ? wrapUntrusted('existing-ideas', input.existingIdeas.join('\n'))
        : '',
      'Navrhni 5–9 pilierov relevantných pre značku a publikum.',
    ]
      .filter(Boolean)
      .join('\n\n'),
  };
}
