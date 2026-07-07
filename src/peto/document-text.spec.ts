import { describe, expect, it } from 'vitest';
import {
  EmptyDocumentError,
  extractText,
  normalizeText,
  resolveDocType,
  UnsupportedFileError,
} from './document-text';

describe('resolveDocType', () => {
  it('detects by MIME', () => {
    expect(resolveDocType('application/pdf', 'x')).toBe('pdf');
    expect(
      resolveDocType(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'x',
      ),
    ).toBe('docx');
    expect(resolveDocType('text/plain', 'x')).toBe('txt');
    expect(resolveDocType('text/markdown', 'x')).toBe('md');
    expect(resolveDocType('text/csv', 'x')).toBe('csv');
  });

  it('falls back to the file extension (browser sends octet-stream for .docx)', () => {
    expect(resolveDocType('application/octet-stream', 'zmluva.docx')).toBe('docx');
    expect(resolveDocType('application/octet-stream', 'cennik.pdf')).toBe('pdf');
    expect(resolveDocType('', 'poznamky.md')).toBe('md');
    expect(resolveDocType('', 'data.csv')).toBe('csv');
  });

  it('returns null for unsupported types', () => {
    expect(resolveDocType('image/png', 'foto.png')).toBeNull();
    expect(resolveDocType('application/zip', 'archiv.zip')).toBeNull();
  });
});

describe('normalizeText', () => {
  it('collapses excess whitespace and trims', () => {
    expect(normalizeText('a\r\n\n\n\nb   c   \n')).toBe('a\n\nb c');
  });
});

describe('extractText (plain-text formats)', () => {
  it('reads txt/md/csv from the buffer', async () => {
    const out = await extractText(
      Buffer.from('Cenník: balík A 200 €', 'utf-8'),
      'text/plain',
      'cennik.txt',
    );
    expect(out.sourceType).toBe('txt');
    expect(out.text).toContain('balík A');
  });

  it('rejects unsupported files', async () => {
    await expect(
      extractText(Buffer.from('x'), 'image/png', 'foto.png'),
    ).rejects.toBeInstanceOf(UnsupportedFileError);
  });

  it('rejects empty text files', async () => {
    await expect(
      extractText(Buffer.from('   \n  '), 'text/plain', 'prazdny.txt'),
    ).rejects.toBeInstanceOf(EmptyDocumentError);
  });
});
