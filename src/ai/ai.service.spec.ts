import { describe, expect, it } from 'vitest';
import { AiTruncatedOutputError, pickOpenRouterContent } from './ai.service';

describe('pickOpenRouterContent', () => {
  it('returns the assistant message content', () => {
    expect(
      pickOpenRouterContent({
        choices: [{ message: { content: 'ahoj' } }],
      }),
    ).toBe('ahoj');
  });

  it('throws on empty or missing content', () => {
    expect(() => pickOpenRouterContent({ choices: [] })).toThrow(
      'no content',
    );
    expect(() =>
      pickOpenRouterContent({ choices: [{ message: { content: '' } }] }),
    ).toThrow('no content');
    expect(() => pickOpenRouterContent({})).toThrow('no content');
  });

  it('surfaces the OpenRouter error message when present', () => {
    expect(() =>
      pickOpenRouterContent({ error: { message: 'insufficient credits' } }),
    ).toThrow('insufficient credits');
  });
});

describe('AiTruncatedOutputError', () => {
  it('carries the stop reason and a clear Slovak message', () => {
    const err = new AiTruncatedOutputError('max_tokens');
    expect(err.stopReason).toBe('max_tokens');
    expect(err.message).toContain('orezaná');
    expect(err.name).toBe('AiTruncatedOutputError');
  });
});
