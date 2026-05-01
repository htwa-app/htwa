import { geoMercator, geoPath } from 'd3-geo';
import { feature, merge } from 'topojson-client';
import fetch from 'node-fetch';

const res = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json');
const world = await res.json();

const countries = feature(world, world.objects.countries).features;

// Merge Ireland (372) + UK (826) — dissolves the shared border so NI joins ROI seamlessly
const targetGeoms = world.objects.countries.geometries.filter(g =>
  ['372', '826'].includes(String(g.id))
);
const islandMerged = merge(world, targetGeoms);

// Two corner points spanning the full island bounding box, extended to -4.5°W
// so County Down and the northeast coast fit within the 200px viewBox.
// Using MultiPoint (not Polygon) avoids d3-geo's spherical winding ambiguity —
// a Polygon rectangle gets interpreted as wrapping the entire globe, causing
// all projected coordinates to cluster in a ~3px area.
const islandBounds = {
  type: 'Feature',
  geometry: {
    type: 'MultiPoint',
    coordinates: [[-10.7, 51.0], [-4.5, 55.6]]
  }
};

const projection = geoMercator().fitExtent([[8, 6], [192, 254]], islandBounds);
const path = geoPath().projection(projection);

// Sanity checks — Dublin should be roughly centre-right, Strangford (Co. Down east coast)
// must be < 200 for County Down to be fully visible.
const dublinPx      = projection([-6.249, 53.333]);
const strangfordPx  = projection([-5.57,  54.37]);
console.error(`[debug] Dublin:     ${dublinPx[0].toFixed(1)}, ${dublinPx[1].toFixed(1)}`);
console.error(`[debug] Strangford: ${strangfordPx[0].toFixed(1)}, ${strangfordPx[1].toFixed(1)}  (must be < 200)`);

const cities = {
  Belfast:   [54.597, -5.930],
  Derry:     [54.997, -7.309],
  Dublin:    [53.333, -6.249],
  Galway:    [53.270, -9.056],
  Athlone:   [53.422, -7.944],
  Limerick:  [52.668, -8.630],
  Kilkenny:  [52.654, -7.252],
  Cork:      [51.898, -8.471],
  Sligo:     [54.270, -8.470],
};

console.log('ISLAND PATH:');
console.log(path(islandMerged));
console.log('\nCITY PIXELS:');
for (const [name, [lat, lon]] of Object.entries(cities)) {
  const [x, y] = projection([lon, lat]);
  console.log(`${name}: ${x.toFixed(1)}, ${y.toFixed(1)}`);
}
