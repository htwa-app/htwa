# HTWA — Design Specification
> Developer handoff document. All Claude Code implementations must follow this spec exactly.
> Last updated: 29 April 2026

---

## 1. Brand Colours

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#1F7A78` | Buttons, links, active states, route chips, icons |
| `primaryLight` | `#E8F4F4` | Button backgrounds (secondary), teal tint surfaces |
| `lavender` | `#C8B8E8` | Women-only mode UI, accent surfaces, info boxes |
| `lavenderLight` | `#F0EBF8` | Lavender tint backgrounds |
| `amber` | `#E8A55A` | Warm accent, savings callouts, highlights |
| `amberLight` | `#FDF3E7` | Amber tint backgrounds |
| `background` | `#F7F3ED` | Page/screen background — always off-white, never cold grey |
| `surface` | `#FFFFFF` | Cards, modals, input fields |
| `textPrimary` | `#2A251F` | All primary body text and headings |
| `textSecondary` | `rgba(40,30,20,0.55)` | Subtitles, captions, placeholder text |
| `textTertiary` | `rgba(40,30,20,0.35)` | Disabled states, fine print |
| `border` | `rgba(40,30,20,0.10)` | Card borders, dividers, input borders |
| `verified` | `#34C759` | Verified tick/badge (iOS system green) |
| `sos` | `#FF3B30` | Silent SOS button only |
| `shadow` | `rgba(0,0,0,0.07)` | Soft card shadows throughout |

