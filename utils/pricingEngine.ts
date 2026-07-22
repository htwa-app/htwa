/**
 * utils/pricingEngine.ts
 *
 * Block 4 — the pricing engine. Pure, deterministic, fully unit-tested. NO UI
 * or data-access logic lives here, and — crucially — NO rate DATA lives here
 * either. The numeric rates/fees are the DB's job (pricing_rates / pricing_config,
 * fetched by services/pricingRates.ts); every function below receives the rates
 * as a `PricingRates` parameter so there is exactly ONE source of truth (the DB)
 * and the engine stays a pure function of (rates, input).
 *
 * Jurisdiction is determined by the DRIVER'S TAX RESIDENCE:
 *   - UK  → miles / GBP / HMRC AMAP rates
 *   - ROI → km / EUR / Revenue civil-service rates (by engine cc)
 *
 * Rounding (Block 4F): floor (round DOWN) to the nearest minor unit (cent/penny)
 * at EVERY step that produces a monetary value, so the platform never rounds a
 * cost-share up.
 */

// ─── Types (NOT rate data — these are safe to live in code) ────────────────────

export type Jurisdiction = 'UK' | 'ROI';

/** ROI rate columns by vehicle engine capacity. */
export type EngineCcBand = 'le1200' | 'cc1201to1500' | 'ge1501';

export interface RoiBand {
  /** Inclusive upper bound of cumulative km for this band. */
  upperKm: number;
  /** EUR per km, by engine-capacity column. */
  rates: Record<EngineCcBand, number>;
}

export interface UkBand {
  /** Inclusive upper bound of cumulative miles for this band. */
  upperMiles: number;
  /** GBP per mile. */
  rate: number;
}

/**
 * The complete rate set the engine needs, assembled from the DB by
 * services/pricingRates.ts. Bands are ordered by ascending band index.
 */
export interface PricingRates {
  roiBands: RoiBand[];
  ukBands: UkBand[];
  /** Passenger service charge as a fraction of driverSeatPrice (e.g. 0.10). */
  serviceChargeRate: number;
  /** Flat passenger booking fee in currency units (e.g. 2). */
  bookingFee: number;
}

/** Human-readable labels for the ROI engine-capacity columns (display, not a rate). */
export const ENGINE_CC_LABELS: Record<EngineCcBand, string> = {
  le1200:       'Up to 1,200cc',
  cc1201to1500: '1,201–1,500cc',
  ge1501:       '1,501cc and over',
};

/**
 * A standard car seats 5 (driver + 4 passengers). At launch EVERY journey is
 * priced by dividing the total cost by 5, regardless of how many seats are
 * actually offered or booked. A passenger always pays exactly ONE share
 * (total ÷ 5) and can NEVER pay more just because fewer seats are available —
 * the driver bears the cost of every unsold or self-reserved seat. One booked
 * seat recovers 20% for the driver, which is the intended "heading that way
 * anyway" model.
 *
 * This is only safe because bookable seats are hard-capped at 4 for ALL
 * vehicles at launch (see Block 3 / offer-ride), so a larger vehicle can still
 * only sell 4 seats and ÷5 can never over-recover.
 *
 * TODO (V2.0): support larger vehicles (max 8 incl. driver) with a
 *   capacity-based divisor. Until then everyone divides by 5 and a 7/8-seater
 *   recoups at most 4 seats' worth (acceptable).
 */
export const STANDARD_VEHICLE_CAPACITY = 5;

/** Upper bound for seatsOffered, matching SEATS_CAP_VERIFIED in app/offer-ride.tsx. */
const MAX_SEATS_OFFERED = 7;

export interface PricingInput {
  jurisdiction: Jurisdiction;
  /** Required for ROI (drives the rate column); ignored for UK. */
  engineCc?: EngineCcBand;
  /** Cumulative distance already booked this tax year (km for ROI, miles for UK). */
  cumulativeBefore: number;
  /** This journey's distance (same unit as cumulativeBefore). */
  distance: number;
  /** Tolls in currency units; added BEFORE division so they're shared by everyone. */
  tolls?: number;
  /**
   * Passenger seats offered. NOTE: this does NOT affect the divisor — pricing
   * always divides by STANDARD_VEHICLE_CAPACITY (5). Retained for validation
   * and future capacity-based pricing (V2.0).
   */
  seatsOffered: number;
}

export interface PricingResult {
  currency: 'EUR' | 'GBP';
  /** The per-unit rate actually applied to the whole journey. */
  ratePerUnit: number;
  totalJourneyCost: number;
  /** What the DRIVER sees — their own cost-share for one seat. */
  driverSeatPrice: number;
  serviceCharge: number;
  bookingFee: number;
  /** What a PASSENGER pays for one seat (driver never sees this). */
  passengerSeatPrice: number;
}

/** Floor a monetary value DOWN to the nearest minor unit (cent / penny). */
export function floorMoney(value: number): number {
  // +1e-9 guards against binary-float artefacts like 0.29999999999 → 0.29.
  return Math.floor((value + 1e-9) * 100) / 100;
}

