/**
 * services/maps.ts
 *
 * Stage 26 — Google Maps Routes API integration.
 *
 * calculateRoute(from, to) calls the Routes API and returns distance,
 * duration, and an encoded polyline for drawing on a map.
 *
 * The API key is read from the EXPO_PUBLIC_GOOGLE_MAPS_API_KEY environment
 * variable (set in .env.local — Jordan fills in the real key).
 *
 * Routes API reference:
 *   https://developers.google.com/maps/documentation/routes
 */

import Constants from 'expo-constants';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RouteResult {
  distanceKm:      number;
  durationMinutes: number;
  polyline:        string;  // encoded polyline string
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

const ROUTES_API_URL =
  'https://routes.googleapis.com/directions/v2:computeRoutes';

function getApiKey(): string {
  // expo-constants exposes manifest extra values at runtime
  const key =
    Constants.expoConfig?.extra?.googleMapsApiKey as string | undefined ??
    process.env['EXPO_PUBLIC_GOOGLE_MAPS_API_KEY'] ??
    '';
  return key;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Calculate a driving route between two address strings.
 * Throws if the API returns an error or an unexpected payload shape.
 */
export async function calculateRoute(
  from: string,
  to:   string,
): Promise<RouteResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error(
      'Google Maps API key not configured. Set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local',
    );
  }

  const body = {
    origin:      { address: from },
    destination: { address: to },
    travelMode:  'DRIVE',
    routingPreference: 'TRAFFIC_AWARE',
    computeAlternativeRoutes: false,
    routeModifiers: { avoidTolls: false },
  };

  const response = await fetch(ROUTES_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type':    'application/json',
      'X-Goog-Api-Key':  apiKey,
      'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Routes API error: ${response.status} ${response.statusText}`);
  }

  const json = await response.json() as {
    routes?: Array<{
      distanceMeters?: number;
      duration?:       string;   // e.g. "3600s"
      polyline?: { encodedPolyline?: string };
    }>;
  };

  const route = json.routes?.[0];
  if (!route) {
    throw new Error('No route found between the specified locations.');
  }

  const distanceKm = (route.distanceMeters ?? 0) / 1000;

  // duration is returned as "Xs" (seconds string)
  const durationSeconds = route.duration
    ? parseInt(route.duration.replace('s', ''), 10)
    : 0;
  const durationMinutes = Math.ceil(durationSeconds / 60);

  const polyline = route.polyline?.encodedPolyline ?? '';

  return { distanceKm, durationMinutes, polyline };
}
