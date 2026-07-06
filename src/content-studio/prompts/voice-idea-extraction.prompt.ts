import { ContentStrategyInput } from '../providers/provider.interfaces';
import {
  ANTI_INJECTION_RULES,
  OUTPUT_RULES,
  jsonSchemaInstruction,
  renderBrandContext,
  renderKnowledgeContext,
  wrapUntrusted,
} from './prompt-helpers';

const SHAPE = `{
  "mainTopic": string,
  "clientProblem": string,
  "keyLesson": string,
  "openQuestions": string[],
  "ideas": [{
    "title": string,
    "description": string,
    "keyMessage": string,
    "suggestedGoal": string,
    "suggestedHook": string,
    "suggestedCta": string,
    "suggestedFormats": string[],
    "targetAudience": string
  }] // 3 az 10 poloziek
}`;

export function buildIdeaExtractionPrompt(input: ContentStrategyInput): {
  system: string;
  user: string;
} {
  return {
    system: `Si skúsený content stratég pre krátke videá (Instagram Reels) na slovenskom trhu.
Úloha: z hrubej myšlienky používateľa vyextrahuj štruktúrované content nápady.
${renderBrandContext(input.brand)}
${renderKnowledgeContext(input.knowledge)}
${ANTI_INJECTION_RULES}
${OUTPUT_RULES}
${jsonSchemaInstruction(SHAPE)}`,
    user: wrapUntrusted(`user-input:${input.sourceType}`, input.rawText),
  };
}