/** Index of the band containing `cumulative` (km for ROI, miles for UK). */
export function bandIndexFor(
  rates: PricingRates,
  jurisdiction: Jurisdiction,
  cumulative: number,
): number {
  if (jurisdiction === 'ROI') {
    for (let i = 0; i < rates.roiBands.length; i++) {
      if (cumulative <= rates.roiBands[i].upperKm) return i;
    }
    return rates.roiBands.length - 1;
  }
  for (let i = 0; i < rates.ukBands.length; i++) {
    // upperMiles is an INCLUSIVE bound, so a cumulative value exactly equal to
    // the boundary (e.g. exactly 10,000 miles) must land in this band, not the
    // next one. Use <= to match the ROI loop above.
    if (cumulative <= rates.ukBands[i].upperMiles) return i;
  }
  return rates.ukBands.length - 1;
}

/** The per-unit rate for a specific band index. */
export function rateForBand(
  rates: PricingRates,
  jurisdiction: Jurisdiction,
  bandIndex: number,
  engineCc?: EngineCcBand,
): number {
  if (jurisdiction === 'ROI') {
    if (!engineCc) throw new Error('engineCc is required for ROI pricing');
    return rates.roiBands[bandIndex].rates[engineCc];
  }
  return rates.ukBands[bandIndex].rate;
}

/**
 * The rate applied to the WHOLE journey, honouring the band-straddle rule:
 * if the journey crosses a band boundary, charge the entire journey at the
 * LOWER of the applicable numeric rates. ROI bands are non-monotonic, so this
 * compares actual rate values, not band order.
 */
export function effectiveRate(rates: PricingRates, input: PricingInput): number {
  const { jurisdiction, engineCc, cumulativeBefore, distance } = input;
  const startIdx = bandIndexFor(rates, jurisdiction, cumulativeBefore);
  const endIdx = bandIndexFor(rates, jurisdiction, cumulativeBefore + distance);
  const lo = Math.min(startIdx, endIdx);
  const hi = Math.max(startIdx, endIdx);

  let min = Infinity;
  for (let i = lo; i <= hi; i++) {
    min = Math.min(min, rateForBand(rates, jurisdiction, i, engineCc));
  }
  return min;
}

/**
 * Passenger price from a known driver seat price (Block 4E).
 * Worked example: driverSeatPrice 30 → serviceCharge 3 → bookingFee 2 → passenger 35.
 */
export function passengerPricing(rates: PricingRates, driverSeatPrice: number): {
  serviceCharge: number;
  bookingFee: number;
  passengerSeatPrice: number;
} {
  const serviceCharge = floorMoney(driverSeatPrice * rates.serviceChargeRate);
  const bookingFee = rates.bookingFee;
  const passengerSeatPrice = floorMoney(driverSeatPrice + serviceCharge + bookingFee);
  return { serviceCharge, bookingFee, passengerSeatPrice };
}

/** Full pricing for a journey, fixed at posting time. */
export function calculateJourneyPricing(rates: PricingRates, input: PricingInput): PricingResult {
  const { jurisdiction, distance, tolls = 0, seatsOffered, cumulativeBefore } = input;
  if (jurisdiction === 'ROI' && !input.engineCc) {
    throw new Error('engineCc is required for ROI pricing');
  }
  if (seatsOffered < 1) throw new Error('seatsOffered must be at least 1');
  if (seatsOffered > MAX_SEATS_OFFERED) throw new Error(`seatsOffered must be at most ${MAX_SEATS_OFFERED}`);
  if (!Number.isFinite(distance) || distance < 0) throw new Error('distance must be non-negative');
  if (!Number.isFinite(cumulativeBefore) || cumulativeBefore < 0) throw new Error('cumulativeBefore must be non-negative');
  if (!Number.isFinite(tolls) || tolls < 0) throw new Error('tolls must be non-negative');

  const currency = jurisdiction === 'UK' ? 'GBP' : 'EUR';
  const ratePerUnit = effectiveRate(rates, input);

  const totalJourneyCost = floorMoney(distance * ratePerUnit + tolls);

  // ALWAYS divide by the standard vehicle capacity (5 = driver + 4). seatsOffered
  // deliberately does NOT affect the divisor — a passenger always pays one fifth
  // share; the driver absorbs the cost of any unsold/self-reserved seats. Safe
  // because bookable seats are hard-capped at 4 for every vehicle at launch.
  const driverSeatPrice = floorMoney(totalJourneyCost / STANDARD_VEHICLE_CAPACITY);

  const { serviceCharge, bookingFee, passengerSeatPrice } = passengerPricing(rates, driverSeatPrice);

  return {
    currency,
    ratePerUnit,
    totalJourneyCost,
    driverSeatPrice,
    serviceCharge,
    bookingFee,
    passengerSeatPrice,
  };
}
