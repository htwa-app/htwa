/**
 * __tests__/unit/routes.test.ts
 * Block 2 — unit tests for services/routes.ts (Google Routes distance helper)
 */
import { computeRouteDistance, isMapsKeyUsable, parseDurationSeconds } from '../../services/routes';

// Neutral test key: ≥20 chars, no PLACEHOLDER, and deliberately NOT shaped like
// a real Google API key (no AIza prefix) so it doesn't trip secret scanners.
const REAL_KEY = 'test-maps-key-0123456789abcdef';
const PLACEHOLDER_KEY = 'PLACEHOLDER_FILL_IN_REAL_KEY';

function mockFetch(meters: number | null, ok = true, duration?: string): typeof fetch {
  return jest.fn(async () => ({
    ok,
    json: async () => (meters === null ? { routes: [] } : { routes: [{ distanceMeters: meters, duration }] }),
  })) as unknown as typeof fetch;
}

describe('parseDurationSeconds', () => {
  it('parses a "1234s" duration string', () => {
    expect(parseDurationSeconds('3600s')).toBe(3600);
    expect(parseDurationSeconds('90.5s')).toBe(91); // rounded
  });
  it('returns undefined for invalid input', () => {
    expect(parseDurationSeconds(undefined)).toBeUndefined();
    expect(parseDurationSeconds('abc')).toBeUndefined();
    expect(parseDurationSeconds('0s')).toBeUndefined();
  });
});

describe('isMapsKeyUsable', () => {
  it('rejects missing, placeholder, or implausibly short keys', () => {
    expect(isMapsKeyUsable(undefined)).toBe(false);
    expect(isMapsKeyUsable(PLACEHOLDER_KEY)).toBe(false);
    expect(isMapsKeyUsable('short')).toBe(false);
    expect(isMapsKeyUsable(REAL_KEY)).toBe(true);
  });
});

describe('computeRouteDistance', () => {
  const ORIGINAL = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  afterEach(() => { process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = ORIGINAL; });

  it('returns no_key (no throw) when the key is a placeholder', async () => {
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = PLACEHOLDER_KEY;
    const fetchSpy = mockFetch(208000);
    const r = await computeRouteDistance('Galway', 'Dublin', 'km', fetchSpy);
    expect(r).toEqual({ ok: false, reason: 'no_key' });
    expect(fetchSpy).not.toHaveBeenCalled(); // never even hits the network
  });

  it('converts metres to km for ROI drivers', async () => {
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = REAL_KEY;
    const r = await computeRouteDistance('Galway', 'Dublin', 'km', mockFetch(208000));
    expect(r.ok).toBe(true);
    expect(r.distance).toBe(208);
    expect(r.unit).toBe('km');
  });

  it('returns the driving duration in seconds when present', async () => {
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = REAL_KEY;
    const r = await computeRouteDistance('Galway', 'Dublin', 'km', mockFetch(208000, true, '7200s'));
    expect(r.durationSeconds).toBe(7200);
  });

  it('converts metres to miles for UK drivers', async () => {
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = REAL_KEY;
    const r = await computeRouteDistance('Belfast', 'Dublin', 'miles', mockFetch(160934.4));
    expect(r.ok).toBe(true);
    expect(r.distance).toBe(100); // 160934.4 / 1609.344 = 100
    expect(r.unit).toBe('miles');
  });

  it('returns unavailable on a non-OK API response', async () => {
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = REAL_KEY;
    const r = await computeRouteDistance('A', 'B', 'km', mockFetch(0, false));
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('unavailable');
  });

  it('returns unavailable when no route is found', async () => {
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = REAL_KEY;
    const r = await computeRouteDistance('A', 'B', 'km', mockFetch(null));
    expect(r.ok).toBe(false);
  });

  it('returns unavailable when fetch throws', async () => {
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = REAL_KEY;
    const throwing = (() => { throw new Error('network down'); }) as unknown as typeof fetch;
    const r = await computeRouteDistance('A', 'B', 'km', throwing);
    expect(r.ok).toBe(false);
  });

  it('returns unavailable for empty origin or destination', async () => {
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = REAL_KEY;
    const r = await computeRouteDistance('', 'Dublin', 'km', mockFetch(208000));
    expect(r.ok).toBe(false);
  });
});
