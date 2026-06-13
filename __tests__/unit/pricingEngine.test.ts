/**
 * __tests__/unit/pricingEngine.test.ts
 * Block 4 — exhaustive tests for the pure pricing engine.
 *
 * Covers (per spec §4G): both jurisdictions/currencies; each ROI engine column;
 * each band; both band-crossing directions with the lower-rate rule; the 30→35
 * fee example; ROI floor-to-cent; 1-seat and 4-seat division.
 *
 * The engine is a pure function of (rates, input): rates are passed in (sourced
 * from the DB in production), so these tests feed a fixture rate set directly.
 */
import {
  floorMoney,
  bandIndexFor,
  rateForBand,
  effectiveRate,
  passengerPricing,
  calculateJourneyPricing,
} from '../../utils/pricingEngine';
import { TEST_PRICING_RATES as RATES } from '../fixtures/pricingRates';

describe('floorMoney — floor DOWN to the minor unit', () => {
  it('floors to whole cents/pence', () => {
    expect(floorMoney(0.836)).toBe(0.83);
    expect(floorMoney(13.794)).toBe(13.79);
    expect(floorMoney(8.36)).toBe(8.36);
  });
  it('does not round up float artefacts', () => {
    expect(floorMoney(0.3 * 1)).toBe(0.3);
    expect(floorMoney(41.8 / 5)).toBe(8.36); // 8.36
  });
});

describe('bandIndexFor — ROI (cumulative km)', () => {
  it.each([
    [0, 0], [1000, 0], [1500, 0],       // Band 1 inclusive of 1,500
    [1501, 1], [5500, 1],               // Band 2
    [5501, 2], [25000, 2],              // Band 3
    [25001, 3], [99999, 3],             // Band 4
  ])('cumulative %i km → band %i', (cum, idx) => {
    expect(bandIndexFor(RATES, 'ROI', cum)).toBe(idx);
  });
});

describe('bandIndexFor — UK (cumulative miles)', () => {
  it.each([
    [0, 0], [5000, 0], [9999, 0],       // first 10,000
    [10000, 0],                          // EXACT boundary is INCLUSIVE → band 0 (regression: was misclassified as band 1 with strict <)
    [10001, 1], [20000, 1],             // over 10,000
  ])('cumulative %i mi → band %i', (cum, idx) => {
    expect(bandIndexFor(RATES, 'UK', cum)).toBe(idx);
  });

  it('rate at the exact 10,000-mile boundary is the first-band rate (0.55), not the over-10k rate (0.25)', () => {
    expect(rateForBand(RATES, 'UK', bandIndexFor(RATES, 'UK', 10000))).toBe(0.55);
  });
});

describe('rateForBand — each ROI engine column + each band', () => {
  it('le1200 across all four bands', () => {
    expect(rateForBand(RATES, 'ROI', 0, 'le1200')).toBe(0.4180);
    expect(rateForBand(RATES, 'ROI', 1, 'le1200')).toBe(0.7264);
    expect(rateForBand(RATES, 'ROI', 2, 'le1200')).toBe(0.3178);
    expect(rateForBand(RATES, 'ROI', 3, 'le1200')).toBe(0.2056);
  });
  it('1201–1500cc band 1/2', () => {
    expect(rateForBand(RATES, 'ROI', 0, 'cc1201to1500')).toBe(0.4340);
    expect(rateForBand(RATES, 'ROI', 1, 'cc1201to1500')).toBe(0.7918);
  });
  it('1501cc+ band 1/2', () => {
    expect(rateForBand(RATES, 'ROI', 0, 'ge1501')).toBe(0.5182);
    expect(rateForBand(RATES, 'ROI', 1, 'ge1501')).toBe(0.9063);
  });
  it('throws for ROI without an engine column', () => {
    expect(() => rateForBand(RATES, 'ROI', 0)).toThrow(/engineCc/);
  });
  it('UK rates ignore engine cc', () => {
    expect(rateForBand(RATES, 'UK', 0)).toBe(0.55);
    expect(rateForBand(RATES, 'UK', 1)).toBe(0.25);
  });
});

