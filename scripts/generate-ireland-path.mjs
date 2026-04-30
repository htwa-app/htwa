import { geoMercator, geoPath } from 'd3-geo';
import { feature, merge } from 'topojson-client';
import fetch from 'node-fetch';

const res = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json');
const world = await res.json();

const countries = feature(world, world.objects.countries).features;
const ireland = countries.find(d => String(d.id) === '372');

// Merge Ireland (372) + UK (826) — dissolves the shared border so NI joins ROI seamlessly
const targetGeoms = world.objects.countries.geometries.filter(g =>
  ['372', '826'].includes(String(g.id))
);
const islandMerged = merge(world, targetGeoms);

// Fit projection to Ireland (Republic) — this scaling worked in the previous session
// and places Dublin at (175.6, 138.5). NI sits just north of ROI so it falls within
// the same viewBox. Great Britain projects far to the right and is clipped.
const projection = geoMercator().fitExtent([[4, 4], [196, 256]], ireland);
const path = geoPath().projection(projection);

// Sanity check
const dublinPx = projection([-6.249, 53.333]);
console.error(`[debug] Dublin: ${dublinPx[0].toFixed(1)}, ${dublinPx[1].toFixed(1)}`);

const cities = {
  Belfast:   [54.597, -5.930],
  Derry:     [54.997, -7.309],
  Dublin:    [53.333, -6.249],
  Galway:    [53.270, -9.056],
  Athlone:   [53.422, -7.944],
  Limerick:  [52.668, -8.630],
  Kilkenny:  [52.654, -7.252],
  Cork:      [51.898, -8.471],
};

console.log('ISLAND PATH:');
console.log(path(islandMerged));
console.log('\nCITY PIXELS:');
for (const [name, [lat, lon]] of Object.entries(cities)) {
  const [x, y] = projection([lon, lat]);
  console.log(`${name}: ${x.toFixed(1)}, ${y.toFixed(1)}`);
}
