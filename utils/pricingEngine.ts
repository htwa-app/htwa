/**
 * utils/pricingEngine.ts
 *
 * Block 4 — the pricing engine. Pure, deterministic, fully unit-tested. NO UI
 * or data-access logic lives here. Everything the app charges flows through
 * these functions so there is exactly one source of truth.
 *
 * Jurisdiction is determined by the DRIVER'S TAX RESIDENCE:
 *   - UK  → miles / GBP / HMRC AMAP rates
 *   - ROI → km / EUR / Revenue civil-service rates (by engine cc)
 *
 * Rounding (Block 4F): floor (round DOWN) to the nearest minor unit (cent/penny)
 * at EVERY step that produces a monetary value, so the platform never rounds a
 * cost-share up.
 */

import {
  ROI_BANDS,
  UK_BANDS,
  SERVICE_CHARGE_RATE,
  BOOKING_FEE,
  type Jurisdiction,
  type EngineCcBand,
} from '../constants/pricingRates';

export type { Jurisdiction, EngineCcBand };

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
export function bandIndexFor(jurisdiction: Jurisdiction, cumulative: number): number {
  if (jurisdiction === 'ROI') {
    for (let i = 0; i < ROI_BANDS.length; i++) {
      if (cumulative <= ROI_BANDS[i].upperKm) return i;
    }
    return ROI_BANDS.length - 1;
  }
  for (let i = 0; i < UK_BANDS.length; i++) {
    if (cumulative < UK_BANDS[i].upperMiles) return i;
  }
  return UK_BANDS.length - 1;
}

/** The per-unit rate for a specific band index. */
export function rateForBand(
  jurisdiction: Jurisdiction,
  bandIndex: number,
  engineCc?: EngineCcBand,
): number {
  if (jurisdiction === 'ROI') {
    if (!engineCc) throw new Error('engineCc is required for ROI pricing');
    return ROI_BANDS[bandIndex].rates[engineCc];
  }
  return UK_BANDS[bandIndex].rate;
}

/**
 * The rate applied to the WHOLE journey, honouring the band-straddle rule:
 * if the journey crosses a band boundary, charge the entire journey at the
 * LOWER of the applicable numeric rates. ROI bands are non-monotonic, so this
 * compares actual rate values, not band order.
 */
export function effectiveRate(input: PricingInput): number {
  const { jurisdiction, engineCc, cumulativeBefore, distance } = input;
  const startIdx = bandIndexFor(jurisdiction, cumulativeBefore);
  const endIdx = bandIndexFor(jurisdiction, cumulativeBefore + distance);
  const lo = Math.min(startIdx, endIdx);
  const hi = Math.max(startIdx, endIdx);

  let min = Infinity;
  for (let i = lo; i <= hi; i++) {
    min = Math.min(min, rateForBand(jurisdiction, i, engineCc));
  }
  return min;
}

/**
 * Passenger price from a known driver seat price (Block 4E).
 * Worked example: driverSeatPrice 30 → serviceCharge 3 → bookingFee 2 → passenger 35.
 */
export function passengerPricing(driverSeatPrice: number): {
  serviceCharge: number;
  bookingFee: number;
  passengerSeatPrice: number;
} {
  const serviceCharge = floorMoney(driverSeatPrice * SERVICE_CHARGE_RATE);
  const bookingFee = BOOKING_FEE;
  const passengerSeatPrice = floorMoney(driverSeatPrice + serviceCharge + bookingFee);
  return { serviceCharge, bookingFee, passengerSeatPrice };
}

/** Full pricing for a journey, fixed at posting time. */
export function calculateJourneyPricing(input: PricingInput): PricingResult {
  const { jurisdiction, distance, tolls = 0, seatsOffered } = input;
  if (jurisdiction === 'ROI' && !input.engineCc) {
    throw new Error('engineCc is required for ROI pricing');
  }
  if (seatsOffered < 1) throw new Error('seatsOffered must be at least 1');

  const currency = jurisdiction === 'UK' ? 'GBP' : 'EUR';
  const ratePerUnit = effectiveRate(input);

  const totalJourneyCost = floorMoney(distance * ratePerUnit + tolls);

  // ALWAYS divide by the standard vehicle capacity (5 = driver + 4). seatsOffered
  // deliberately does NOT affect the divisor — a passenger always pays one fifth
  // share; the driver absorbs the cost of any unsold/self-reserved seats. Safe
  // because bookable seats are hard-capped at 4 for every vehicle at launch.
  const driverSeatPrice = floorMoney(totalJourneyCost / STANDARD_VEHICLE_CAPACITY);

  const { serviceCharge, bookingFee, passengerSeatPrice } = passengerPricing(driverSeatPrice);

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
