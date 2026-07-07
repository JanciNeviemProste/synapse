import { describe, expect, it } from 'vitest';
import { resolveProviderKind } from './provider.factory';

describe('resolveProviderKind (spec principle 18 — mock mode without keys)', () => {
  const noCreds = { anthropic: false, openai: false, groq: false };
  const allCreds = { anthropic: true, openai: true, groq: true };

  it('explicit mock always wins', () => {
    expect(resolveProviderKind('mock', 'strategy', allCreds)).toBe('mock');
    expect(resolveProviderKind('MOCK', 'script', allCreds)).toBe('mock');
  });

  it('auto without any credentials falls back to mock everywhere', () => {
    expect(resolveProviderKind('auto', 'strategy', noCreds)).toBe('mock');
    expect(resolveProviderKind('auto', 'script', noCreds)).toBe('mock');
    expect(resolveProviderKind('auto', 'transcription', noCreds)).toBe('mock');
    expect(resolveProviderKind('auto', 'realtime', noCreds)).toBe('mock');
    expect(resolveProviderKind('', 'review', noCreds)).toBe('mock');
  });

  it('auto with credentials picks the real provider per role', () => {
    expect(resolveProviderKind('auto', 'strategy', allCreds)).toBe('anthropic');
    expect(resolveProviderKind('auto', 'script', allCreds)).toBe('anthropic');
    // transcription prefers Groq (free) over OpenAI
    expect(resolveProviderKind('auto', 'transcription', allCreds)).toBe('groq');
    expect(resolveProviderKind('auto', 'realtime', allCreds)).toBe('openai');
  });

  it('transcription auto: groq preferred, else openai, else mock', () => {
    expect(
      resolveProviderKind('auto', 'transcription', {
        anthropic: false,
        openai: true,
        groq: false,
      }),
    ).toBe('openai');
    expect(
      resolveProviderKind('auto', 'transcription', {
        anthropic: false,
        openai: false,
        groq: true,
      }),
    ).toBe('groq');
  });

  it('explicit groq needs groq creds, otherwise mock', () => {
    expect(
      resolveProviderKind('groq', 'transcription', {
        anthropic: false,
        openai: false,
        groq: true,
      }),
    ).toBe('groq');
    expect(resolveProviderKind('groq', 'transcription', noCreds)).toBe('mock');
  });

  it('explicitly configured provider without credentials degrades to mock', () => {
    expect(resolveProviderKind('anthropic', 'strategy', noCreds)).toBe('mock');
    expect(resolveProviderKind('openai', 'transcription', noCreds)).toBe('mock');
  });

  it('claude-cli counts as anthropic credentials', () => {
    expect(
      resolveProviderKind('auto', 'strategy', {
        anthropic: true,
        openai: false,
        groq: false,
      }),
    ).toBe('anthropic');
  });
});
