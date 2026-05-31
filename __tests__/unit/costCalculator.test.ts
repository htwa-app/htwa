/**
 * __tests__/unit/costCalculator.test.ts
 *
 * Stage 28 — full unit tests for utils/costCalculator.ts
 */

import { calculateRideCost, isWithinCap } from '../../utils/costCalculator';

// ─── ROI driver ───────────────────────────────────────────────────────────────

describe('calculateRideCost — ROI driver', () => {
  it('uses EUR currency', () => {
    const r = calculateRideCost(100, 3, 'ROI');
    expect(r.currency).toBe('EUR');
  });

  it('applies 0.43 EUR/km rate', () => {
    const r = calculateRideCost(100, 3, 'ROI');
    expect(r.rateApplied).toBe(0.43);
  });

  it('calculates total cost correctly at 100km', () => {
    const r = calculateRideCost(100, 3, 'ROI');
    expect(r.totalCost).toBe(43.00);   // 100 × 0.43
  });

  it('calculates per-seat cost split equally among 4 travellers (driver+3)', () => {
    const r = calculateRideCost(100, 3, 'ROI');
    // totalCost = 43.00; per seat = 43 / (3+1) = 10.75
    expect(r.perSeatCost).toBe(10.75);
  });

  it('calculates per-seat cost for 1 passenger correctly', () => {
    const r = calculateRideCost(100, 1, 'ROI');
    // 43 / (1+1) = 21.50
    expect(r.perSeatCost).toBe(21.50);
  });

  it('rounds monetary values to 2 decimal places', () => {
    // 70km × 0.43 = 30.1; /4 = 7.525 → 7.53
    const r = calculateRideCost(70, 3, 'ROI');
    expect(r.totalCost).toBe(30.10);
    // 30.10 / 4 = 7.525 → rounds to 7.53
    expect(r.perSeatCost).toBe(7.53);
  });

  it('returns zero total and per-seat for 0km', () => {
    const r = calculateRideCost(0, 2, 'ROI');
    expect(r.totalCost).toBe(0);
    expect(r.perSeatCost).toBe(0);
  });
});

// ─── NI driver ────────────────────────────────────────────────────────────────

describe('calculateRideCost — NI driver', () => {
  it('uses GBP currency', () => {
    const r = calculateRideCost(100, 3, 'NI');
    expect(r.currency).toBe('GBP');
  });

  it('applies 0.2796 GBP/km rate', () => {
    const r = calculateRideCost(100, 3, 'NI');
    expect(r.rateApplied).toBe(0.2796);
  });

  it('calculates total cost correctly at 100km', () => {
    const r = calculateRideCost(100, 3, 'NI');
    expect(r.totalCost).toBe(27.96);  // 100 × 0.2796
  });

  it('calculates per-seat cost for 3 passengers', () => {
    const r = calculateRideCost(100, 3, 'NI');
    // 27.96 / 4 = 6.99
    expect(r.perSeatCost).toBe(6.99);
  });
});

// ─── Cross-border ─────────────────────────────────────────────────────────────

describe('calculateRideCost — cross-border', () => {
  it('uses ROI rate for a ROI-based driver on a cross-border journey', () => {
    const r = calculateRideCost(200, 2, 'ROI');
    expect(r.currency).toBe('EUR');
    expect(r.totalCost).toBe(86.00);  // 200 × 0.43
  });

  it('uses NI rate for a NI-based driver on a cross-border journey', () => {
    const r = calculateRideCost(200, 2, 'NI');
    expect(r.currency).toBe('GBP');
    expect(r.totalCost).toBe(55.92);  // 200 × 0.2796
  });
});

// ─── Cap enforcement ──────────────────────────────────────────────────────────

describe('calculateRideCost — cap enforcement', () => {
  it('per-seat cost × (seats+1) reconciles to totalCost for ROI', () => {
    for (const seats of [1, 2, 3, 4, 5, 6, 7]) {
      const r = calculateRideCost(100, seats, 'ROI');
      // driver + passengers each pay one equal share → sum equals journey cost
      expect(r.perSeatCost * (seats + 1)).toBeCloseTo(r.totalCost, 1);
    }
  });

  it('per-seat cost × (seats+1) reconciles to totalCost for NI', () => {
    for (const seats of [1, 2, 3, 4, 5, 6, 7]) {
      const r = calculateRideCost(150, seats, 'NI');
      expect(r.perSeatCost * (seats + 1)).toBeCloseTo(r.totalCost, 1);
    }
  });
});

// ─── isWithinCap ─────────────────────────────────────────────────────────────

describe('isWithinCap', () => {
  it('returns true when proposed price is within cap', () => {
    // totalCost = 100 × 0.43 = 43; 3 seats → max per seat = 43/3 = 14.33
    expect(isWithinCap(10, 3, 100, 'ROI')).toBe(true);
  });

  it('returns false when proposed price × seats exceeds total cost', () => {
    // totalCost = 43; 3 × 15 = 45 > 43
    expect(isWithinCap(15, 3, 100, 'ROI')).toBe(false);
  });

  it('returns true exactly at the cap boundary', () => {
    // totalCost = 100 * 0.43 = 43; exactCap = 43 / 3 = 14.333...
    const exactCap = (100 * 0.43) / 3;
    expect(isWithinCap(exactCap, 3, 100, 'ROI')).toBe(true);
    expect(isWithinCap(exactCap + 0.01, 3, 100, 'ROI')).toBe(false);
  });
});

// ─── Validation ───────────────────────────────────────────────────────────────

describe('calculateRideCost — validation', () => {
  it('throws for negative distance', () => {
    expect(() => calculateRideCost(-1, 2, 'ROI')).toThrow('distanceKm must be non-negative');
  });

  it('throws for 0 seats', () => {
    expect(() => calculateRideCost(100, 0, 'ROI')).toThrow('seats must be at least 1');
  });

  it('throws for more than 7 seats', () => {
    expect(() => calculateRideCost(100, 8, 'ROI')).toThrow('seats cannot exceed 7');
  });
});
