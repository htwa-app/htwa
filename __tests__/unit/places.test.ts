/**
 * __tests__/unit/places.test.ts
 * Unit tests for services/places.ts (Google Places API (New) autocomplete).
 */
import { autocompletePlaces, getPlaceCoords, newPlacesSessionToken } from '../../services/places';

const REAL_KEY = 'test-maps-key-0123456789abcdef';
const PLACEHOLDER_KEY = 'PLACEHOLDER_FILL_IN_REAL_KEY';
const TOKEN = 'test-session-token';

function mockAutocompleteFetch(
  predictions: Array<{ placeId: string; text: string; main?: string; secondary?: string }>,
  ok = true,
): typeof fetch {
  return jest.fn(async () => ({
    ok,
    json: async () => ({
      suggestions: predictions.map((p) => ({
        placePrediction: {
          placeId: p.placeId,
          text: { text: p.text },
          structuredFormat: {
            mainText: { text: p.main ?? p.text },
            secondaryText: { text: p.secondary ?? '' },
          },
        },
      })),
    }),
  })) as unknown as typeof fetch;
}

function mockDetailsFetch(lat: number | null, lng: number | null, ok = true): typeof fetch {
  return jest.fn(async () => ({
    ok,
    json: async () => (lat === null ? {} : { location: { latitude: lat, longitude: lng } }),
  })) as unknown as typeof fetch;
}

describe('newPlacesSessionToken', () => {
  it('generates a v4-shaped token, different each call', () => {
    const a = newPlacesSessionToken();
    const b = newPlacesSessionToken();
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(a).not.toBe(b);
  });
});

describe('autocompletePlaces', () => {
  const ORIGINAL = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;
  afterEach(() => { process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY = ORIGINAL; });

  it('returns no_key (no network call) when the key is a placeholder', async () => {
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY = PLACEHOLDER_KEY;
    const fetchSpy = mockAutocompleteFetch([]);
    const r = await autocompletePlaces('Gal', TOKEN, fetchSpy);
    expect(r).toEqual({ ok: false, reason: 'no_key' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns an empty ok result for a blank query without hitting the network', async () => {
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY = REAL_KEY;
    const fetchSpy = mockAutocompleteFetch([]);
    const r = await autocompletePlaces('   ', TOKEN, fetchSpy);
    expect(r).toEqual({ ok: true, suggestions: [] });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('maps suggestions from the Places API (New) response shape', async () => {
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY = REAL_KEY;
    const fetchSpy = mockAutocompleteFetch([
      { placeId: 'p1', text: 'Galway, Ireland', main: 'Galway', secondary: 'Ireland' },
      { placeId: 'p2', text: 'Galway, County Galway', main: 'Galway', secondary: 'County Galway' },
    ]);
    const r = await autocompletePlaces('Gal', TOKEN, fetchSpy);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.suggestions).toEqual([
        { placeId: 'p1', description: 'Galway, Ireland', mainText: 'Galway', secondaryText: 'Ireland' },
        { placeId: 'p2', description: 'Galway, County Galway', mainText: 'Galway', secondaryText: 'County Galway' },
      ]);
    }
  });

  it('sends the session token and Ireland+UK region bias', async () => {
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY = REAL_KEY;
    const fetchSpy = mockAutocompleteFetch([]);
    await autocompletePlaces('Gal', TOKEN, fetchSpy);
    const [, init] = (fetchSpy as jest.Mock).mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body.sessionToken).toBe(TOKEN);
    expect(body.includedRegionCodes).toEqual(['ie', 'gb']);
    expect(body.input).toBe('Gal');
  });

  it('returns unavailable (not a throw) on a non-ok response', async () => {
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY = REAL_KEY;
    const r = await autocompletePlaces('Gal', TOKEN, mockAutocompleteFetch([], false));
    expect(r).toEqual({ ok: false, reason: 'unavailable' });
  });

  it('returns unavailable (not a throw) when fetch itself rejects', async () => {
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY = REAL_KEY;
    const fetchSpy = jest.fn(async () => { throw new Error('network down'); }) as unknown as typeof fetch;
    const r = await autocompletePlaces('Gal', TOKEN, fetchSpy);
    expect(r).toEqual({ ok: false, reason: 'unavailable' });
  });

  it('drops malformed suggestions missing a placeId or text', async () => {
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY = REAL_KEY;
    const fetchSpy = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        suggestions: [
          { placePrediction: { placeId: 'p1', text: { text: 'Galway' } } },
          { placePrediction: { text: { text: 'Missing placeId' } } },
          { placePrediction: { placeId: 'p2' } },
        ],
      }),
    })) as unknown as typeof fetch;
    const r = await autocompletePlaces('Gal', TOKEN, fetchSpy);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.suggestions).toHaveLength(1);
  });
});

describe('getPlaceCoords', () => {
  const ORIGINAL = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;
  afterEach(() => { process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY = ORIGINAL; });

  it('returns no_key without hitting the network when the key is unusable', async () => {
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY = PLACEHOLDER_KEY;
    const fetchSpy = mockDetailsFetch(53.27, -9.05);
    const r = await getPlaceCoords('p1', TOKEN, fetchSpy);
    expect(r).toEqual({ ok: false, reason: 'no_key' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('resolves lat/lng from the Place Details (New) response', async () => {
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY = REAL_KEY;
    const r = await getPlaceCoords('p1', TOKEN, mockDetailsFetch(53.27, -9.05));
    expect(r).toEqual({ ok: true, lat: 53.27, lng: -9.05 });
  });

  it('returns unavailable when location is missing from the response', async () => {
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY = REAL_KEY;
    const r = await getPlaceCoords('p1', TOKEN, mockDetailsFetch(null, null));
    expect(r).toEqual({ ok: false, reason: 'unavailable' });
  });

  it('returns unavailable (not a throw) on a non-ok response', async () => {
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY = REAL_KEY;
    const r = await getPlaceCoords('p1', TOKEN, mockDetailsFetch(53.27, -9.05, false));
    expect(r).toEqual({ ok: false, reason: 'unavailable' });
  });

  it('includes the placeId and session token in the request URL', async () => {
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY = REAL_KEY;
    const fetchSpy = mockDetailsFetch(53.27, -9.05);
    await getPlaceCoords('p1', TOKEN, fetchSpy);
    const [url] = (fetchSpy as jest.Mock).mock.calls[0];
    expect(url).toContain('/places/p1');
    expect(url).toContain(`sessionToken=${TOKEN}`);
  });
});
