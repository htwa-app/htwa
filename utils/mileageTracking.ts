/**
 * utils/mileageTracking.ts
 *
 * Block 4C — per-driver cumulative annual distance tracking. Pure functions only.
 *
 * Each driver has a running cumulative distance for the current tax year:
 *   - UK drivers: cumulative MILES; tax year resets on 6 April.
 *   - ROI drivers: cumulative KILOMETRES; tax year resets on 1 January.
 *
 * The band applied to a journey is determined by the cumulative total AT THE
 * TIME OF BOOKING; the journey's distance is then ADDED to the total.
 *
 * Drivers can also manually top up their total (honour-system "+1" button — no
 * minus, no enforcement) when reimbursed off-app. Each increment is logged with
 * a timestamp. Rapid repeated taps (likely accidental or abuse) raise a support
 * flag rather than silently inflating the total.
 */

import type { Jurisdiction } from './pricingEngine';

export type IncrementSource = 'journey' | 'manual';

export interface MileageIncrement {
  /** Distance added (km for ROI, miles for UK). */
  amount: number;
  /** ISO-8601 timestamp. */
  at: string;
  source: IncrementSource;
}

/** Start of the tax year that `now` falls within, for the given jurisdiction. */
export function taxYearStart(jurisdiction: Jurisdiction, now: Date = new Date()): Date {
  const year = now.getUTCFullYear();
  if (jurisdiction === 'ROI') {
    // 1 January.
    return new Date(Date.UTC(year, 0, 1));
  }
  // UK: 6 April. Before 6 April we're still in the previous tax year.
  const aprilSix = new Date(Date.UTC(year, 3, 6));
  return now.getTime() < aprilSix.getTime()
    ? new Date(Date.UTC(year - 1, 3, 6))
    : aprilSix;
}

/** Cumulative distance booked within the current tax year (resets handled automatically). */
export function cumulativeForTaxYear(
  increments: MileageIncrement[],
  jurisdiction: Jurisdiction,
  now: Date = new Date(),
): number {
  const start = taxYearStart(jurisdiction, now).getTime();
  return increments
    .filter((inc) => new Date(inc.at).getTime() >= start)
    .reduce((sum, inc) => sum + inc.amount, 0);
}

/** Max value storable in the DECIMAL(10,2) amount column (8 integer digits + 2 dp). */
const MAX_INCREMENT_AMOUNT = 99999999.99;

/**
 * Append an increment (returns a new array; does not mutate). Validates the
 * amount is finite and > 0 and fits the DECIMAL(10,2) column, then normalises it
 * to 2 dp so the stored value can't violate the column scale.
 */
export function recordIncrement(
  increments: MileageIncrement[],
  amount: number,
  source: IncrementSource = 'journey',
  at: Date = new Date(),
): MileageIncrement[] {
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_INCREMENT_AMOUNT) {
    throw new Error(`Invalid mileage increment: ${amount}`);
  }
  const normalised = Math.round(amount * 100) / 100;
  return [...increments, { amount: normalised, at: at.toISOString(), source }];
}

export interface OverClickOptions {
  windowMs: number;
  maxInWindow: number;
}

const DEFAULT_OVER_CLICK: OverClickOptions = { windowMs: 60_000, maxInWindow: 5 };

/**
 * True if there have been more than `maxInWindow` MANUAL increments within
 * `windowMs` — a signal the driver is over-clicking the "+1" button, which
 * should raise a support flag rather than be trusted.
 */
export function shouldFlagForSupport(
  increments: MileageIncrement[],
  now: Date = new Date(),
  options: OverClickOptions = DEFAULT_OVER_CLICK,
): boolean {
  const cutoff = now.getTime() - options.windowMs;
  const recentManual = increments.filter(
    (inc) => inc.source === 'manual' && new Date(inc.at).getTime() >= cutoff,
  );
  return recentManual.length > options.maxInWindow;
}
