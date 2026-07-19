/**
 * services/routes.ts
 *
 * Block 2 — Route distance via the Google Routes API (computeRoutes).
 *
 * The driver never types a distance; it is computed from origin + destination
 * and returned in the unit appropriate to the driver's jurisdiction (miles for
 * UK, km for ROI — see Block 4A). The result is cached on the journey record at
 * posting time so it is not recomputed on every read.
 *
 * The API key (EXPO_PUBLIC_GOOGLE_MAPS_API_KEY) is currently a PLACEHOLDER
 * (blocked on company/DUNS formation). A missing/placeholder/invalid key returns
 * a graceful `{ ok: false, reason: 'unavailable' }` rather than throwing, so the
 * UI can show a "distance calculation unavailable" state instead of crashing.
 *
 * `fetchImpl` is injectable so this is trivial to unit-test with a mocked response.
 */

export type DistanceUnit = 'km' | 'miles';

export interface RouteDistanceResult {
  ok: boolean;
  /** Distance in the requested unit (present only when ok). */
  distance?: number;
  /** Raw metres from the API (present only when ok). */
  meters?: number;
  unit?: DistanceUnit;
  /** Estimated driving duration in seconds (present only when ok). Drives the
   *  no-overlapping-journeys window (Change 2). */
  durationSeconds?: number;
  /**
   * Why it failed:
   *  - 'no_key': the platform's Maps key isn't configured — NOT the user's
   *    fault; copy must never tell them to "check the locations".
   *  - 'unavailable': network/API/no-route failure — retryable.
   */
  reason?: 'no_key' | 'unavailable';
}

/** Parse a Routes API duration string like "1234s" into seconds. */
export function parseDurationSeconds(raw: unknown): number | undefined {
  if (typeof raw !== 'string') return undefined;
  const match = raw.match(/^(\d+(?:\.\d+)?)s$/);
  if (!match) return undefined;
  const n = Math.round(parseFloat(match[1]));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

const ROUTES_ENDPOINT = 'https://routes.googleapis.com/directions/v2:computeRoutes';
const METERS_PER_KM = 1000;
const METERS_PER_MILE = 1609.344;
const ROUTES_TIMEOUT_MS = 8000; // abort the Routes request if it hangs

/** A key that's missing, the known placeholder, or implausibly short is treated as invalid. */
export function isMapsKeyUsable(key: string | undefined): boolean {
  if (!key) return false;
  if (key.toUpperCase().includes('PLACEHOLDER')) return false;
  return key.length >= 20;
}

function toUnit(meters: number, unit: DistanceUnit): number {
  const raw = unit === 'km' ? meters / METERS_PER_KM : meters / METERS_PER_MILE;
  return Math.round(raw * 100) / 100;
}

/**
 * Compute the driving distance between two locations.
 *
 * @param origin       free-text origin (city/town/university)
 * @param destination  free-text destination
 * @param unit         'km' (ROI) or 'miles' (UK) — from the driver's jurisdiction
 * @param fetchImpl    injectable fetch (defaults to global fetch) for testing
 */
export async function computeRouteDistance(
  origin: string,
  destination: string,
  unit: DistanceUnit,
  fetchImpl: typeof fetch = fetch,
): Promise<RouteDistanceResult> {
  // Both env names are accepted — BLOCKERS-FOR-JORDAN.md says
  // EXPO_PUBLIC_GOOGLE_MAPS_KEY; older code used ..._API_KEY.
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!isMapsKeyUsable(apiKey)) {
    return { ok: false, reason: 'no_key' };
  }
  if (!origin.trim() || !destination.trim()) {
    return { ok: false, reason: 'unavailable' };
  }

  // Abort the request if it hangs so the caller's "calculating" state can't get
  // stuck forever on a slow/unresponsive network.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ROUTES_TIMEOUT_MS);
  try {
    const res = await fetchImpl(ROUTES_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey as string,
        'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration',
      },
      body: JSON.stringify({
        origin: { address: origin },
        destination: { address: destination },
        travelMode: 'DRIVE',
      }),
      signal: controller.signal,
    });

    if (!res.ok) return { ok: false, reason: 'unavailable' };

    const data = (await res.json()) as { routes?: Array<{ distanceMeters?: number; duration?: string }> };
    const route = data.routes?.[0];
    const meters = route?.distanceMeters;
    if (typeof meters !== 'number' || meters <= 0) {
      return { ok: false, reason: 'unavailable' };
    }

    return {
      ok: true,
      meters,
      distance: toUnit(meters, unit),
      unit,
      durationSeconds: parseDurationSeconds(route?.duration),
    };
  } catch {
    return { ok: false, reason: 'unavailable' };
  } finally {
    clearTimeout(timeout);
  }
}
