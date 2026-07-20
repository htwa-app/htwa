/**
 * __tests__/unit/routeCorridor.test.ts
 * Safety suite — unit tests for utils/routeCorridor.ts
 */
import {
  CORRIDOR_BASE_KM,
  CORRIDOR_LEG_FRACTION,
  SUSTAINED_SAMPLES,
  corridorHalfWidthKm,
  createCorridorMonitor,
  distanceToRouteKm,
  distanceToSegmentKm,
  haversineKm,
} from '../../utils/routeCorridor';

const DUBLIN  = { lat: 53.3498, lng: -6.2603 };
const GALWAY  = { lat: 53.2707, lng: -9.0568 };
const ATHLONE = { lat: 53.4239, lng: -7.9407 }; // roughly on the Dublin–Galway line
const BELFAST = { lat: 54.5973, lng: -5.9301 }; // far off it

describe('haversineKm', () => {
  it('is zero for identical points', () => {
    expect(haversineKm(DUBLIN, DUBLIN)).toBe(0);
  });

  it('Dublin→Galway is ~187km', () => {
    const d = haversineKm(DUBLIN, GALWAY);
    expect(d).toBeGreaterThan(175);
    expect(d).toBeLessThan(200);
  });

  it('is symmetric', () => {
    expect(haversineKm(DUBLIN, GALWAY)).toBeCloseTo(haversineKm(GALWAY, DUBLIN), 9);
  });
});

describe('distanceToSegmentKm', () => {
  it('a point on the line is ~0 away', () => {
    const mid = { lat: (DUBLIN.lat + GALWAY.lat) / 2, lng: (DUBLIN.lng + GALWAY.lng) / 2 };
    expect(distanceToSegmentKm(mid, DUBLIN, GALWAY)).toBeLessThan(1);
  });

  it('clamps to endpoints beyond the segment', () => {
    // A point past Galway measures to Galway, not to the infinite line.
    const past = { lat: 53.2, lng: -9.8 };
    const seg = distanceToSegmentKm(past, DUBLIN, GALWAY);
    expect(seg).toBeCloseTo(haversineKm(past, GALWAY), 0);
  });

  it('degenerate zero-length segment falls back to point distance', () => {
    expect(distanceToSegmentKm(BELFAST, DUBLIN, DUBLIN)).toBeCloseTo(haversineKm(BELFAST, DUBLIN), 0);
  });

  it('Athlone is close to the Dublin–Galway line, Belfast is not', () => {
    expect(distanceToSegmentKm(ATHLONE, DUBLIN, GALWAY)).toBeLessThan(15);
    expect(distanceToSegmentKm(BELFAST, DUBLIN, GALWAY)).toBeGreaterThan(100);
  });
});

describe('distanceToRouteKm', () => {
  it('empty route is infinitely far', () => {
    expect(distanceToRouteKm(DUBLIN, [])).toBe(Infinity);
  });

  it('single-point route measures to that point', () => {
    expect(distanceToRouteKm(BELFAST, [DUBLIN])).toBeCloseTo(haversineKm(BELFAST, DUBLIN), 6);
  });

  it('takes the nearest of several segments', () => {
    const route = [DUBLIN, ATHLONE, GALWAY];
    expect(distanceToRouteKm(ATHLONE, route)).toBeLessThan(0.5);
  });
});

describe('corridorHalfWidthKm', () => {
  it('never narrower than the base width', () => {
    expect(corridorHalfWidthKm([DUBLIN, { lat: 53.35, lng: -6.28 }])).toBe(CORRIDOR_BASE_KM);
  });

  it('scales with journey length for long legs', () => {
    const w = corridorHalfWidthKm([DUBLIN, GALWAY]);
    expect(w).toBeCloseTo(haversineKm(DUBLIN, GALWAY) * CORRIDOR_LEG_FRACTION, 5);
    expect(w).toBeGreaterThan(CORRIDOR_BASE_KM);
  });
});

describe('createCorridorMonitor', () => {
  it('in-corridor samples never flag', () => {
    const m = createCorridorMonitor([DUBLIN, GALWAY]);
    for (let i = 0; i < 50; i++) expect(m.addSample(ATHLONE)).toBe(false);
    expect(m.hasFlagged()).toBe(false);
    expect(m.outCount()).toBe(0);
  });

  it(`flags exactly once after ${SUSTAINED_SAMPLES} consecutive out-of-corridor samples`, () => {
    const m = createCorridorMonitor([DUBLIN, GALWAY]);
    const fires: boolean[] = [];
    for (let i = 0; i < SUSTAINED_SAMPLES + 3; i++) fires.push(m.addSample(BELFAST));
    expect(fires.filter(Boolean)).toHaveLength(1);
    expect(fires[SUSTAINED_SAMPLES - 1]).toBe(true);
    expect(m.hasFlagged()).toBe(true);
  });

  it('a single blip back inside the corridor resets the counter', () => {
    const m = createCorridorMonitor([DUBLIN, GALWAY]);
    for (let i = 0; i < SUSTAINED_SAMPLES - 1; i++) m.addSample(BELFAST);
    m.addSample(ATHLONE); // back on route
    expect(m.outCount()).toBe(0);
    for (let i = 0; i < SUSTAINED_SAMPLES - 1; i++) {
      expect(m.addSample(BELFAST)).toBe(false);
    }
    expect(m.addSample(BELFAST)).toBe(true);
  });

  it('reports the last sample distance for display', () => {
    const m = createCorridorMonitor([DUBLIN, GALWAY]);
    expect(m.lastDistanceKm()).toBeNull();
    m.addSample(BELFAST);
    expect(m.lastDistanceKm()).toBeGreaterThan(100);
  });
});
