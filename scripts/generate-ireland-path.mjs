import { geoMercator, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import fetch from 'node-fetch';

const res = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json');
const world = await res.json();

const countries = feature(world, world.objects.countries).features;
const ireland = countries.find(d => String(d.id) === '372');

if (!ireland) { console.error('Ireland feature not found'); process.exit(1); }

// --- Approach: fitSize directly to the Ireland feature ---
// This is more reliable than fitting to a bounding-box polygon.
// We give a 4px margin on each side inside the 200x260 viewBox.
const projection = geoMercator().fitExtent([[4, 4], [196, 256]], ireland);

// Debug: confirm the projection is sensible
const scale = projection.scale();
const translate = projection.translate();
console.error(`[debug] scale=${scale.toFixed(2)}  translate=[${translate[0].toFixed(2)}, ${translate[1].toFixed(2)}]`);

// Sanity-check Dublin
const dublinPx = projection([-6.249, 53.333]);
console.error(`[debug] Dublin projected: ${dublinPx[0].toFixed(1)}, ${dublinPx[1].toFixed(1)}`);

const path = geoPath().projection(projection);

const cities = {
  Belfast:  [54.597, -5.930],
  Derry:    [54.997, -7.309],
  Dublin:   [53.333, -6.249],
  Galway:   [53.270, -9.056],
  Athlone:  [53.422, -7.944],
  Limerick: [52.668, -8.630],
  Kilkenny: [52.654, -7.252],
  Cork:     [51.898, -8.471],
};

console.log('IRELAND PATH:');
console.log(path(ireland));
console.log('\nCITY PIXELS:');
for (const [name, [lat, lon]] of Object.entries(cities)) {
  const [x, y] = projection([lon, lat]);
  console.log(`${name}: ${x.toFixed(1)}, ${y.toFixed(1)}`);
}
