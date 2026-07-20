/**
 * __tests__/unit/pricingRatesService.test.ts
 * Block 4 — the DB-backed rate reader (services/pricingRates.ts).
 *
 * Proves the fail-loud contract: any fetch error / empty / incomplete data
 * THROWS rather than returning a default, so a failed fetch can never silently
 * produce a price. Also proves a successful fetch assembles rates that feed the
 * pure engine correctly, and that results are cached for the session.
 */

const mockFrom = jest.fn();
jest.mock('../../lib/supabase', () => ({
  supabase: { from: (t: string) => mockFrom(t) },
}));

import {
  fetchPricingRates,
  clearPricingRatesCache,
  PricingRatesUnavailableError,
} from '../../services/pricingRates';
import { calculateJourneyPricing } from '../../utils/pricingEngine';

// A complete, minimal DB result: one full ROI band (all 3 engine columns) + one
// UK band + both config keys.
const ROI_ROWS = [
  { jurisdiction: 'ROI', band_index: 0, engine_cc: 'le1200',       upper_bound: 1500, rate: 0.4180 },
  { jurisdiction: 'ROI', band_index: 0, engine_cc: 'cc1201to1500', upper_bound: 1500, rate: 0.4340 },
  { jurisdiction: 'ROI', band_index: 0, engine_cc: 'ge1501',       upper_bound: 1500, rate: 0.5182 },
];
const UK_ROWS = [
  { jurisdiction: 'UK', band_index: 0, engine_cc: null, upper_bound: 10000, rate: 0.55 },
];
const CONFIG_ROWS = [
  { key: 'service_charge_rate', value: 0.10 },
  { key: 'booking_fee', value: 2 },
];

/** Wire mockFrom so pricing_rates / pricing_config each resolve to a given result. */
function wire(ratesRes: unknown, configRes: unknown) {
  mockFrom.mockImplementation((table: string) => ({
    select: () => Promise.resolve(table === 'pricing_rates' ? ratesRes : configRes),
  }));
}

beforeEach(() => {
  jest.clearAllMocks();
  clearPricingRatesCache();
});

describe('fetchPricingRates — fail loud (never returns a default)', () => {
  it('throws when the pricing_rates query errors', async () => {
    wire({ data: null, error: { message: 'db down' } }, { data: CONFIG_ROWS, error: null });
    await expect(fetchPricingRates()).rejects.toBeInstanceOf(PricingRatesUnavailableError);
  });

  it('throws when the pricing_config query errors', async () => {
    wire({ data: [...ROI_ROWS, ...UK_ROWS], error: null }, { data: null, error: { message: 'db down' } });
    await expect(fetchPricingRates()).rejects.toBeInstanceOf(PricingRatesUnavailableError);
  });

  it('throws when the rates table is empty', async () => {
    wire({ data: [], error: null }, { data: CONFIG_ROWS, error: null });
    await expect(fetchPricingRates()).rejects.toThrow(/empty/i);
  });

  it('throws when a required config key is missing', async () => {
    wire({ data: [...ROI_ROWS, ...UK_ROWS], error: null }, { data: [{ key: 'booking_fee', value: 2 }], error: null });
    await expect(fetchPricingRates()).rejects.toThrow(/service_charge_rate/);
  });

  it('throws when an ROI band is missing an engine column', async () => {
    const incomplete = ROI_ROWS.slice(0, 2); // missing ge1501
    wire({ data: [...incomplete, ...UK_ROWS], error: null }, { data: CONFIG_ROWS, error: null });
    await expect(fetchPricingRates()).rejects.toThrow(/ge1501/);
  });

  it('throws (does not return a default) when the underlying call rejects', async () => {
    mockFrom.mockImplementation(() => ({ select: () => Promise.reject(new Error('network')) }));
    await expect(fetchPricingRates()).rejects.toBeInstanceOf(PricingRatesUnavailableError);
  });

  it('does NOT cache a failed fetch (a later success still works)', async () => {
    wire({ data: null, error: { message: 'db down' } }, { data: CONFIG_ROWS, error: null });
    await expect(fetchPricingRates()).rejects.toBeInstanceOf(PricingRatesUnavailableError);
    wire({ data: [...ROI_ROWS, ...UK_ROWS], error: null }, { data: CONFIG_ROWS, error: null });
    const rates = await fetchPricingRates();
    expect(rates.roiBands.length).toBe(1);
  });
});

describe('fetchPricingRates — successful fetch feeds the engine', () => {
  it('assembles DB rows into a PricingRates the engine prices correctly', async () => {
    wire({ data: [...ROI_ROWS, ...UK_ROWS], error: null }, { data: CONFIG_ROWS, error: null });
    const rates = await fetchPricingRates();

    expect(rates.roiBands[0].rates).toEqual({ le1200: 0.4180, cc1201to1500: 0.4340, ge1501: 0.5182 });
    expect(rates.ukBands[0]).toEqual({ upperMiles: 10000, rate: 0.55 });
    expect(rates.serviceChargeRate).toBe(0.10);
    expect(rates.bookingFee).toBe(2);

    const result = calculateJourneyPricing(rates, {
      jurisdiction: 'ROI', engineCc: 'le1200', cumulativeBefore: 0, distance: 100, seatsOffered: 4,
    });
    expect(result.totalJourneyCost).toBe(41.80); // 100 × 0.4180
    expect(result.driverSeatPrice).toBe(8.36);   // 41.80 / 5
  });

  it('coerces DECIMAL values returned as strings (PostgREST numeric)', async () => {
    const asStrings = [
      { jurisdiction: 'ROI', band_index: 0, engine_cc: 'le1200',       upper_bound: '1500', rate: '0.4180' },
      { jurisdiction: 'ROI', band_index: 0, engine_cc: 'cc1201to1500', upper_bound: '1500', rate: '0.4340' },
      { jurisdiction: 'ROI', band_index: 0, engine_cc: 'ge1501',       upper_bound: '1500', rate: '0.5182' },
      { jurisdiction: 'UK',  band_index: 0, engine_cc: null,            upper_bound: '10000', rate: '0.55' },
    ];
    wire({ data: asStrings, error: null }, { data: [
      { key: 'service_charge_rate', value: '0.10' }, { key: 'booking_fee', value: '2' },
    ], error: null });
    const rates = await fetchPricingRates();
    expect(rates.roiBands[0].rates.le1200).toBe(0.4180);
    expect(rates.bookingFee).toBe(2);
  });

  it('caches a successful fetch for the session (no refetch)', async () => {
    wire({ data: [...ROI_ROWS, ...UK_ROWS], error: null }, { data: CONFIG_ROWS, error: null });
    await fetchPricingRates();
    const callsAfterFirst = mockFrom.mock.calls.length; // 2 (pricing_rates + pricing_config)
    await fetchPricingRates();
    expect(mockFrom.mock.calls.length).toBe(callsAfterFirst); // no further DB calls
  });
});
