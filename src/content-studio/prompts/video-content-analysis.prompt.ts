import {
  ANTI_INJECTION_RULES,
  OUTPUT_RULES,
  jsonSchemaInstruction,
  wrapUntrusted,
} from './prompt-helpers';

export interface VideoAnalysisPromptInput {
  title: string;
  durationSeconds?: number;
  width?: number;
  height?: number;
  transcript: string;
  transcriptSegments?: { startMs: number; endMs: number; text: string }[];
}

const SHAPE = `{
  "language": string,
  "summary": {
    "summary": string, "topic": string, "targetAudience": string, "viewerProblem": string,
    "corePromise": string, "mainLesson": string, "contentPillar": string, "contentGoal": string,
    "hook": string, "setup": string, "mainArgument": string, "payoff": string, "cta": string,
    "likelyTemplate": string, "claimsToVerify": string[]
  },
  "segments": [{
    "startMs": number, "endMs": number, "transcriptText": string, "visualDescription": string,
    "onScreenText": string, "editingEvent": string, "deliveryStyle": string,
    "purpose": string, // Hook | Problem | Example | Solution | CTA | ...
    "attentionMechanism": string, "confidence": number // 0-1
  }],
  "creativeAnalysis": {
    "firstFrameClarity": string, "firstThreeSecondsHook": string, "curiosityGap": string,
    "specificity": string, "emotionalTension": string, "storytellingStructure": string,
    "pacing": string, "captionUse": string, "patternInterruptions": string[],
    "openLoops": string[], "trustSignals": string[], "ctaStrength": string, "dropOffRisks": string[]
  },
  "reusableInsights": {
    "strongPatterns": string[], "weakPatterns": string[], "reusableHookPatterns": string[],
    "reusableStructurePatterns": string[], "pacingRecommendations": string[],
    "contentGaps": string[], "inspiredIdeas": string[], "recommendedImprovements": string[]
  },
  "aiScores": {
    "hookStrength": number, "clarity": number, "pacing": number, "visualEngagement": number,
    "trust": number, "retentionPotential": number, "cta": number, "originality": number, "overall": number
  } // 0-10, su to AI odhady
}`;

export function buildVideoAnalysisPrompt(input: VideoAnalysisPromptInput): {
  system: string;
  user: string;
} {
  const segments = (input.transcriptSegments ?? [])
    .map((s) => `[${s.startMs}–${s.endMs} ms] ${s.text}`)
    .join('\n');
  return {
    system: `Si analytik krátkych videí (Instagram Reels). Analyzuj video NA ZÁKLADE PREPISU a metadát.
Prísne oddeľuj pozorovania od interpretácií. Časové značky zachovaj z prepisu. Confidence uvádzaj konzervatívne.
Nikdy netvrď kauzalitu ("toto spôsobilo výkon") — len hypotézy. Nikdy nekopíruj charakteristické formulácie.
Tvrdenia vyžadujúce overenie uveď v claimsToVerify.
${ANTI_INJECTION_RULES}
${OUTPUT_RULES}
${jsonSchemaInstruction(SHAPE)}`,
    user: [
      `Video: ${input.title}`,
      input.durationSeconds ? `Trvanie: ${input.durationSeconds}s` : '',
      input.width && input.height ? `Rozlíšenie: ${input.width}x${input.height}` : '',
      wrapUntrusted('transcript', input.transcript),
      segments ? wrapUntrusted('transcript-segments', segments) : '',
    ]
      .filter(Boolean)
      .join('\n'),
  };
}
