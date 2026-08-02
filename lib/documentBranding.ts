export type DocumentKind = 'estimate' | 'invoice';

const DEFAULT_SEQUENCE_START = 1001;
const DEFAULT_HEADER_COLOR = '#009966';

export function normalizeDocumentSequenceNumber(value: unknown, fallback = DEFAULT_SEQUENCE_START): number {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

export function normalizeDocumentEmailHeaderColor(value: unknown): string {
  const raw = String(value ?? '').trim();
  const normalized = raw.startsWith('#') ? raw : `#${raw}`;

  if (!/^#[0-9a-fA-F]{6}$/.test(normalized)) {
    return DEFAULT_HEADER_COLOR;
  }

  return normalized.toUpperCase();
}

export function formatDocumentNumber(kind: DocumentKind, value: unknown): string | null {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return null;
  }

  const prefix = kind === 'estimate' ? 'EST' : 'INV';
  return `${prefix}-${String(parsed).padStart(4, '0')}`;
}

export function getDefaultDocumentSequenceStart(): number {
  return DEFAULT_SEQUENCE_START;
}

export function getDefaultDocumentEmailHeaderColor(): string {
  return DEFAULT_HEADER_COLOR;
}