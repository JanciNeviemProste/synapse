import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  AiOutputValidationError,
  extractJsonCandidate,
  parseAiJson,
} from './ai-json';

const schema = z.object({ name: z.string(), count: z.number() });

describe('extractJsonCandidate', () => {
  it('strips markdown json fences', () => {
    expect(extractJsonCandidate('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it('extracts JSON object wrapped in prose', () => {
    expect(extractJsonCandidate('Tu je výsledok: {"a":1} Dúfam, že pomôže.')).toBe(
      '{"a":1}',
    );
  });

  it('leaves clean JSON untouched', () => {
    expect(extractJsonCandidate('{"a":1}')).toBe('{"a":1}');
  });
});

describe('parseAiJson', () => {
  it('parses and validates a correct payload', () => {
    const result = parseAiJson(schema, '```json\n{"name":"test","count":2}\n```');
    expect(result).toEqual({ name: 'test', count: 2 });
  });

  it('throws AiOutputValidationError on invalid JSON syntax', () => {
    expect(() => parseAiJson(schema, 'not json at all')).toThrow(
      AiOutputValidationError,
    );
  });

  it('throws AiOutputValidationError with issue paths on schema mismatch', () => {
    try {
      parseAiJson(schema, '{"name":"test","count":"two"}');
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(AiOutputValidationError);
      expect((error as AiOutputValidationError).issues.join(' ')).toContain('count');
    }
  });

  it('never returns unvalidated data (extra shape is stripped by zod object)', () => {
    const result = parseAiJson(schema, '{"name":"x","count":1,"injected":"evil"}');
    expect(result).toEqual({ name: 'x', count: 1 });
  });
});
