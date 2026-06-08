/**
 * __tests__/unit/mileageTracking.test.ts
 * Block 4C — cumulative annual distance + tax-year reset + manual increment guard.
 */
import {
  taxYearStart,
  cumulativeForTaxYear,
  recordIncrement,
  shouldFlagForSupport,
  type MileageIncrement,
} from '../../utils/mileageTracking';

describe('taxYearStart — ROI (1 January)', () => {
  it('returns 1 Jan of the current year', () => {
    expect(taxYearStart('ROI', new Date('2026-06-08T12:00:00Z')).toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });
  it('a journey booked on 1 Jan lands in the new year', () => {
    expect(taxYearStart('ROI', new Date('2026-01-01T00:00:00Z')).toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });
});

describe('taxYearStart — UK (6 April)', () => {
  it('after 6 April → this year', () => {
    expect(taxYearStart('UK', new Date('2026-06-08T12:00:00Z')).toISOString()).toBe('2026-04-06T00:00:00.000Z');
  });
  it('before 6 April → previous year', () => {
    expect(taxYearStart('UK', new Date('2026-03-01T12:00:00Z')).toISOString()).toBe('2025-04-06T00:00:00.000Z');
    expect(taxYearStart('UK', new Date('2026-04-05T23:59:59Z')).toISOString()).toBe('2025-04-06T00:00:00.000Z');
  });
  it('a journey booked on the 6 April reset day lands in the new tax year', () => {
    expect(taxYearStart('UK', new Date('2026-04-06T00:00:00Z')).toISOString()).toBe('2026-04-06T00:00:00.000Z');
  });
});

describe('cumulativeForTaxYear — resets automatically', () => {
  const now = new Date('2026-06-08T12:00:00Z');

  it('ROI: excludes increments before 1 Jan, includes those after', () => {
    const incs: MileageIncrement[] = [
      { amount: 500, at: '2025-12-31T10:00:00Z', source: 'journey' }, // previous year — excluded
      { amount: 200, at: '2026-02-01T10:00:00Z', source: 'journey' }, // this year — included
      { amount: 100, at: '2026-05-01T10:00:00Z', source: 'manual'  }, // this year — included
    ];
    expect(cumulativeForTaxYear(incs, 'ROI', now)).toBe(300);
  });

  it('UK: a 1 April increment is in the OLD tax year and excluded after 6 April', () => {
    const incs: MileageIncrement[] = [
      { amount: 400, at: '2026-04-01T10:00:00Z', source: 'journey' }, // before 6 Apr — old year, excluded
      { amount: 150, at: '2026-04-06T10:00:00Z', source: 'journey' }, // on/after reset — included
    ];
    expect(cumulativeForTaxYear(incs, 'UK', now)).toBe(150);
  });
});

describe('recordIncrement', () => {
  it('appends without mutating', () => {
    const start: MileageIncrement[] = [];
    const at = new Date('2026-06-08T12:00:00Z');
    const next = recordIncrement(start, 42, 'journey', at);
    expect(start).toHaveLength(0);
    expect(next).toEqual([{ amount: 42, at: '2026-06-08T12:00:00.000Z', source: 'journey' }]);
  });
});

describe('shouldFlagForSupport — over-clicking the manual +1', () => {
  const now = new Date('2026-06-08T12:00:00Z');
  function manualAt(secondsAgo: number): MileageIncrement {
    return { amount: 1, at: new Date(now.getTime() - secondsAgo * 1000).toISOString(), source: 'manual' };
  }

  it('flags more than 5 manual increments within the window', () => {
    const incs = [0, 5, 10, 15, 20, 25].map(manualAt); // 6 within 60s
    expect(shouldFlagForSupport(incs, now)).toBe(true);
  });
  it('does not flag 5 or fewer', () => {
    const incs = [0, 5, 10, 15, 20].map(manualAt); // 5 within 60s
    expect(shouldFlagForSupport(incs, now)).toBe(false);
  });
  it('ignores journey-sourced increments', () => {
    const incs: MileageIncrement[] = [0, 5, 10, 15, 20, 25].map((s) => ({
      amount: 1, at: new Date(now.getTime() - s * 1000).toISOString(), source: 'journey',
    }));
    expect(shouldFlagForSupport(incs, now)).toBe(false);
  });
});
