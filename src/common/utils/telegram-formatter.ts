export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function bold(text: string): string {
  return `<b>${escapeHtml(text)}</b>`;
}

export function italic(text: string): string {
  return `<i>${escapeHtml(text)}</i>`;
}

export function code(text: string): string {
  return `<code>${escapeHtml(text)}</code>`;
}

export function link(text: string, url: string): string {
  return `<a href="${url}">${escapeHtml(text)}</a>`;
}

export function formatLeadStatus(status: string): string {
  const map: Record<string, string> = {
    NEW: 'Novy',
    CONTACTED: 'Kontaktovany',
    REPLIED: 'Odpovedal',
    QUALIFIED: 'Kvalifikovany',
    CONVERTED: 'Konvertovany',
    REJECTED: 'Zamietnuty',
  };
  return map[status] || status;
}

export function formatDate(date: Date): string {
  return date.toLocaleString('sk-SK', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}
