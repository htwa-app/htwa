# Prompt for Claude Code — Fix Ireland Map SVG

**File to edit:** `website/index.html`

---

## The problem

The SVG map of the island of Ireland in the `<div class="map-col">` section is wrong in two ways:
1. The outline path is a rough oval/blob shape — it does not look like Ireland at all
2. Some city positions are inaccurate relative to the real geography

## What to do

Replace the entire `<svg>` block inside `<div class="map-col">` with the corrected version below. Do not change anything else in the file.

---

## Replacement SVG

Replace this:
```html
<svg viewBox="0 0 200 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Map of the island of Ireland with animated route lines">
  ... (everything inside the svg tag) ...
</svg>
```

With this exact SVG:

```html
<svg viewBox="0 0 200 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Map of the island of Ireland with animated route lines">
  <defs>
    <!-- Amber arrowhead marker -->
    <marker id="arrow" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0.5 L0,6.5 L6.5,3.5 Z" fill="#E8A55A" />
    </marker>
    <!-- Subtle drop shadow -->
    <filter id="mapShadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#1F7A78" flood-opacity="0.08"/>
    </filter>
  </defs>

  <!-- Ireland outline — geographically accurate simplified path -->
  <!-- Coordinates derived from real lat/lon data, viewBox 0 0 200 260 -->
  <!-- Clockwise from Malin Head (northernmost point) -->
  <path
    d="M 120,10
       L 164,19 L 176,42 L 181,54 L 186,71 L 170,90
       L 156,95 L 166,120 L 160,135 L 164,143 L 170,157
       L 156,206 L 135,210 L 95,230 L 79,241 L 60,248 L 33,250
       L 19,240 L 11,210 L 16,199
       L 29,181 L 53,146
       L 28,125 L 31,104 L 19,95 L 27,75
       L 55,80 L 71,76
       L 88,65 L 94,54 L 82,55 L 74,55 L 73,50
       L 89,23 L 99,18
       Z"
    fill="rgba(31,122,120,0.07)"
    stroke="rgba(31,122,120,0.28)"
    stroke-width="1.5"
    stroke-linejoin="round"
    filter="url(#mapShadow)"
  />

  <!-- Route lines (animated dashed, with amber arrowheads) -->
  <g class="route-lines">
    <!-- Belfast → Dublin -->
    <line class="route-line" x1="172" y1="57" x2="160" y2="135" marker-end="url(#arrow)" />
    <!-- Dublin → Cork -->
    <line class="route-line" x1="160" y1="135" x2="81" y2="222" marker-end="url(#arrow)" />
    <!-- Galway → Dublin -->
    <line class="route-line" x1="61" y1="139" x2="160" y2="135" marker-end="url(#arrow)" />
    <!-- Derry → Galway -->
    <line class="route-line" x1="123" y1="33" x2="61" y2="139" marker-end="url(#arrow)" />
    <!-- Cork → Limerick -->
    <line class="route-line" x1="81" y1="222" x2="76" y2="175" marker-end="url(#arrow)" />
    <!-- Limerick → Athlone -->
    <line class="route-line" x1="76" y1="175" x2="100" y2="129" marker-end="url(#arrow)" />
    <!-- Athlone → Dublin -->
    <line class="route-line" x1="100" y1="129" x2="160" y2="135" marker-end="url(#arrow)" />
    <!-- Kilkenny → Dublin -->
    <line class="route-line" x1="125" y1="177" x2="160" y2="135" marker-end="url(#arrow)" />
  </g>

  <!-- City dots (lavender) -->
  <g fill="rgba(200,184,232,0.9)" stroke="#fff" stroke-width="1">
    <circle cx="172" cy="57"  r="4.5" />  <!-- Belfast -->
    <circle cx="123" cy="33"  r="4"   />  <!-- Derry -->
    <circle cx="160" cy="135" r="5"   />  <!-- Dublin -->
    <circle cx="61"  cy="139" r="4.5" />  <!-- Galway -->
    <circle cx="100" cy="129" r="3.5" />  <!-- Athlone -->
    <circle cx="76"  cy="175" r="3.5" />  <!-- Limerick -->
    <circle cx="125" cy="177" r="3.5" />  <!-- Kilkenny -->
    <circle cx="81"  cy="222" r="4.5" />  <!-- Cork -->
  </g>

  <!-- City labels -->
  <g font-family="'Poppins', system-ui, sans-serif" font-size="8.5" fill="#2A251F" fill-opacity="0.6">
    <text x="167" y="55"  text-anchor="end">Belfast</text>
    <text x="128" y="31"  text-anchor="start">Derry</text>
    <text x="155" y="133" text-anchor="end">Dublin</text>
    <text x="56"  y="137" text-anchor="end">Galway</text>
    <text x="105" y="127" text-anchor="start">Athlone</text>
    <text x="71"  y="173" text-anchor="end">Limerick</text>
    <text x="130" y="175" text-anchor="start">Kilkenny</text>
    <text x="76"  y="232" text-anchor="end">Cork</text>
  </g>
</svg>
```

---

## Notes on the path

The outline path follows real Irish geography clockwise from Malin Head (northernmost point):
- **North Antrim coast** — east to Fair Head, then south down the east coast
- **East coast** — through Down, Louth (Dundalk Bay), past Dublin, Wicklow, Wexford
- **Carnsore Point** — the SE corner (x=156, y=206)
- **South coast** — Waterford, Cork, Old Head of Kinsale
- **SW peninsulas** — Mizen Head (westernmost south point x=33, y=250), then NW up to Beara/Dursey (x=19, y=240), then Dingle/Slea Head (x=11, y=210)
- **West coast** — Loop Head, Clare, Galway Bay mouth, Connemara, Clew Bay, Achill, Erris Head
- **Donegal Bay** — NE into the bay (Bundoran, Donegal Town), then back SW (Killybegs, Slieve League, Glencolmcille)
- **North Donegal** — Bloody Foreland, Horn Head, back to Malin Head

Do not change anything else in the file — only the SVG content. Once done, open `website/index.html` in a browser to verify the island shape looks correct before committing.
