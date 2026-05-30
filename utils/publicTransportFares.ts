/**
 * utils/publicTransportFares.ts
 *
 * Stage 60 — Hardcoded fare lookup for key Irish routes.
 * Used to calculate savings vs public transport.
 *
 * Sources: Irish Rail, Bus Éireann, Translink approximate single fares (2026).
 * Fares are approximate and should be updated periodically.
 */

export interface RouteFare {
  fromKey:    string;
  toKey:      string;
  busFare:    number;   // EUR
  trainFare:  number;   // EUR
  currency:   'EUR';
}

/** Normalise a location string to a lookup key */
export function normaliseLocationKey(location: string): string {
  return location.toLowerCase().replace(/[^a-z]/g, '').slice(0, 10);
}

/** Fare table for common Irish intercity routes */
const FARE_TABLE: RouteFare[] = [
  { fromKey: 'dublin',    toKey: 'cork',      busFare: 14.00, trainFare: 29.00, currency: 'EUR' },
  { fromKey: 'dublin',    toKey: 'galway',    busFare: 13.00, trainFare: 35.00, currency: 'EUR' },
  { fromKey: 'dublin',    toKey: 'limerick',  busFare: 12.00, trainFare: 28.00, currency: 'EUR' },
  { fromKey: 'dublin',    toKey: 'waterford', busFare: 11.00, trainFare: 22.00, currency: 'EUR' },
  { fromKey: 'dublin',    toKey: 'belfast',   busFare: 15.00, trainFare: 20.00, currency: 'EUR' },
  { fromKey: 'cork',      toKey: 'limerick',  busFare:  8.00, trainFare: 18.00, currency: 'EUR' },
  { fromKey: 'galway',    toKey: 'limerick',  busFare:  9.00, trainFare: 0,     currency: 'EUR' },
  { fromKey: 'belfast',   toKey: 'dublin',    busFare: 15.00, trainFare: 20.00, currency: 'EUR' },
];

/**
 * Look up approximate public transport fares for a route.
 * Returns null if the route is not in the table.
 * Direction-agnostic: Dublin→Cork returns the same as Cork→Dublin.
 */
export function getPublicTransportFare(from: string, to: string): RouteFare | null {
  const fromKey = normaliseLocationKey(from);
  const toKey   = normaliseLocationKey(to);

  return (
    FARE_TABLE.find(
      (r) =>
        (r.fromKey === fromKey && r.toKey === toKey) ||
        (r.fromKey === toKey   && r.toKey === fromKey),
    ) ?? null
  );
}

/**
 * Calculate savings vs cheapest public transport option.
 * Returns the saving amount (positive = user saved money).
 * Returns null if the route isn't in the fare table.
 */
export function calculateSavings(
  from:          string,
  to:            string,
  amountPaid:    number,
): { savedVsBus: number; savedVsTrain: number } | null {
  const fare = getPublicTransportFare(from, to);
  if (!fare) return null;
  return {
    savedVsBus:   Math.max(0, fare.busFare   - amountPaid),
    savedVsTrain: Math.max(0, fare.trainFare - amountPaid),
  };
}
