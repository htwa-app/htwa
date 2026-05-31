/**
 * utils/publicTransportFares.ts
 *
 * Stage 60 — Approximate public-transport single fares for key Irish routes,
 * used to show "Saved €X vs public transport" on trip cards and history.
 *
 * Direction-agnostic. Figures are approximate (Irish Rail / Bus Éireann /
 * Translink, 2026) and should be reviewed periodically.
 */

/** Normalise a location string to a stable lookup key (letters only). */
export function normaliseLocationKey(location: string): string {
  return location.toLowerCase().replace(/[^a-z]/g, '');
}

interface FareRoute {
  a:    string;
  b:    string;
  fare: number; // EUR, single
}

/** Approximate single public-transport fare (EUR) for common routes. */
const FARE_TABLE: FareRoute[] = [
  { a: 'dublin', b: 'galway',   fare: 13 },
  { a: 'dublin', b: 'cork',     fare: 20 },
  { a: 'dublin', b: 'limerick', fare: 16 },
  { a: 'dublin', b: 'belfast',  fare: 18 },
  { a: 'cork',   b: 'limerick', fare: 10 },
  { a: 'galway', b: 'limerick', fare: 12 },
];

/**
 * Estimate the public-transport fare for a route, or null if the route isn't in
 * the table. Direction-agnostic: getFareEstimate('Dublin','Galway') ===
 * getFareEstimate('Galway','Dublin').
 */
export function getFareEstimate(from: string, to: string): number | null {
  const f = normaliseLocationKey(from);
  const t = normaliseLocationKey(to);
  if (!f || !t) return null;
  // Match on substring so real inputs like "Cork City" / "Dublin, Ireland"
  // still resolve to the base city. City names here are distinct enough that
  // substring collisions aren't a concern.
  const match = FARE_TABLE.find(
    (r) =>
      (f.includes(r.a) && t.includes(r.b)) ||
      (f.includes(r.b) && t.includes(r.a)),
  );
  return match ? match.fare : null;
}

/**
 * Saving vs public transport for a paid amount on a route.
 * Returns null if the route isn't known; never negative.
 */
export function getSavingVsPublicTransport(
  from: string,
  to: string,
  amountPaid: number,
): number | null {
  const fare = getFareEstimate(from, to);
  if (fare === null) return null;
  return Math.max(0, fare - amountPaid);
}
