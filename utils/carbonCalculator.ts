/**
 * utils/carbonCalculator.ts
 *
 * Stage 62 — CO₂ savings calculator.
 *
 * Calculates CO₂ saved by sharing a ride vs each person driving solo.
 *
 * Reference values (approximate, 2026):
 *   Average car CO₂ emissions: 170 g/km (UK/Ireland average petrol car)
 *   By sharing N seats: (N passengers) * distance * emissionsPerKm
 *   → those N passengers didn't each drive their own car
 */

/** Average grams of CO₂ per km for a typical petrol car (Ireland/UK) */
const CO2_GRAMS_PER_KM = 170;

export interface CO2Savings {
  /** Grams of CO₂ saved */
  savedGrams: number;
  /** Kilograms of CO₂ saved (rounded to 2dp) */
  savedKg: number;
  /** Trees equivalent (1 tree absorbs ~21kg CO₂/year) */
  treesEquivalent: number;
}

/**
 * Calculate CO₂ saved by N passengers sharing a ride vs driving solo.
 *
 * @param distanceKm   — journey distance in km
 * @param passengers   — number of passengers (not including driver)
 */
export function calculateCO2Savings(
  distanceKm: number,
  passengers: number,
): CO2Savings {
  if (distanceKm < 0)  throw new Error('distanceKm must be non-negative');
  if (passengers < 1)  throw new Error('passengers must be at least 1');

  // Each passenger would have driven their own car for this distance
  const savedGrams = passengers * distanceKm * CO2_GRAMS_PER_KM;
  const savedKg    = Math.round(savedGrams / 1000 * 100) / 100;
  const treesEquivalent = Math.round(savedKg / 21 * 100) / 100;

  return { savedGrams, savedKg, treesEquivalent };
}
