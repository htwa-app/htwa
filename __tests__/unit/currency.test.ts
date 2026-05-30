/**
 * __tests__/unit/currency.test.ts
 *
 * Stage 29 — unit tests for utils/currency.ts
 */

import { formatCurrency, parseCurrency, currencySymbol } from '../../utils/currency';

// ─── formatCurrency ───────────────────────────────────────────────────────────

describe('formatCurrency — EUR', () => {
  it('formats whole number with 2 decimal places', () => {
    expect(formatCurrency(12, 'EUR')).toBe('€12.00');
  });

  it('formats decimal correctly', () => {
    expect(formatCurrency(12.5, 'EUR')).toBe('€12.50');
  });

  it('formats zero', () => {
    expect(formatCurrency(0, 'EUR')).toBe('€0.00');
  });

  it('rounds to 2 decimal places', () => {
    expect(formatCurrency(12.555, 'EUR')).toBe('€12.56');
  });

  it('formats a typical fare', () => {
    expect(formatCurrency(14.75, 'EUR')).toBe('€14.75');
  });

  it('uses € symbol', () => {
    expect(formatCurrency(1, 'EUR').startsWith('€')).toBe(true);
  });
});

describe('formatCurrency — GBP', () => {
  it('formats whole number with 2 decimal places', () => {
    expect(formatCurrency(10, 'GBP')).toBe('£10.00');
  });

  it('formats decimal correctly', () => {
    expect(formatCurrency(12.5, 'GBP')).toBe('£12.50');
  });

  it('formats zero', () => {
    expect(formatCurrency(0, 'GBP')).toBe('£0.00');
  });

  it('rounds to 2 decimal places', () => {
    expect(formatCurrency(9.999, 'GBP')).toBe('£10.00');
  });

  it('uses £ symbol', () => {
    expect(formatCurrency(1, 'GBP').startsWith('£')).toBe(true);
  });
});

// ─── parseCurrency ────────────────────────────────────────────────────────────

describe('parseCurrency', () => {
  it('parses a EUR formatted string', () => {
    expect(parseCurrency('€12.50')).toBeCloseTo(12.50);
  });

  it('parses a GBP formatted string', () => {
    expect(parseCurrency('£14.75')).toBeCloseTo(14.75);
  });

  it('parses zero', () => {
    expect(parseCurrency('€0.00')).toBe(0);
  });

  it('returns NaN for invalid input', () => {
    expect(parseCurrency('not-a-price')).toBeNaN();
  });
});

// ─── currencySymbol ───────────────────────────────────────────────────────────

describe('currencySymbol', () => {
  it('returns € for EUR', () => {
    expect(currencySymbol('EUR')).toBe('€');
  });

  it('returns £ for GBP', () => {
    expect(currencySymbol('GBP')).toBe('£');
  });
});

// ─── Round-trip ───────────────────────────────────────────────────────────────

describe('formatCurrency / parseCurrency round-trip', () => {
  it('parses back to same value after formatting (EUR)', () => {
    const amount = 27.43;
    expect(parseCurrency(formatCurrency(amount, 'EUR'))).toBeCloseTo(amount);
  });

  it('parses back to same value after formatting (GBP)', () => {
    const amount = 18.99;
    expect(parseCurrency(formatCurrency(amount, 'GBP'))).toBeCloseTo(amount);
  });
});
