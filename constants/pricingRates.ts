/**
 * constants/pricingRates.ts
 *
 * Block 4 — single source of truth for mileage rate tables and fees.
 *
 * These are the official HMRC AMAP (UK) and Revenue civil-service (ROI) figures,
 * keyed by the DRIVER'S TAX RESIDENCE (not the journey's origin). They are
 * intended to be admin-editable: the same values are seeded into the
 * `pricing_rates` table via migration so they can be updated annually without a
 * code release. The app currently reads these TS constants as the source of
 * truth for the pure pricing engine; loading DB overrides at runtime is a TODO.
 *
 * Units: ROI rates are EUR per kilometre; UK rates are GBP per mile.
 *
 * ⚠️ Rates change annually — confirm against the current published figures each
 *    tax year and update both this file and the seeded `pricing_rates` rows.
 */

export type Jurisdiction = 'UK' | 'ROI';

/** ROI rate columns by vehicle engine capacity. */
export type EngineCcBand = 'le1200' | 'cc1201to1500' | 'ge1501';

export interface RoiBand {
  /** Inclusive upper bound of cumulative km for this band (Infinity for the top band). */
  upperKm: number;
  label: string;
  /** EUR per km, by engine-capacity column. */
  rates: Record<EngineCcBand, number>;
}

export interface UkBand {
  /** Inclusive upper bound of cumulative miles for this band. */
  upperMiles: number;
  label: string;
  /** GBP per mile. */
  rate: number;
}

// Flat passenger fees (Block 4E).
export const SERVICE_CHARGE_RATE = 0.10; // 10% of driverSeatPrice
export const BOOKING_FEE = 2;            // flat €2 (ROI) / £2 (UK)

/**
 * ROI — Revenue civil-service motor-travel rates (EUR per km), banded by
 * cumulative annual distance and engine capacity. NOTE: these bands are NOT
 * monotonic — band 2 is higher than bands 1 and 3 — which is why the
 * band-straddle rule compares actual numeric rate values, not band order.
 */
export const ROI_BANDS: RoiBand[] = [
  { upperKm: 1500,     label: 'Band 1 (up to 1,500 km)',   rates: { le1200: 0.4180, cc1201to1500: 0.4340, ge1501: 0.5182 } },
  { upperKm: 5500,     label: 'Band 2 (1,501–5,500 km)',   rates: { le1200: 0.7264, cc1201to1500: 0.7918, ge1501: 0.9063 } },
  { upperKm: 25000,    label: 'Band 3 (5,501–25,000 km)',  rates: { le1200: 0.3178, cc1201to1500: 0.3179, ge1501: 0.3922 } },
  { upperKm: Infinity, label: 'Band 4 (25,001 km+)',       rates: { le1200: 0.2056, cc1201to1500: 0.2385, ge1501: 0.2587 } },
];

/**
 * UK — HMRC AMAP rates (GBP per mile), banded by cumulative annual business miles.
 * First 10,000 miles then a lower rate thereafter.
 */
export const UK_BANDS: UkBand[] = [
  { upperMiles: 10000,    label: 'First 10,000 miles', rate: 0.55 },
  { upperMiles: Infinity, label: 'Over 10,000 miles',  rate: 0.25 },
];

/** Human-readable labels for the ROI engine-capacity columns. */
export const ENGINE_CC_LABELS: Record<EngineCcBand, string> = {
  le1200:       'Up to 1,200cc',
  cc1201to1500: '1,201–1,500cc',
  ge1501:       '1,501cc and over',
};
