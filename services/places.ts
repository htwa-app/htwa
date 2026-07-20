/**
 * services/places.ts
 *
 * Google Places API (New) autocomplete for the route inputs (Stage 27,
 * unblocked now the Maps key exists — see BLOCKERS-FOR-JORDAN.md item 1 for
 * the current key-validity issue). Mirrors services/routes.ts's conventions:
 * same env var fallback, same isMapsKeyUsable gate, same injectable fetchImpl
 * for testing, same graceful `{ ok: false, reason }` shape rather than
 * throwing.
 *
 * Biased to Ireland + UK (`includedRegionCodes: ['ie', 'gb']`) since every
 * journey on the platform starts or ends in one of those two jurisdictions.
 *
 * A session token groups an autocomplete-then-details sequence into one
 * Google Places billing session (cheaper than billing each call
 * independently) — callers should generate one per "user starts typing" and
 * reuse it until a place is selected or the field is abandoned.
 */

import { isMapsKeyUsable } from './routes';

export interface PlaceSuggestion {
  placeId: string;
  /** Full display text, e.g. "Galway, Ireland". */
  description: string;
  /** Bold/matched portion for highlighting, e.g. "Galway". */
  mainText: string;
  /** Remainder, e.g. "Ireland". */
  secondaryText: string;
}

export type PlacesAutocompleteResult =
  | { ok: true; suggestions: PlaceSuggestion[] }
  | { ok: false; reason: 'no_key' | 'unavailable' };

export type PlaceCoordsResult =
  | { ok: true; lat: number; lng: number }
  | { ok: false; reason: 'no_key' | 'unavailable' };

const AUTOCOMPLETE_ENDPOINT = 'https://places.googleapis.com/v1/places:autocomplete';
const PLACES_TIMEOUT_MS = 8000;

function getApiKey(): string | undefined {
  return process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
}

/** Generates a fresh session token (v4-shaped, no external uuid dependency needed). */
export function newPlacesSessionToken(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Autocomplete suggestions for a partial address, biased to Ireland + UK.
 * Returns an empty (ok) list for a blank/whitespace query rather than hitting
 * the network — callers should also debounce keystrokes themselves.
 */
export async function autocompletePlaces(
  input: string,
  sessionToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<PlacesAutocompleteResult> {
  const apiKey = getApiKey();
  if (!isMapsKeyUsable(apiKey)) {
    return { ok: false, reason: 'no_key' };
  }
  if (!input.trim()) {
    return { ok: true, suggestions: [] };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PLACES_TIMEOUT_MS);
  try {
    const res = await fetchImpl(AUTOCOMPLETE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey as string,
      },
      body: JSON.stringify({
        input,
        sessionToken,
        includedRegionCodes: ['ie', 'gb'],
      }),
      signal: controller.signal,
    });

    if (!res.ok) return { ok: false, reason: 'unavailable' };

    const data = (await res.json()) as {
      suggestions?: Array<{
        placePrediction?: {
          placeId?: string;
          text?: { text?: string };
          structuredFormat?: {
            mainText?: { text?: string };
            secondaryText?: { text?: string };
          };
        };
      }>;
    };

    const suggestions: PlaceSuggestion[] = (data.suggestions ?? [])
      .map((s) => s.placePrediction)
      .filter((p): p is NonNullable<typeof p> => !!p?.placeId && !!p?.text?.text)
      .map((p) => ({
        placeId: p.placeId as string,
        description: p.text!.text as string,
        mainText: p.structuredFormat?.mainText?.text ?? (p.text!.text as string),
        secondaryText: p.structuredFormat?.secondaryText?.text ?? '',
      }));

    return { ok: true, suggestions };
  } catch {
    return { ok: false, reason: 'unavailable' };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Resolves a selected suggestion's placeId to coordinates (Place Details,
 * New) — closes out the same session token used for the autocomplete call.
 */
export async function getPlaceCoords(
  placeId: string,
  sessionToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<PlaceCoordsResult> {
  const apiKey = getApiKey();
  if (!isMapsKeyUsable(apiKey)) {
    return { ok: false, reason: 'no_key' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PLACES_TIMEOUT_MS);
  try {
    const res = await fetchImpl(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?sessionToken=${encodeURIComponent(sessionToken)}`,
      {
        method: 'GET',
        headers: {
          'X-Goog-Api-Key': apiKey as string,
          'X-Goog-FieldMask': 'location',
        },
        signal: controller.signal,
      },
    );

    if (!res.ok) return { ok: false, reason: 'unavailable' };

    const data = (await res.json()) as { location?: { latitude?: number; longitude?: number } };
    const lat = data.location?.latitude;
    const lng = data.location?.longitude;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return { ok: false, reason: 'unavailable' };
    }
    return { ok: true, lat, lng };
  } catch {
    return { ok: false, reason: 'unavailable' };
  } finally {
    clearTimeout(timeout);
  }
}
