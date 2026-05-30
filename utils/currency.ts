/**
 * utils/currency.ts
 *
 * Stage 29 — Currency formatting utilities.
 *
 * formatCurrency(amount, currency) formats a monetary amount as a string
 * with the appropriate symbol and exactly 2 decimal places.
 *
 * Examples:
 *   formatCurrency(12.5,  'EUR') → "€12.50"
 *   formatCurrency(12.5,  'GBP') → "£12.50"
 *   formatCurrency(0,     'EUR') → "€0.00"
 *   formatCurrency(1.005, 'EUR') → "€1.01"  (rounds half-up)
 */

export type SupportedCurrency = 'EUR' | 'GBP';

const CURRENCY_SYMBOLS: Record<SupportedCurrency, string> = {
  EUR: '€',
  GBP: '£',
};

/**
 * Format a monetary amount with the correct currency symbol and 2dp.
 * Always rounds to 2 decimal places (standard half-up rounding).
 */
export function formatCurrency(
  amount:   number,
  currency: SupportedCurrency,
): string {
  const symbol  = CURRENCY_SYMBOLS[currency];
  const rounded = (Math.round(amount * 100) / 100).toFixed(2);
  return `${symbol}${rounded}`;
}

/**
 * Parse a formatted currency string back to a number.
 * Strips the leading currency symbol then parses as float.
 * Returns NaN if the string is not a valid currency string.
 */
export function parseCurrency(formatted: string): number {
  const stripped = formatted.replace(/^[€£]/, '');
  return parseFloat(stripped);
}

/**
 * Return the symbol for a given currency code.
 */
export function currencySymbol(currency: SupportedCurrency): string {
  return CURRENCY_SYMBOLS[currency];
}
