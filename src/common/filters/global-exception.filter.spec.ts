import { HttpStatus } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { mapKnownError } from './global-exception.filter';

describe('mapKnownError — raw provider/DB errors → clean HTTP', () => {
  it('maps Prisma P2025 to 404', () => {
    expect(mapKnownError('... code: P2025 ...')?.status).toBe(HttpStatus.NOT_FOUND);
    expect(mapKnownError('No record was found for a delete.')?.status).toBe(
      HttpStatus.NOT_FOUND,
    );
  });

  it('maps AI 401 to 503 with a key hint', () => {
    const r = mapKnownError('OpenRouter API error 401: {"error":{"message":"User not found."}}');
    expect(r?.status).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    expect(r?.message).toMatch(/API kľúč/);
    expect(mapKnownError('Transcription API error: 401')?.status).toBe(
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  });

  it('maps AI 429 to 503', () => {
    expect(
      mapKnownError('OpenRouter API error 429: rate limited')?.status,
    ).toBe(HttpStatus.SERVICE_UNAVAILABLE);
  });

  it('maps invalid AI JSON to 503', () => {
    expect(mapKnownError('AI output is not valid JSON')?.status).toBe(
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  });

  it('maps missing AI backend to 503', () => {
    expect(
      mapKnownError('AI service not initialized — ANTHROPIC_API_KEY missing')?.status,
    ).toBe(HttpStatus.SERVICE_UNAVAILABLE);
  });

  it('returns null for unknown errors (stay 500)', () => {
    expect(mapKnownError('some random null pointer')).toBeNull();
    expect(mapKnownError('')).toBeNull();
  });

  it('does not treat a plain 401 without provider context as an AI error', () => {
    expect(mapKnownError('Invalid admin password')).toBeNull();
  });
});
