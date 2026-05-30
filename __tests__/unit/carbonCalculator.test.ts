/**
 * __tests__/unit/carbonCalculator.test.ts
 * Stage 62 — unit tests for utils/carbonCalculator.ts
 */
import { calculateCO2Savings } from '../../utils/carbonCalculator';

describe('calculateCO2Savings', () => {
  it('calculates grams saved for 1 passenger over 100km', () => {
    const result = calculateCO2Savings(100, 1);
    expect(result.savedGrams).toBe(17000); // 100 × 170
  });

  it('scales linearly with passengers', () => {
    const one = calculateCO2Savings(100, 1);
    const two = calculateCO2Savings(100, 2);
    expect(two.savedGrams).toBe(one.savedGrams * 2);
  });

  it('converts to kg correctly', () => {
    const result = calculateCO2Savings(100, 1);
    expect(result.savedKg).toBe(17.00);
  });

  it('calculates trees equivalent', () => {
    const result = calculateCO2Savings(100, 1);
    // 17kg / 21 kg per tree = 0.81
    expect(result.treesEquivalent).toBeCloseTo(0.81, 1);
  });

  it('returns zero for zero distance', () => {
    const result = calculateCO2Savings(0, 3);
    expect(result.savedGrams).toBe(0);
    expect(result.savedKg).toBe(0);
  });

  it('throws for negative distance', () => {
    expect(() => calculateCO2Savings(-1, 2)).toThrow('non-negative');
  });

  it('throws for zero passengers', () => {
    expect(() => calculateCO2Savings(100, 0)).toThrow('at least 1');
  });
});
