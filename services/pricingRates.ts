/**
 * services/pricingRates.ts
 *
 * Block 4 — the DB-backed rate reader. This is the ONLY place the app obtains
 * mileage rates and pricing fees: it reads them from the `pricing_rates` and
 * `pricing_config` tables, which are the SOLE source of truth. There is no
 * hardcoded rate table anywhere in the codebase (constants/pricingRates.ts was
 * deleted) — so the admin-editable DB rows genuinely drive pricing and the two
 * can never drift.
 *
 * Fail-loud contract: if the rates can't be fetched or are incomplete, this
 * THROWS (`PricingRatesUnavailableError`). It NEVER returns a default / partial /
 * zeroed rate set, so a failed fetch can never silently produce a price. Callers
 * must surface a clear "pricing unavailable" state to the user.
 *
 * Rates change at most annually, so a successful fetch is cached in memory for
 * the session. The cache is ONLY ever populated from the DB.
 */

import { supabase } from '../lib/supabase';
import type { EngineCcBand, PricingRates, RoiBand, UkBand } from '../utils/pricingEngine';

/** Thrown whenever DB rates are unavailable or incomplete — pricing must fail loud. */
export class PricingRatesUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PricingRatesUnavailableError';
  }
}

const ENGINE_CC_COLUMNS: EngineCcBand[] = ['le1200', 'cc1201to1500', 'ge1501'];

// In-memory session cache. Populated ONLY from a successful DB fetch.
let cache: PricingRates | null = null;

/** Clear the in-memory cache (used by tests and after an admin rate update). */
export function clearPricingRatesCache(): void {
  cache = null;
}

interface RateRow {
  jurisdiction: string;
  band_index: number;
  engine_cc: string | null;
  upper_bound: number | string;
  rate: number | string;
}

/** Coerce a numeric/decimal value (PostgREST may return DECIMAL as a string). */
function num(value: number | string, what: string): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) {
    throw new PricingRatesUnavailableError(`Invalid numeric pricing value for ${what}: ${value}`);
  }
  return n;
}

function assembleRoiBands(rows: RateRow[]): RoiBand[] {
  const byBand = new Map<number, RoiBand>();
  for (const r of rows) {
    if (r.engine_cc == null) {
      throw new PricingRatesUnavailableError(`ROI rate row missing engine_cc (band ${r.band_index})`);
    }
    const band = byBand.get(r.band_index) ?? {
      upperKm: num(r.upper_bound, `ROI band ${r.band_index} upper_bound`),
      rates: {} as Record<EngineCcBand, number>,
    };
    band.rates[r.engine_cc as EngineCcBand] = num(r.rate, `ROI band ${r.band_index} ${r.engine_cc} rate`);
    byBand.set(r.band_index, band);
  }
  if (byBand.size === 0) throw new PricingRatesUnavailableError('No ROI pricing bands found');

  const bands = [...byBand.entries()].sort((a, b) => a[0] - b[0]).map(([, band]) => band);
  // Every ROI band must have all three engine columns, or pricing is incomplete.
  for (let i = 0; i < bands.length; i++) {
    for (const col of ENGINE_CC_COLUMNS) {
      if (typeof bands[i].rates[col] !== 'number') {
        throw new PricingRatesUnavailableError(`ROI band ${i} missing rate column ${col}`);
      }
    }
  }
  return bands;
}

function assembleUkBands(rows: RateRow[]): UkBand[] {
  if (rows.length === 0) throw new PricingRatesUnavailableError('No UK pricing bands found');
  return rows
    .slice()
    .sort((a, b) => a.band_index - b.band_index)
    .map((r) => ({
      upperMiles: num(r.upper_bound, `UK band ${r.band_index} upper_bound`),
      rate: num(r.rate, `UK band ${r.band_index} rate`),
    }));
}

/**
 * Fetch the full rate set from the DB (cached for the session).
 *
 * @param force  bypass the cache and re-read from the DB.
 * @throws PricingRatesUnavailableError on any query error or incomplete data.
 */
export async function fetchPricingRates(force = false): Promise<PricingRates> {
  if (cache && !force) return cache;

  let rateRows: RateRow[] | null;
  let configRows: Array<{ key: string; value: number | string }> | null;
  try {
    const [ratesRes, configRes] = await Promise.all([
      supabase.from('pricing_rates').select('jurisdiction, band_index, engine_cc, upper_bound, rate'),
      supabase.from('pricing_config').select('key, value'),
    ]);
    if (ratesRes.error) throw new PricingRatesUnavailableError(ratesRes.error.message);
    if (configRes.error) throw new PricingRatesUnavailableError(configRes.error.message);
    rateRows = ratesRes.data as RateRow[] | null;
    configRows = configRes.data as Array<{ key: string; value: number | string }> | null;
  } catch (e) {
    // Any error (network, query, parse) is a HARD failure — never fall back.
    if (e instanceof PricingRatesUnavailableError) throw e;
    throw new PricingRatesUnavailableError(e instanceof Error ? e.message : 'Failed to load pricing rates');
  }

  if (!rateRows || rateRows.length === 0) {
    throw new PricingRatesUnavailableError('Pricing rates table is empty');
  }

  const roiBands = assembleRoiBands(rateRows.filter((r) => r.jurisdiction === 'ROI'));
  const ukBands = assembleUkBands(rateRows.filter((r) => r.jurisdiction === 'UK'));

  const config = new Map((configRows ?? []).map((c) => [c.key, c.value]));
  const rawServiceCharge = config.get('service_charge_rate');
  const rawBookingFee = config.get('booking_fee');
  if (rawServiceCharge == null) throw new PricingRatesUnavailableError('Missing pricing config: service_charge_rate');
  if (rawBookingFee == null) throw new PricingRatesUnavailableError('Missing pricing config: booking_fee');

  cache = {
    roiBands,
    ukBands,
    serviceChargeRate: num(rawServiceCharge, 'service_charge_rate'),
    bookingFee: num(rawBookingFee, 'booking_fee'),
  };
  return cache;
}
