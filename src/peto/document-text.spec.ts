import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import {
  EmptyDocumentError,
  extractText,
  normalizeText,
  resolveDocType,
  UnsupportedFileError,
  workbookToText,
} from './document-text';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

async function buildWorkbookBuffer(
  build: (workbook: ExcelJS.Workbook) => void,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  build(workbook);
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

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
    expect(resolveDocType(XLSX_MIME, 'x')).toBe('xlsx');
  });

  it('falls back to the file extension (browser sends octet-stream for .docx)', () => {
    expect(resolveDocType('application/octet-stream', 'zmluva.docx')).toBe('docx');
    expect(resolveDocType('application/octet-stream', 'cennik.pdf')).toBe('pdf');
    expect(resolveDocType('', 'poznamky.md')).toBe('md');
    expect(resolveDocType('', 'data.csv')).toBe('csv');
    expect(resolveDocType('application/octet-stream', 'data.xlsx')).toBe('xlsx');
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

describe('extractText (xlsx)', () => {
  it('reads multi-sheet workbooks into header:value text sections', async () => {
    const buffer = await buildWorkbookBuffer((workbook) => {
      const data = workbook.addWorksheet('Dáta');
      data.addRow(['Video', 'Views', 'CTA']);
      data.addRow(['reel_01', 15320, '3.2%']);
      data.addRow(['reel_02', 8400, '1.1%']);

      const trend = workbook.addWorksheet('Trend');
      trend.addRow(['Mesiac', 'Priemer views']);
      trend.addRow(['Marec', 11860]);
    });

    const out = await extractText(buffer, XLSX_MIME, 'reels.xlsx');
    expect(out.sourceType).toBe('xlsx');
    expect(out.text).toContain('## List: Dáta');
    expect(out.text).toContain('Video: reel_01');
    expect(out.text).toContain('Views: 15320');
    expect(out.text).toContain('## List: Trend');
    expect(out.text).toContain('Mesiac: Marec');
  });

  it('rejects an empty workbook', async () => {
    const buffer = await buildWorkbookBuffer((workbook) => {
      workbook.addWorksheet('Prázdny');
    });

    await expect(extractText(buffer, XLSX_MIME, 'prazdny.xlsx')).rejects.toBeInstanceOf(
      EmptyDocumentError,
    );
  });

  it('rejects a corrupted xlsx buffer', async () => {
    await expect(
      extractText(Buffer.from('not a real xlsx file'), XLSX_MIME, 'bad.xlsx'),
    ).rejects.toBeInstanceOf(UnsupportedFileError);
  });

  it('truncates sheets beyond the row cap', async () => {
    const buffer = await buildWorkbookBuffer((workbook) => {
      const sheet = workbook.addWorksheet('Veľký');
      sheet.addRow(['Index']);
      for (let i = 0; i < 550; i++) {
        sheet.addRow([i]);
      }
    });

    const out = await extractText(buffer, XLSX_MIME, 'velky.xlsx');
    expect(out.text).toContain('skrátené');
    expect(out.text).toContain('550');
  });
});

describe('workbookToText', () => {
  it('skips hidden sheets and header-only sheets', async () => {
    const workbook = new ExcelJS.Workbook();
    const visible = workbook.addWorksheet('Viditeľný');
    visible.addRow(['Meno', 'Vek']);
    visible.addRow(['Peter', 30]);

    const headerOnly = workbook.addWorksheet('LenHlavicka');
    headerOnly.addRow(['Stĺpec']);

    const hidden = workbook.addWorksheet('Skrytý', { state: 'hidden' });
    hidden.addRow(['Tajné']);
    hidden.addRow(['data']);

    const text = workbookToText(workbook);
    expect(text).toContain('## List: Viditeľný');
    expect(text).toContain('Meno: Peter');
    expect(text).not.toContain('LenHlavicka');
    expect(text).not.toContain('Skrytý');
  });
});
