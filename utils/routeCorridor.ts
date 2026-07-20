/**
 * utils/routeCorridor.ts
 *
 * Off-course detection for the safety suite.
 *
 * The planned route is modelled as a polyline corridor. Until the Google Maps
 * key lands (BLOCKERS-FOR-JORDAN.md) the only geometry we have is the straight
 * line between from_coords and to_coords, so the corridor is deliberately
 * GENEROUS: real roads bow away from the straight line, and a false SOS-grade
 * alert to a nominated contact is far worse than a slow one. When real route
 * polylines exist, pass them in and tighten CORRIDOR_BASE_KM.
 *
 * Deviation must be SUSTAINED (several consecutive samples beyond the
 * threshold) before the trip is flagged — a GPS blip or a petrol stop just off
 * the road must not page anyone's mother.
 */

export interface LatLng { lat: number; lng: number }

/** Minimum corridor half-width (km) around the planned route. */
export const CORRIDOR_BASE_KM = 5;
/** The corridor also scales with journey length: half-width ≥ 15% of leg length. */
export const CORRIDOR_LEG_FRACTION = 0.15;
/** Consecutive out-of-corridor samples before the trip is flagged. */
export const SUSTAINED_SAMPLES = 6; // at 15s publish interval ≈ 90s continuously off-route

const EARTH_RADIUS_KM = 6371;

/** Great-circle distance between two points (km). */
export function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Distance (km) from a point to a polyline segment, using an equirectangular
 * projection around the segment — accurate to well under 1% at Irish latitudes
 * and segment lengths, which is far tighter than the corridor widths in play.
 */
export function distanceToSegmentKm(p: LatLng, a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const latRef = toRad((a.lat + b.lat) / 2);
  const x = (q: LatLng) => toRad(q.lng) * Math.cos(latRef) * EARTH_RADIUS_KM;
  const y = (q: LatLng) => toRad(q.lat) * EARTH_RADIUS_KM;

  const px = x(p); const py = y(p);
  const ax = x(a); const ay = y(a);
  const bx = x(b); const by = y(b);

  const dx = bx - ax; const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return haversineKm(p, a);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx; const cy = ay + t * dy;
  return Math.sqrt((px - cx) * (px - cx) + (py - cy) * (py - cy));
}

/** Distance (km) from a point to the nearest segment of a polyline. */
export function distanceToRouteKm(point: LatLng, route: LatLng[]): number {
  if (route.length === 0) return Infinity;
  if (route.length === 1) return haversineKm(point, route[0]);
  let min = Infinity;
  for (let i = 0; i < route.length - 1; i++) {
    const d = distanceToSegmentKm(point, route[i], route[i + 1]);
    if (d < min) min = d;
  }
  return min;
}

/** Corridor half-width (km) for a route (generous while routes are straight lines). */
export function corridorHalfWidthKm(route: LatLng[]): number {
  let legKm = 0;
  for (let i = 0; i < route.length - 1; i++) legKm += haversineKm(route[i], route[i + 1]);
  return Math.max(CORRIDOR_BASE_KM, legKm * CORRIDOR_LEG_FRACTION);
}

// ─── Sustained-deviation state machine ───────────────────────────────────────

export interface CorridorMonitor {
  /** Feed a location sample; returns true exactly ONCE, when deviation becomes sustained. */
  addSample(point: LatLng): boolean;
  /** Consecutive out-of-corridor samples so far. */
  outCount(): number;
  /** Whether the sustained-deviation alert has already fired. */
  hasFlagged(): boolean;
  /** Current distance-from-route of the last sample (km), for display. */
  lastDistanceKm(): number | null;
}

/**
 * Create a monitor for one journey. `route` is the planned polyline (today:
 * [from, to] straight line; later: the real route geometry).
 */
export function createCorridorMonitor(route: LatLng[]): CorridorMonitor {
  const halfWidth = corridorHalfWidthKm(route);
  let out = 0;
  let flagged = false;
  let lastDist: number | null = null;

  return {
    addSample(point: LatLng): boolean {
      lastDist = distanceToRouteKm(point, route);
      if (lastDist <= halfWidth) {
        out = 0;
        return false;
      }
      out += 1;
      if (!flagged && out >= SUSTAINED_SAMPLES) {
        flagged = true;
        return true;
      }
      return false;
    },
    outCount: () => out,
    hasFlagged: () => flagged,
    lastDistanceKm: () => lastDist,
  };
}
