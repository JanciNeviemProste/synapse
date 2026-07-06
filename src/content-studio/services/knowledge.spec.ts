import { describe, expect, it } from 'vitest';
import { extractKeywords, scoreDocument } from './knowledge.service';

describe('extractKeywords', () => {
  it('extracts lowercase unique words with length >= 4, including Slovak diacritics', () => {
    const kws = extractKeywords('Poistenie príjmu a poistenie majetku, tri poistky');
    expect(kws).toContain('poistenie');
    expect(kws).toContain('príjmu');
    expect(kws).toContain('poistky');
    expect(kws.filter((k) => k === 'poistenie')).toHaveLength(1);
    expect(kws).not.toContain('tri');
  });

  it('caps at 20 keywords', () => {
    const text = Array.from({ length: 40 }, (_, i) => `slovo${i}xyz`).join(' ');
    expect(extractKeywords(text).length).toBeLessThanOrEqual(20);
  });
});

describe('scoreDocument', () => {
  const doc = {
    title: 'Poistenie príjmu — základy',
    content: 'Poistenie príjmu kryje výpadok príjmu pri PN. Poistenie je kľúčové.',
    tags: ['poistenie', 'príjem'],
  };

  it('scores title matches highest', () => {
    const withTitle = scoreDocument(doc, ['poistenie']);
    const contentOnly = scoreDocument(
      { ...doc, title: 'Iný názov', tags: [] },
      ['poistenie'],
    );
    expect(withTitle).toBeGreaterThan(contentOnly);
  });

  it('returns 0 for unrelated keywords or empty input', () => {
    expect(scoreDocument(doc, ['hypotéka'])).toBe(0);
    expect(scoreDocument(doc, [])).toBe(0);
  });

  it('ignores too-short keywords', () => {
    expect(scoreDocument(doc, ['pn'])).toBe(0);
  });

  it('caps repeated content matches at 5', () => {
    const spammy = {
      title: 'x',
      content: Array(50).fill('poistenie').join(' '),
      tags: [],
    };
    expect(scoreDocument(spammy, ['poistenie'])).toBe(5);
  });
});