describe('effectiveRate — band-straddle uses the LOWER numeric rate', () => {
  it('UK: crossing 10k miles charges the whole journey at 0.25', () => {
    const rate = effectiveRate(RATES, { jurisdiction: 'UK', cumulativeBefore: 9950, distance: 100, seatsOffered: 1 });
    expect(rate).toBe(0.25); // min(0.55, 0.25)
  });
  it('ROI non-monotonic (band1→band2): earlier band is lower', () => {
    // 1,400 → 1,600 km crosses Band1 (0.4180) into Band2 (0.7264); lower is Band1.
    const rate = effectiveRate(RATES, { jurisdiction: 'ROI', engineCc: 'le1200', cumulativeBefore: 1400, distance: 200, seatsOffered: 1 });
    expect(rate).toBe(0.4180);
  });
  it('ROI non-monotonic (band2→band3): later band is lower', () => {
    // 5,400 → 5,600 km crosses Band2 (0.7264) into Band3 (0.3178); lower is Band3.
    const rate = effectiveRate(RATES, { jurisdiction: 'ROI', engineCc: 'le1200', cumulativeBefore: 5400, distance: 200, seatsOffered: 1 });
    expect(rate).toBe(0.3178);
  });
  it('no straddle returns the single band rate', () => {
    const rate = effectiveRate(RATES, { jurisdiction: 'ROI', engineCc: 'ge1501', cumulativeBefore: 100, distance: 200, seatsOffered: 1 });
    expect(rate).toBe(0.5182);
  });
});

describe('passengerPricing — the 30 → 35 worked example', () => {
  it('driverSeatPrice 30 → serviceCharge 3, bookingFee 2, passenger 35', () => {
    expect(passengerPricing(RATES, 30)).toEqual({ serviceCharge: 3, bookingFee: 2, passengerSeatPrice: 35 });
  });
  it('floors the 10% service charge down to the cent', () => {
    // 8.36 × 10% = 0.836 → floors to 0.83
    expect(passengerPricing(RATES, 8.36).serviceCharge).toBe(0.83);
    expect(passengerPricing(RATES, 8.36).passengerSeatPrice).toBe(8.36 + 0.83 + 2);
  });
});

describe('calculateJourneyPricing — full results', () => {
  it('ROI, le1200, band 1 → always ÷5 (car has 5 seats), EUR', () => {
    const r = calculateJourneyPricing(RATES, {
      jurisdiction: 'ROI', engineCc: 'le1200', cumulativeBefore: 0, distance: 100, seatsOffered: 4,
    });
    expect(r.currency).toBe('EUR');
    expect(r.ratePerUnit).toBe(0.4180);
    expect(r.totalJourneyCost).toBe(41.80);
    expect(r.driverSeatPrice).toBe(8.36); // 41.80 / 5 (÷5 because the car has 5 seats, not 4+1)
    expect(r.serviceCharge).toBe(0.83);
    expect(r.bookingFee).toBe(2);
    expect(r.passengerSeatPrice).toBe(11.19);
  });

  it('always divides by 5 regardless of seatsOffered (1, 2, 3, 4 → same price)', () => {
    const driverPriceFor = (seatsOffered: number) =>
      calculateJourneyPricing(RATES, {
        jurisdiction: 'ROI', engineCc: 'le1200', cumulativeBefore: 0, distance: 100, seatsOffered,
      }).driverSeatPrice;
    // 41.80 / 5 = 8.36 for every seat count — a passenger never pays more than 1/5.
    expect(driverPriceFor(1)).toBe(8.36);
    expect(driverPriceFor(2)).toBe(8.36);
    expect(driverPriceFor(3)).toBe(8.36);
    expect(driverPriceFor(4)).toBe(8.36);
  });

  it('UK, miles/GBP, first-band rate', () => {
    const r = calculateJourneyPricing(RATES, {
      jurisdiction: 'UK', cumulativeBefore: 0, distance: 100, seatsOffered: 4,
    });
    expect(r.currency).toBe('GBP');
    expect(r.ratePerUnit).toBe(0.55);
    expect(r.totalJourneyCost).toBe(55);
    expect(r.driverSeatPrice).toBe(11); // 55 / 5
  });

  it('adds tolls BEFORE division so they are shared', () => {
    const r = calculateJourneyPricing(RATES, {
      jurisdiction: 'UK', cumulativeBefore: 0, distance: 100, tolls: 5, seatsOffered: 4,
    });
    expect(r.totalJourneyCost).toBe(60); // 55 + 5
    expect(r.driverSeatPrice).toBe(12);  // 60 / 5
  });

  it('floors the ROI total down to the cent', () => {
    const r = calculateJourneyPricing(RATES, {
      jurisdiction: 'ROI', engineCc: 'le1200', cumulativeBefore: 0, distance: 33, seatsOffered: 1,
    });
    expect(r.totalJourneyCost).toBe(13.79); // 33 × 0.4180 = 13.794 → 13.79
  });

  it('throws for ROI without engine cc', () => {
    expect(() => calculateJourneyPricing(RATES, {
      jurisdiction: 'ROI', cumulativeBefore: 0, distance: 10, seatsOffered: 1,
    })).toThrow(/engineCc/);
  });

  it('throws when seatsOffered < 1', () => {
    expect(() => calculateJourneyPricing(RATES, {
      jurisdiction: 'UK', cumulativeBefore: 0, distance: 10, seatsOffered: 0,
    })).toThrow(/seatsOffered/);
  });
});
