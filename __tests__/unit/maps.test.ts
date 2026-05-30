/**
 * __tests__/unit/maps.test.ts
 *
 * Stage 26 — unit tests for services/maps.ts
 * All network calls are mocked via global fetch.
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock expo-constants to control the API key
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: { googleMapsApiKey: 'test-api-key' },
    },
  },
}));

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRoutesResponse(distanceMeters: number, durationSeconds: number, polyline = 'abc123') {
  return {
    routes: [{
      distanceMeters,
      duration: `${durationSeconds}s`,
      polyline: { encodedPolyline: polyline },
    }],
  };
}

function mockOkResponse(body: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(body),
  });
}

function mockErrorResponse(status: number, statusText: string) {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    statusText,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

import { calculateRoute } from '../../services/maps';

// ─── calculateRoute ────────────────────────────────────────────────────────────

describe('calculateRoute — success', () => {
  it('converts distanceMeters to km', async () => {
    mockOkResponse(makeRoutesResponse(250_000, 7200));
    const result = await calculateRoute('Dublin', 'Galway');
    expect(result.distanceKm).toBeCloseTo(250);
  });

  it('converts duration seconds to minutes (rounded up)', async () => {
    mockOkResponse(makeRoutesResponse(100_000, 5401));   // 90.01 minutes → ceil → 91
    const result = await calculateRoute('Dublin', 'Cork');
    expect(result.durationMinutes).toBe(91);
  });

  it('returns the encoded polyline string', async () => {
    mockOkResponse(makeRoutesResponse(100_000, 3600, 'xyz_polyline'));
    const result = await calculateRoute('A', 'B');
    expect(result.polyline).toBe('xyz_polyline');
  });

  it('calls the Routes API endpoint', async () => {
    mockOkResponse(makeRoutesResponse(50_000, 1800));
    await calculateRoute('Belfast', 'Dublin');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://routes.googleapis.com/directions/v2:computeRoutes',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('sends the X-Goog-Api-Key header', async () => {
    mockOkResponse(makeRoutesResponse(50_000, 1800));
    await calculateRoute('Limerick', 'Galway');
    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers['X-Goog-Api-Key']).toBe('test-api-key');
  });
});

describe('calculateRoute — error handling', () => {
  it('throws when the API responds with a non-OK status', async () => {
    mockErrorResponse(403, 'Forbidden');
    await expect(calculateRoute('A', 'B')).rejects.toThrow('Routes API error: 403');
  });

  it('throws when the response contains no routes', async () => {
    mockOkResponse({ routes: [] });
    await expect(calculateRoute('Nowhere', 'Anywhere')).rejects.toThrow('No route found');
  });

  it('handles missing polyline gracefully (returns empty string)', async () => {
    mockOkResponse({
      routes: [{ distanceMeters: 10_000, duration: '600s', polyline: {} }],
    });
    const result = await calculateRoute('A', 'B');
    expect(result.polyline).toBe('');
  });

  it('handles missing distanceMeters (defaults to 0 km)', async () => {
    mockOkResponse({
      routes: [{ duration: '600s', polyline: { encodedPolyline: 'abc' } }],
    });
    const result = await calculateRoute('A', 'B');
    expect(result.distanceKm).toBe(0);
  });
});
