import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GmailParser } from './gmail.parser';

const fixture = readFileSync(
  join(__dirname, '..', '..', 'test', 'fixtures', 'facebook-notification.html'),
  'utf-8',
);

describe('GmailParser.parseFacebookNotification', () => {
  const parser = new GmailParser();

  it('extracts author, profile, messenger, post and group from notification HTML', () => {
    const result = parser.parseFacebookNotification(fixture, '');

    expect(result.authorName).toBe('Ján Novák');
    expect(result.profileUrl).toBe('https://www.facebook.com/jan.novak');
    expect(result.messengerUrl).toBe('https://m.me/jan.novak');
    expect(result.postUrl).toBe(
      'https://www.facebook.com/groups/podnikatelia.slovensko/posts/987654321/',
    );
    expect(result.groupName).toBe('Podnikatelia Slovensko');
    expect(result.postText).toContain('autoservis v Ziline');
    expect(result.postText).not.toContain('unsubscribe');
  });

  it('unwraps l.facebook.com redirect URLs (u= parameter)', () => {
    const html = `<html><body>
      <a href="https://l.facebook.com/l.php?u=https%3A%2F%2Fwww.facebook.com%2Fpeter.kral&h=AT0abc">Peter Kral</a>
      <div>Hladam grafika na logo pre novu kaviaren v Bratislave, vie niekto poradit?</div>
    </body></html>`;

    const result = parser.parseFacebookNotification(html, '');

    expect(result.authorName).toBe('Peter Kral');
    expect(result.profileUrl).toBe('https://www.facebook.com/peter.kral');
    expect(result.messengerUrl).toBe('https://m.me/peter.kral');
  });

  it('falls back to the snippet when HTML body is empty', () => {
    const snippet =
      'Mária Horváthová pridala nový príspevok v skupine Podnikatelia Slovensko';
    const result = parser.parseFacebookNotification('', snippet);

    expect(result.authorName).toBe('Mária Horváthová');
    expect(result.postText).toBe(snippet);
    expect(result.profileUrl).toBe('');
  });

  it('survives malformed HTML without crashing', () => {
    const result = parser.parseFacebookNotification(
      '<div><a href="broken',
      'Jozef Malý napísal príspevok',
    );

    expect(result.authorName).toBe('Jozef Malý');
  });

  it('returns empty fields when there is nothing to parse', () => {
    const result = parser.parseFacebookNotification('', '');
    expect(result.authorName).toBe('');
    expect(result.postText).toBe('');
  });
});
