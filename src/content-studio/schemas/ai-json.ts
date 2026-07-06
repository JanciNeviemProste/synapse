import { z } from 'zod';

/**
 * Parse + validate untrusted AI JSON output (spec §19).
 * Strips markdown fences, extracts the outermost JSON object if the model
 * wrapped it in prose, then validates against the given Zod schema.
 */

export class AiOutputValidationError extends Error {
  constructor(
    message: string,
    public readonly issues: string[],
    public readonly raw: string,
  ) {
    super(message);
    this.name = 'AiOutputValidationError';
  }
}

export function extractJsonCandidate(raw: string): string {
  const cleaned = raw
    .replace(/```json\n?/gi, '')
    .replace(/```\n?/g, '')
    .trim();

  if (cleaned.startsWith('{') || cleaned.startsWith('[')) {
    return cleaned;
  }

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return cleaned.slice(firstBrace, lastBrace + 1);
  }

  return cleaned;
}

export function parseAiJson<T>(schema: z.ZodType<T>, raw: string): T {
  const candidate = extractJsonCandidate(raw);

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    throw new AiOutputValidationError(
      'AI output is not valid JSON',
      ['invalid JSON syntax'],
      raw.substring(0, 500),
    );
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues.map(
      (i) => `${i.path.join('.') || '(root)'}: ${i.message}`,
    );
    throw new AiOutputValidationError(
      'AI output failed schema validation',
      issues,
      raw.substring(0, 500),
    );
  }

  return result.data;
}
