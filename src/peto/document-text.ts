import * as mammoth from 'mammoth';

export type PetoDocType = 'pdf' | 'docx' | 'txt' | 'md' | 'csv';

export class UnsupportedFileError extends Error {
  constructor(hint: string) {
    super(hint);
    this.name = 'UnsupportedFileError';
  }
}

export class EmptyDocumentError extends Error {
  constructor(hint: string) {
    super(hint);
    this.name = 'EmptyDocumentError';
  }
}

/**
 * Decide the document type from MIME + filename extension. Browsers sometimes
 * send application/octet-stream for .docx, so the extension is a fallback.
 * Pure — unit tested.
 */
export function resolveDocType(mimeType: string, fileName: string): PetoDocType | null {
  const mime = (mimeType || '').split(';')[0].trim().toLowerCase();
  const ext = (fileName.split('.').pop() || '').toLowerCase();

  if (mime === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === 'docx'
  ) {
    return 'docx';
  }
  if (mime === 'text/markdown' || ext === 'md' || ext === 'markdown') return 'md';
  if (mime === 'text/csv' || ext === 'csv') return 'csv';
  if (mime === 'text/plain' || ext === 'txt') return 'txt';
  return null;
}

/** Collapse excess whitespace so the stored text is clean and compact. */
export function normalizeText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

export interface ExtractedDocument {
  text: string;
  sourceType: PetoDocType;
}

/**
 * Extract plain text from an uploaded document buffer.
 * Supports PDF, DOCX, and plain-text formats (txt/md/csv).
 */
export async function extractText(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<ExtractedDocument> {
  const type = resolveDocType(mimeType, fileName);
  if (!type) {
    throw new UnsupportedFileError(
      'Nepodporovaný typ súboru. Podporované: PDF, Word (.docx), .txt, .md, .csv.',
    );
  }

  let text: string;
  if (type === 'pdf') {
    // Lazy-load so the (pdfjs-based) parser only loads when a PDF is actually
    // uploaded — keeps startup and the non-PDF test paths light.
    const { default: pdfParse } = await import('pdf-parse');
    const parsed = await pdfParse(buffer);
    text = normalizeText(parsed.text || '');
    if (!text) {
      throw new EmptyDocumentError(
        'Z tohto PDF sa nedal vytiahnuť text (pravdepodobne sken/obrázok). OCR zatiaľ nie je podporované.',
      );
    }
  } else if (type === 'docx') {
    const result = await mammoth.extractRawText({ buffer });
    text = normalizeText(result.value || '');
    if (!text) {
      throw new EmptyDocumentError('Word dokument je prázdny alebo sa nedal prečítať.');
    }
  } else {
    text = normalizeText(buffer.toString('utf-8'));
    if (!text) {
      throw new EmptyDocumentError('Súbor je prázdny.');
    }
  }

  return { text, sourceType: type };
}
