export type SupportedCurrencyCode = 'USD' | 'EUR';

export function normalizeCurrencyCode(value: unknown): SupportedCurrencyCode {
  const normalized = String(value || '')
    .trim()
    .toUpperCase();

  if (normalized === 'EUR') {
    return 'EUR';
  }

  return 'USD';
}

export function toStripeCurrency(code: SupportedCurrencyCode): 'usd' | 'eur' {
  return code === 'EUR' ? 'eur' : 'usd';
}

export function formatCurrency(
  amount: number,
  currencyCode: SupportedCurrencyCode,
  locale = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
}
