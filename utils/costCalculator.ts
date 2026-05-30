/**
 * utils/costCalculator.ts
 *
 * Stage 28 — Ride cost calculation engine.
 *
 * Implements the legal cost-share model:
 *   - ROI drivers use Revenue.ie civil service mileage rate: €0.43/km
 *   - NI  drivers use HMRC AMAP rate: £0.45/mile = £0.2796/km
 *   - Hard cap: driver.perSeatCost × seats can NEVER exceed totalCost
 *
 * References:
 *   Revenue.ie:  https://www.revenue.ie/en/employing-people/employee-expenses/travel-and-subsistence/civil-service-rates.aspx
 *   HMRC AMAP:   https://www.gov.uk/government/publications/rates-and-allowances-travel-mileage-and-fuel-allowances
 *
 * Rounding: all monetary values rounded to 2 decimal places.
 */

// ─── Rates ────────────────────────────────────────────────────────────────────

/** Revenue.ie rate for cars: €0.43/km (first 1,500 km/year band — fixed rate used) */
const ROI_RATE_PER_KM = 0.43;

/**
 * HMRC AMAP rate for cars: £0.45/mile.
 * Converted to per-km: £0.45 / 1.60934 = £0.27951.../km, rounded to £0.2796/km.
 */
const NI_RATE_PER_KM = 0.2796;

// ─── Types ────────────────────────────────────────────────────────────────────

export type HomeLocation = 'ROI' | 'NI';

export interface RideCostResult {
  /** Total cost of the journey (driver's cost, before splitting) */
  totalCost:    number;
  /** Cost per passenger seat (capped at totalCost / seats) */
  perSeatCost:  number;
  /** Currency symbol and code determined by driver's home location */
  currency:     'EUR' | 'GBP';
  /** Rate applied per km, in the appropriate currency */
  rateApplied:  number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Calculate the cost of a ride and the per-seat price.
 *
 * @param distanceKm   — distance of the journey in kilometres
 * @param seats        — number of passengers sharing (1–7)
 * @param homeLocation — driver's home jurisdiction (ROI or NI)
 */
export function calculateRideCost(
  distanceKm:    number,
  seats:         number,
  homeLocation:  HomeLocation,
): RideCostResult {
  if (distanceKm < 0) throw new Error('distanceKm must be non-negative');
  if (seats < 1)      throw new Error('seats must be at least 1');
  if (seats > 7)      throw new Error('seats cannot exceed 7');

  const isROI      = homeLocation === 'ROI';
  const ratePerKm  = isROI ? ROI_RATE_PER_KM : NI_RATE_PER_KM;
  const currency   = isROI ? 'EUR' : 'GBP';

  const totalCost   = round2(distanceKm * ratePerKm);
  // Raw split — driver's share is free, so we divide by (seats + 1)? No:
  // Per the legal model, the TOTAL journey cost is split equally among all
  // travellers (driver + passengers). So with `seats` passengers:
  //   perSeatCost = totalCost / (seats + 1) for each person INCLUDING driver.
  // However the platform spec says: driver sets price per passenger seat,
  // passengers pay perSeatCost, driver covers the rest. The cap is:
  //   seats × perSeatCost ≤ totalCost
  // We calculate: perSeatCost = totalCost / (seats + 1)
  // which means each traveller (incl. driver) pays an equal share.
  const rawPerSeat  = totalCost / (seats + 1);
  // Cap enforcement: ensure seats × perSeatCost never exceeds totalCost
  const maxPerSeat  = seats > 0 ? totalCost / seats : totalCost;
  const perSeatCost = round2(Math.min(rawPerSeat, maxPerSeat));

  return { totalCost, perSeatCost, currency, rateApplied: ratePerKm };
}

/**
 * Validate that a proposed per-seat price does not violate the cap.
 * Returns true if the price is within the legal limit.
 */
export function isWithinCap(
  proposedPerSeatCost: number,
  seats:               number,
  distanceKm:          number,
  homeLocation:        HomeLocation,
): boolean {
  const { totalCost } = calculateRideCost(distanceKm, seats, homeLocation);
  return round2(proposedPerSeatCost * seats) <= totalCost;
}