**Never use:** pure black (#000000), pure white (#FFFFFF) as a background, cold greys, or any colour not listed above.

---

## 2. Typography

**Font family:** Poppins (primary), system-ui as fallback  
**Import:** `expo-google-fonts/poppins` or `@expo-google-fonts/poppins`

| Style | Font | Size | Weight | Line Height | Usage |
|-------|------|------|--------|-------------|-------|
| `displayLarge` | Poppins | 32px | 700 | 1.1 | App name, hero headings |
| `displayMedium` | Poppins | 24px | 600 | 1.2 | Screen titles |
| `headingLarge` | Poppins | 20px | 600 | 1.3 | Section headings |
| `headingMedium` | Poppins | 17px | 600 | 1.3 | Card titles, list headings |
| `headingSmall` | Poppins | 15px | 600 | 1.4 | Sub-headings |
| `bodyLarge` | Poppins | 16px | 400 | 1.5 | Primary body text |
| `bodyMedium` | Poppins | 14px | 400 | 1.5 | Secondary body text |
| `bodySmall` | Poppins | 12px | 400 | 1.5 | Captions, metadata |
| `label` | Poppins | 12px | 500 | 1.4 | Chips, badges, tags |
| `micro` | Poppins | 10px | 400 | 1.4 | Legal text, fine print |
| `button` | Poppins | 16px | 600 | 1 | All button labels |
| `buttonSmall` | Poppins | 14px | 600 | 1 | Small button labels |

---

## 3. Spacing & Layout

**Base unit:** 4px  
**Standard spacing scale:** 4, 8, 12, 16, 20, 24, 32, 40, 48px

| Token | Value | Usage |
|-------|-------|-------|
| `screenPadding` | 20px | Horizontal padding on all screens |
| `cardPadding` | 16px | Internal padding on cards |
| `sectionGap` | 24px | Gap between major sections |
| `itemGap` | 12px | Gap between list items |
| `inputHeight` | 52px | All text input fields |
| `buttonHeight` | 52px | Primary buttons |
| `buttonHeightSmall` | 40px | Secondary/small buttons |
| `tabBarHeight` | 60px | Bottom tab bar |
| `headerHeight` | 56px | Navigation header |

---

## 4. Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `radiusSmall` | 8px | Chips, badges, small tags |
| `radiusMedium` | 12px | Input fields, small cards |
| `radiusLarge` | 16px | Cards, modals, info boxes |
| `radiusXL` | 24px | Bottom sheets, large cards |
| `radiusFull` | 999px | Pills, avatar circles, full-round buttons |

**Rule:** Always use rounded corners. Nothing sharp or angular.

---

## 5. Shadows

```javascript
// Standard card shadow
shadowColor: '#000',
shadowOffset: { width: 0, height: 2 },
shadowOpacity: 0.07,
shadowRadius: 8,
elevation: 3,  // Android

// Elevated modal shadow
shadowColor: '#000',
shadowOffset: { width: 0, height: 4 },
shadowOpacity: 0.10,
shadowRadius: 16,
elevation: 8,
```

---

## 6. Components

### 6.1 Primary Button
```
Background: #1F7A78
Text: #FFFFFF, button style (Poppins 16px 600)
Height: 52px
Border radius: 999px (full pill shape)
Padding: 0 24px
Active state: opacity 0.85
Disabled: background #C8C8C8, text #FFFFFF
```

### 6.2 Secondary Button
```
Background: #E8F4F4
Text: #1F7A78, button style
Height: 52px
Border radius: 999px
Border: 1.5px solid #1F7A78
```

### 6.3 Input Field
```
Background: #FFFFFF
Border: 1.5px solid rgba(40,30,20,0.10)
Border radius: 12px
Height: 52px
Padding: 0 16px
Font: Poppins 16px 400
Placeholder colour: rgba(40,30,20,0.35)
Focus border: 1.5px solid #1F7A78
```

### 6.4 Card
```
Background: #FFFFFF
Border radius: 16px
Border: 1px solid rgba(40,30,20,0.08)
Shadow: standard card shadow (see above)
Padding: 16px
```

### 6.5 Verified Badge
```
Background: #34C759 (green)
Icon: white tick ✓
Shape: soft circle
Label: "Verified" in Poppins 11px 500 white
```

### 6.6 Chip / Tag
```
Background: #E8F4F4
Text: #1F7A78, Poppins 12px 500
Border radius: 999px
Padding: 4px 12px
Height: 28px
```

### 6.7 Women-Only Badge
```
Background: #C8B8E8
Text: #2A1F4A, Poppins 12px 500
Border radius: 999px
Padding: 4px 12px
```

**Women-only mode works both ways:**
- A female driver toggling women-only on her ride → only female passengers can request to join
- A female passenger filtering search → only women-only rides appear in results
- Enforcement must happen at the database level (Supabase RLS / server-side check), not just the UI
- The women-only badge appears on ride cards and driver profiles whenever this mode is active

### 6.8 Tab Bar
```
Background: #FFFFFF
Border top: 1px solid rgba(40,30,20,0.08)
Active icon/label: #1F7A78
Inactive icon/label: rgba(40,30,20,0.40)
Height: 60px
Tabs: Search, History, Live Trip, Profile
```

### 6.9 Avatar
```
Shape: circle
Border: 2px solid #FFFFFF
Shadow: standard card shadow
Initials font: Poppins 14px 600
Background: use primary or lavender depending on context
```

### 6.10 Silent SOS Button
```
Background: #FF3B30
Text: "Silent SOS" Poppins 13px 600 white
Border radius: 999px
Padding: 8px 16px
Only appears on live trip screen
```

---

## 7. Screen Backgrounds

All screens use `#F7F3ED` as the background. Never use white (#FFFFFF) or grey as a screen background. Cards and surfaces sit on top of the off-white background.

---

## 8. Icons

Use `@expo/vector-icons` with the `Ionicons` set throughout. Icon colour follows the text or brand colour of the context. Size: 24px standard, 20px small, 28px large.

---

## 9. Screen-by-Screen Layout

### 9.1 Login Screen
- Background: `#F7F3ED`
- Top: "htwa" in `displayLarge` teal, centred
- Tagline: "Heading That Way Anyway?" in `bodyLarge` textSecondary, centred
- Social proof: row of 3 avatar circles + "2,400+ verified students" in `bodySmall`
- Small note: "Every account checked against a college email" with a shield icon
- Buttons (stacked, full width): Continue with Apple (black), Continue with Google (white/bordered), Continue with mobile, Continue with email
- All buttons use `radiusFull`
- Footer: Terms & Community Safety Pledge link in `micro` textTertiary

### 9.2 Home Screen
- Background: `#F7F3ED`
- Header: greeting "Hey [Name] 👋" in `headingLarge`, avatar top right
- Two toggle tabs: "Find a ride" | "Offer a ride" — pill-shaped, active tab fills teal
- Route input: From (green dot) → To (orange dot) with swap icon, inside a white card
- Filter chips: Day, Time, Seats — teal chip style
- Primary CTA: "Search rides" full-width teal pill button
- Section: "Built with you in mind" with `Safety hub →` link
- Safety feature grid (2×2): Share my journey (teal), Women-only mode (lavender), Verified IDs (green), In-app SOS (red/pink) — each a rounded card with icon and 2-line description
- Section: "Upcoming for you" — list of upcoming rides

### 9.3 Driver Profile Screen
- Background: `#F7F3ED`
- Hero: diagonal stripe pattern in lavender/teal (decorative)
- Avatar: large circle, name below in `headingLarge`
- University + join date in `bodySmall` textSecondary
- Badges row: `.ie email`, `Verified` (green tick), `Trusted` (amber)
- Stats row: Rating (4.95), Trips driven (47), Reliability (98%) — three equal columns
- Vehicle section: car image thumbnail, make/model/year, seats, A/C, Dashcam in chips
- Frequent routes: list with route name and trip count
- Reviews section: star rating, reviewer name, comment

### 9.4 Live Trip Screen
- Background: `#F7F3ED`
- Map view (top half): route line in teal on muted map, live dot indicator, destination label
- "LIVE" badge: teal pill, top right
- Bottom sheet (white, radiusXL top corners): driver info card, sharing panel
- Sharing panel (lavender background): "Sharing my journey live 🔒" heading, list of tracked contacts with LIVE indicators, copyable tracking URL, "Add a contact" + "Send link" CTAs
- Action row: "Message driver" button, "Silent SOS" red button
- Auto check-in note at bottom in `bodySmall`

### 9.5 Journey History Screen
- Background: `#F7F3ED`
- Stats header: two teal cards side by side — "€312 saved vs public transport" and "184kg CO₂ saved"
- Filter tabs: All / As rider / As driver / Cancelled
- Trip list: each item shows route, driver name, star rating, amount saved vs bus/train, date
- Savings shown as "Saved €14 vs €32 by bus" in green label

---

## 10. Tone & Feel

- **Warm, not corporate.** Every element should feel approachable and human.
- **Safe, not sterile.** Safety features are prominent but don't make the app feel clinical.
- **Irish, not generic.** Route names, university references, and language should feel locally relevant.
- **Never dark mode** (unless building the dark variant specifically). Default is always light/off-white.

---

## 11. Brand Voice & Naming Rules

- The app name is always **htwa** — all lowercase, never "HTWA" or "Htwa"
- The tagline is always **"heading that way anyway."** — all lowercase, including the first word, ending with a period (not a question mark)
- The logo always renders as **htwa.** with an amber dot on the period — never spaced out, never capitalised
- These rules apply everywhere: in-app copy, marketing, documents, and code comments
