/**
 * __tests__/fixtures/pricingRates.ts
 *
 * Shared PricingRates fixture for engine + screen tests. Mirrors the figures the
 * DB seed (migration 20260601000001) populates, so engine assertions match the
 * real rate set. The PRODUCTION app no longer has a hardcoded rate table — this
 * lives under __tests__/ purely as test data and is not part of the app bundle.
 */
import type { PricingRates } from '../../utils/pricingEngine';

export const TEST_PRICING_RATES: PricingRates = {
  roiBands: [
    { upperKm: 1500,     rates: { le1200: 0.4180, cc1201to1500: 0.4340, ge1501: 0.5182 } },
    { upperKm: 5500,     rates: { le1200: 0.7264, cc1201to1500: 0.7918, ge1501: 0.9063 } },
    { upperKm: 25000,    rates: { le1200: 0.3178, cc1201to1500: 0.3179, ge1501: 0.3922 } },
    { upperKm: Infinity, rates: { le1200: 0.2056, cc1201to1500: 0.2385, ge1501: 0.2587 } },
  ],
  ukBands: [
    { upperMiles: 10000,    rate: 0.55 },
    { upperMiles: Infinity, rate: 0.25 },
  ],
  serviceChargeRate: 0.10,
  bookingFee: 2,
};
