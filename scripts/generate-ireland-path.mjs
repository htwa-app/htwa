import { geoMercator, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import fetch from 'node-fetch';

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 10_000);
let world;
try {
  const res = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json', { signal: controller.signal });
  if (!res.ok) {
    throw new Error(`Failed to fetch world atlas: ${res.status} ${res.statusText}`);
  }
  world = await res.json();
} catch (err) {
  console.error('[error] Could not load world atlas:', err.message);
  process.exit(1);
} finally {
  clearTimeout(timeout);
}

const countries = feature(world, world.objects.countries).features;
const ireland = countries.find(d => String(d.id) === '372');
const uk      = countries.find(d => String(d.id) === '826');
if (!ireland) { console.error('[error] Ireland (id 372) not found in world atlas'); process.exit(1); }
if (!uk)      { console.error('[error] UK (id 826) not found in world atlas'); process.exit(1); }
if (!uk.geometry?.coordinates) { console.error('[error] UK feature has no geometry coordinates'); process.exit(1); }

// ─── Extract only the NI sub-polygon(s) from the UK MultiPolygon ──────────────
// UK (826) is a MultiPolygon: one polygon = Great Britain, one = NI, others = small islands.
// NI is geographically separate from GB (Irish Sea) so it appears as its own polygon.
// Filter by centroid: NI is roughly lon -8.2→-5.4, lat 54.0→55.3
const NI_LON = [-8.2, -5.4];
const NI_LAT = [54.0, 55.3];

const niPolygons = uk.geometry.coordinates.filter(polygon => {
  const ring = polygon[0];                                    // exterior ring
  const avgLon = ring.reduce((s, p) => s + p[0], 0) / ring.length;
  const avgLat = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  const inside = avgLon >= NI_LON[0] && avgLon <= NI_LON[1]
              && avgLat >= NI_LAT[0] && avgLat <= NI_LAT[1];
  if (inside) console.error(`[debug] NI polygon centroid: ${avgLon.toFixed(2)}, ${avgLat.toFixed(2)}`);
  return inside;
});

console.error(`[debug] Found ${niPolygons.length} NI polygon(s) from UK feature`);

// Build a GeoJSON Feature containing just NI (MultiPolygon)
const niFeature = {
  type: 'Feature',
  geometry: { type: 'MultiPolygon', coordinates: niPolygons }
};

// ─── Projection ────────────────────────────────────────────────────────────────
// Fit to the Republic of Ireland feature — this reliably produces correct scale
// and city coordinates. Shift 10px left so NI's east coast (Ards ~x=207 pre-shift)
// lands at ~x=197, well within the 200px viewBox.
const projection = geoMercator().fitExtent([[4, 4], [196, 256]], ireland);
const [tx, ty] = projection.translate();
projection.translate([tx - 10, ty]);
const path = geoPath().projection(projection);

// Sanity checks
const dublinPx  = projection([-6.249, 53.333]);
const ardsPx    = projection([-5.44,  54.44]);
const belfastPx = projection([-5.930, 54.597]);
console.error(`[debug] Dublin:   ${dublinPx[0].toFixed(1)}, ${dublinPx[1].toFixed(1)}`);
console.error(`[debug] Belfast:  ${belfastPx[0].toFixed(1)}, ${belfastPx[1].toFixed(1)}`);
console.error(`[debug] Ards Pen: ${ardsPx[0].toFixed(1)}, ${ardsPx[1].toFixed(1)}  (must be < 200)`);

const cities = {
  Belfast:  [54.597, -5.930],
  Derry:    [54.997, -7.309],
  Dublin:   [53.333, -6.249],
  Galway:   [53.270, -9.056],
  Athlone:  [53.422, -7.944],
  Limerick: [52.668, -8.630],
  Kilkenny: [52.654, -7.252],
  Cork:     [51.898, -8.471],
  Sligo:    [54.270, -8.470],
};

console.log('ROI PATH:');
console.log(path(ireland));
console.log('\nNI PATH:');
console.log(path(niFeature));
console.log('\nCITY PIXELS:');
for (const [name, [lat, lon]] of Object.entries(cities)) {
  const [x, y] = projection([lon, lat]);
  console.log(`${name}: ${x.toFixed(1)}, ${y.toFixed(1)}`);
}
