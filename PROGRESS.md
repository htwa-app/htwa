# HTWA — Session Progress Log

Entries are added at the top. Most recent session is always first.

---

## 9 May 2026 (Session 20 continued)

### What Was Built / Changed

- Stage 14 complete: database schema created in Supabase (users, verification, profiles tables + RLS policies), types/database.ts, createClient<Database>, 21 type tests
- Stage 15 complete: Login screen fully spec-compliant per DESIGN-SPEC.md §9.1
  - Tagline typography fixed: bodyMedium → bodyLarge
  - Trust note text fixed: matches spec exactly
  - All 4 auth buttons, social proof, tappable footer confirmed
- PR #7 merged (Stages 13 + 14 + CodeRabbit fixes)
- 471 tests passing, 100% coverage

### Decisions Made

- Login screen trust note uses spec wording exactly

---

## 9 May 2026 (Session 20)

### What Was Built / Changed

- Stage 13 complete: Supabase project created and connected
- lib/supabase.ts — Supabase singleton with AsyncStorage session persistence
- .env.local — URL and anon key configured (gitignored)
- .env.example — empty template committed to repo
- __tests__/unit/supabase.test.ts — 8 tests, all green
- 449/449 tests passing

### Decisions Made

- Using hosted Supabase (supabase.com) not local Docker instance
- EXPO_PUBLIC_* env var prefix required for Expo to expose vars to the client

### Next Steps

- Stage 14: User database schema (users, verification, profiles tables)

---

## 6 May 2026 (Session 19)

### What Was Built / Changed

- CodeRabbit fixes merged via PR #5 (feat/login-screen)
- Squash-merge rebase pattern documented in CLAUDE.md Lessons Learned
- Stage 8 confirmed complete (constants/theme.ts, 259 lines, sosLight token added)
- Stage 9 confirmed complete (components/Text.tsx, 12 variants, 62 tests — existed from Session 17)
- Stage 10 confirmed complete (Button, Card, Input, Badge, Chip, Avatar — 109 tests — existed from Session 17)
- Stage 11 complete: `(tabs)` group created with correct Expo Router architecture — tab bar correctly hidden on Splash and Login screens
- Stage 12 complete: `app/home.tsx` fully rebuilt using design system components, visually verified on iPhone 17 Pro simulator
- Women-only safety card reverted to non-interactive — toggle belongs on Search Results screen (Stage 33)
- iOS build error fixed: stale `ExpoModulesCore` umbrella header resolved by clean pod reinstall

### Decisions Made

- Safety grid on Home screen is informational only — features are interactive in context (women-only on search, SOS on live trip, journey sharing on live trip)
- Soft-reset to `origin/main` is correct pattern when branch carries squash-merge ancestors
- Tab bar lives in `(tabs)` group, not root `_layout.tsx`

### Files Changed

- `app/home.tsx` — full rebuild: Avatar, Button, Card, Chip, Ionicons, SAFETY_FEATURES data array
- `app/(tabs)/_layout.tsx` — Tabs navigator, 4 tabs, theme tokens
- `app/(tabs)/index.tsx`, `search.tsx`, `trips.tsx`, `profile.tsx` — home re-export + 3 stubs
- `app/screens/SplashScreen.tsx` — auth routes to `/(tabs)`
- `app/signin-apple.tsx`, `signin-google.tsx`, `signin-mobile.tsx`, `signin-email.tsx` — auto-navigate to `/(tabs)` on mount
- `__tests__/unit/HomeScreen.test.tsx`, `TabLayout.test.tsx`, `SplashScreen.test.tsx` — updated
- `__tests__/integration/HomeScreenSearch.test.tsx` — Ionicons mock added
- `CLAUDE.md` — squash-merge lesson + PROGRESS.md standing rule
- `BUILD-PLAN.md` — Stages 8–12 marked ✅
- `constants/theme.ts` — sosLight token

### Test Results

- 441 tests, 17 suites, 100% passing

### Next Steps

- Open PR for feat/design-system → main
- Phase 3: Authentication (Stages 13–20)


### What Was Built / Changed

- CodeRabbit fixes from PR #5 (feat/login-screen) committed and merged — console.log removal, chip interactivity, Safety hub link, type assertions, footer tappable links, brand constants extracted to SplashScreen.tsx
- Squash-merge rebase pattern documented in CLAUDE.md Lessons Learned
- Stage 8 confirmed complete (constants/theme.ts — 259 lines, sosLight token added)
- Stage 9 confirmed complete (components/Text.tsx — already existed from Session 17, 62 tests passing)
- Stage 10 confirmed complete (Button, Card, Input, Badge, Chip, Avatar — 109 component tests, all from Session 17)
- Branch feat/design-system created from clean main (354 tests, 100% coverage)
- 417 tests total including worktree; 354 canonical tests, 100% coverage

### Decisions Made

- Soft-reset to origin/main is the correct pattern when a branch carries squash-merge ancestors — replaces straight rebase to avoid duplicate commit conflicts
- `trusted` Badge variant intentionally not built — no §6 spec definition exists yet; only mentioned by name in a §9 screen mockup
- Button and Input use RN `Text` with explicit `Typography` token spreads rather than `components/Text.tsx` — correct pattern; avoids a second `useFonts` call inside components already rendered inside a screen that loads fonts
- Avatar accepts a pre-computed `initials` string, not a `name` prop — correct for a design-system primitive; caller decides what to display

- Stage 11 complete: `(tabs)` route group created with correct Expo Router architecture
  - `app/(tabs)/_layout.tsx` — Tabs navigator, 4 tabs, all tint/border/height tokens from theme.ts; spec-local colours declared as named constants (not added to theme.ts)
  - `app/(tabs)/index.tsx` — re-export from `app/home.tsx`
  - `app/(tabs)/search.tsx`, `trips.tsx`, `profile.tsx` — stub screens using theme tokens, ready for their stages
  - `app/screens/SplashScreen.tsx` — auth success now routes to `/(tabs)` instead of `/home`
  - `__tests__/unit/SplashScreen.test.tsx` — updated assertions to match `/(tabs)`
  - `__tests__/unit/TabLayout.test.tsx` — 29 new tests covering constants, icon names, token values, renderer
- 442 tests total, 100% coverage

### Decisions Made

- Soft-reset to origin/main is the correct pattern when a branch carries squash-merge ancestors — replaces straight rebase to avoid duplicate commit conflicts
- `trusted` Badge variant intentionally not built — no §6 spec definition exists yet; only mentioned by name in a §9 screen mockup
- Button and Input use RN `Text` with explicit `Typography` token spreads rather than `components/Text.tsx` — correct pattern; avoids a second `useFonts` call inside components already rendered inside a screen that loads fonts
- Avatar accepts a pre-computed `initials` string, not a `name` prop — correct for a design-system primitive; caller decides what to display
- **Tabs navigator lives in `(tabs)` group, not root `_layout.tsx`** — tab bar is correctly hidden on Splash and Login screens; auth screens remain in the parent Stack

### Next Steps

- Stage 12: Home screen rebuilt from scratch using DESIGN-SPEC.md

---

## 6 May 2026 (Session 18)

### What Was Built / Changed

**CodeRabbit findings — all actioned**

| Finding | File | What Changed |
|---------|------|--------------|
| Brand name | `app.json` | `"name": "HTWA"` → `"name": "htwa"` |
| Brand constants | `app/screens/SplashScreen.tsx` | Extracted `BRAND_NAME`, `BRAND_DOT`, `BRAND_TAGLINE` constants; replaced all inline string literals; added `testID="logo-dot"` to amber dot |
| `as never` casts | `app/login.tsx` | Removed all 4 `as never` assertions on `router.push` calls; created proper stub screens |
| Stub route screens | `app/signin-apple.tsx`, `app/signin-google.tsx`, `app/signin-mobile.tsx`, `app/signin-email.tsx` | Created 4 placeholder screens so Expo Router recognises the routes |
| Static footer | `app/login.tsx` | Split into tappable "Terms" + "Community Safety Pledge" nodes with `onPress` handlers and underline style; `footerLink` style added |
| Safety hub `TouchableOpacity` (no `onPress`) | `app/home.tsx` | Replaced with `View`; `accessibilityRole="link"` removed — non-interactive until navigation exists |
| Filter chips `TouchableOpacity` (no `onPress`) | `app/home.tsx` | Replaced with `View`; `accessibilityRole="button"` removed |
| Hardcoded hex colours | `app/home.tsx`, `constants/theme.ts` | `#EDFAF1` → `Colors.primaryLight`; `#FFF0EF` → new `Colors.sosLight` token added to theme.ts |
| `paddingTop: 40` magic number | `app/home.tsx` | → `Spacing.xxxxl` (verified = 40px before substituting) |
| Hardcoded greeting/initial | `app/home.tsx` | `"Hey Jordan 👋"` / `"J"` → derived from `user` stub object with fallbacks (`"Hey there 👋"` / `"?"`) |
| `console.log` user input | `app/home.tsx` | Removed logs from `handleSearchPress` and `handleRoutePress`; silent TODO stubs |
| Logo wordmark tests | `__tests__/unit/LoginScreen.test.tsx` | Added `getByText('htwa.')` and `getByTestId('logo-dot')` tests |
| Logo wordmark test | `__tests__/unit/SplashScreen.test.tsx` | Added `getByText('htwa.')` and `getByTestId('logo-dot')` test |
| Safety hub test | `__tests__/unit/HomeScreen.test.tsx` | `getByRole('link')` → `getByText('Safety hub →')` |
| Token count | `__tests__/unit/theme.test.ts` | Updated assertion from 15 → 16 tokens; added `sosLight` assertion |

### Test Results

| Metric | Result |
|--------|--------|
| Total tests | 354 |
| Statements | 100% |
| Branches | 100% |
| Functions | 100% |
| Lines | 100% |
| Test suites | 12 |

### Decisions Made

| Decision | Rationale |
|----------|-----------|
| `Colors.sosLight = '#FFF0EF'` added to theme.ts | Hardcoded hex on safety card replaced with named token; follows the "no magic numbers" rule |
| `Spacing.xxxxl` (not `Spacing.xl`) for Android paddingTop | `Spacing.xxxxl = 40` exactly matches the previous magic number; `Spacing.xl = 20` would have been wrong |
| User stub `{ name: 'Jordan' }` retained | Greeting still shows "Hey Jordan 👋" so the existing HomeScreen test passes unchanged; swap for auth context when auth is wired |
| `handleSearchPress` / `handleRoutePress` are silent stubs | No navigation target exists yet; a silent TODO comment is cleaner than a no-data log |

### Next Steps

1. **Simulator screenshot of Login screen** — run `LANG=en_US.UTF-8 npx expo run:ios`, navigate to Login, share screenshot for Jordan's approval before merging PR #5
2. **Merge PR #5** after screenshot approved
3. **Wire real auth flows** into the 4 stub sign-in screens
4. **Set up Stripe Connect account**
5. **Navigation structure** — tab bar (Home, Search, Trips, Profile) using Expo Router

---

## 2–3 May 2026 (Session 17)

### What Was Built / Changed

**PR cleanup**
- PR #1 (CodeRabbit test) was already closed
- PR #2 (CodeRabbit full audit) — closed with comment
- PR #3 (fix/ci-tests) — CI green → squash-merged to main
- PR #4 (feat/screen-branding-fix) — rebased onto main after #3 squash-merge caused conflict; CI re-run → squash-merged to main
- PR #5 (feat/login-screen) — open, awaiting simulator screenshot approval

**`constants/theme.ts` formalised**
- Added `BorderRadius` (spec-canonical name, §4) — `Radius` kept as backward-compat alias
- Added `Shadows.card` / `Shadows.elevated` (spec-canonical names, §5) — `ShadowCard` / `ShadowElevated` kept as aliases
- Added `FontWeights` with raw numeric values (400/500/600/700) from §2
- Removed `Colors.dark` sub-object (not in DESIGN-SPEC §1, zero references in codebase)
- 100 exhaustive token tests in `__tests__/unit/theme.test.ts` — every hex, rgba, fontSize, lineHeight, spacing, radius, and shadow value verified against spec

**`components/Text.tsx`**
- Self-contained Text component; loads Poppins via `useFonts`
- `variant` prop typed as `keyof typeof Typography` — all 12 DESIGN-SPEC §2 styles
- Graceful fallback: strips `fontFamily` when fonts not yet loaded
- Passes through all standard RN Text props; `style` merges after variant
- 67 unit tests

**6 design-system components (all in `components/`)**

| Component | Spec | Key details |
|-----------|------|-------------|
| `Button.tsx` | §6.1, §6.2 | primary / secondary / disabled; suppresses `onPress` when disabled; `accessibilityState` wired |
| `Card.tsx` | §6.4 | surface wrapper with shadow, 16px border-radius, 16px padding |
| `Input.tsx` | §6.3 | focus state border (Colors.border → Colors.primary); label + error slots; `containerTestID` for style assertions |
| `Badge.tsx` | §6.5, §6.7 | verified (green pill, ✓ + "Verified") and womenOnly (lavender pill) |
| `Chip.tsx` | §6.6 | 28px pill; TouchableOpacity when `onPress` provided, View otherwise |
| `Avatar.tsx` | §6.9 | initials (≤2 chars, uppercase) or imageUri; primary/lavender bg; custom size; circle with white border + card shadow |

All values from `constants/theme.ts`. The 4 values absent from the §1 palette (`#C8C8C8` disabled, `rgba(40,30,20,0.08)` card border, `11px` badge font, `#2A1F4A` women-only text) are declared as named local constants with spec-section comments — not anonymous magic numbers.

### Test Results

| Metric | Result |
|--------|--------|
| Total tests | 350 |
| Statements | 100% |
| Branches | 100% |
| Functions | 100% |
| Lines | 100% |
| Test suites | 12 |

### Decisions Made

| Decision | Rationale |
|----------|-----------|
| Component-specific spec values kept as local constants, not added to Colors | User rule: "only change these files". Values like disabled grey (#C8C8C8) exist in §6 but not the §1 brand palette — they belong in the component, named and documented |
| `containerTestID` separate from `testID` on Input | Lets tests independently target the bordered wrapper (focus state) and the TextInput (value/placeholder) without ambiguity |
| Chip renders View when no onPress, TouchableOpacity when onPress provided | Matches spec semantics: a display-only chip shouldn't have `accessibilityRole="button"` |
| Avatar `testID` used as prefix for image: `${testID}-image` | Allows test assertions on both the container and the image element without adding extra props |

### Problems Encountered

- **Squash-merge conflict on PR #4** — PR #3 was squash-merged to main, making the commits in PR #4 (which was based on #3's branch) conflict. Fixed by `git rebase origin/main` which auto-dropped already-upstream commits, then force-pushed.
- **`jest.doMock` + dynamic `import()` fails** — testing the "fonts not loaded" branch with `jest.doMock` + `await import(...)` requires `--experimental-vm-modules` which jest-expo doesn't enable. Fixed by using a mutable `const mockUseFonts = jest.fn()` pattern — flip return value per suite in `beforeEach`.

### Next Steps

1. **Simulator screenshot** — run `LANG=en_US.UTF-8 npx expo run:ios`, navigate to Login screen, share screenshot for Jordan's approval
2. **Merge PR #5** after screenshot approved
3. **Sign-in screens** — `/signin-apple`, `/signin-google`, `/signin-mobile`, `/signin-email` stub screens or real flows
4. **Set up Stripe Connect account**
5. **Navigation structure** — tab bar (Home, Search, Trips, Profile) using Expo Router

---

## 2 May 2026 (Session 16)

### What Was Built / Changed

- **SplashScreen verified on simulator** — confirmed correct: warm off-white background, teal logo mark with amber dot, "heading that way anyway." tagline, spinner. No wordmark text below logo (logo mark already says htwa.).
- **Tagline changed from ? to .** across all screens — "heading that way anyway?" → "heading that way anyway." (Jordan's decision). Applied to SplashScreen, LoginScreen. Brand rules updated in CLAUDE.md and DESIGN-SPEC.md §11.
- **Wordmark text removed** from SplashScreen and LoginScreen — the logo mark already displays "htwa." so the separate "htwa" text node below was redundant.
- **Root cause of simulator not updating**: native build has an embedded JS bundle; `expo start` dev server changes are not reflected until a full `expo run:ios` rebuild. Fixed by running `npx expo run:ios` with `LANG=en_US.UTF-8` (CocoaPods requires UTF-8 locale).
- **All tests passing**: 63/63, 100% branch coverage.

### Decisions Made

- Tagline ends with a period, not a question mark — baked into CLAUDE.md brand rules
- Logo mark alone is sufficient branding on the splash and login screens — no separate wordmark text node needed
- `expo run:ios` (not `expo start`) is required to update the native build on simulator

### Next Steps

- Merge PR #3 (fix/ci-tests) and PR #4 (feat/screen-branding-fix) once CI is green
- Build Login screen properly per DESIGN-SPEC §9.1 — social proof, auth buttons (Apple, Google, email)
- Close old PRs #1 and #2 (CodeRabbit test PRs)

---

## 2 May 2026 (Session 15)

### What Was Built / Changed

- **SplashScreen built** (`app/screens/SplashScreen.tsx`):
  - Shows htwa logo mark (teal rounded square, amber dot on period), wordmark, tagline, and `ActivityIndicator` spinner
  - On mount: reads `auth_token` from AsyncStorage; routes to `/home` if found, `/login` if not, `/login` on any storage error
  - `app/index.tsx` now re-exports SplashScreen as the root route (`/`)
  - `app/home.tsx` created — HomeScreen moved here from `app/index.tsx`
  - `app/login.tsx` created — stub screen ("Login screen — coming soon")

- **CI failures fixed** (PR #3 `fix/ci-tests`):
  - **Integration test import**: `HomeScreenSearch.test.tsx` was importing `HomeScreen` from `app/index` (now resolves to SplashScreen). Fixed: import updated to `app/home`.
  - **Platform.OS mock**: `jest.spyOn(Platform, 'OS', 'get')` blew up because `Platform.OS` is a value property, not a getter. Fixed: replaced with `Object.defineProperty` pattern with `finally` restore.
  - **AsyncStorage native module crash in Jest**: `AsyncStorage` requires a native module that doesn't exist under Jest. Fixed: added `@react-native-async-storage/async-storage/jest/async-storage-mock` to `moduleNameMapper` in `jest.config.js`.
  - **New: SplashScreen unit tests** (`__tests__/unit/SplashScreen.test.tsx`) — 8 tests covering: smoke render, brand rules (lowercase `htwa` wordmark, lowercase tagline, absence of title-case version), and all three auth routing paths (token found → `/home`, no token → `/login`, storage error → `/login`).

- **All tests passing**: 37/37 tests pass. Coverage: statements 92%, branches 100%, functions 83%, lines 92% — all above 70% threshold.

### Decisions Made

- `jest.spyOn(Platform, 'OS', 'get')` cannot be used in this jest-expo setup — `Platform.OS` is a value property. Standard fix is `Object.defineProperty` with `configurable: true`. Baked into CLAUDE.md Lessons Learned.
- Never call `render()` inside `act()` in `@testing-library/react-native` — the component unmounts when `act` exits, causing "Can't access .root on unmounted test renderer". Call `render()` outside `act`, use `waitFor()` for async assertions.
- AsyncStorage must always be mocked in Jest via `moduleNameMapper` — do not import the native module directly in tests.

### Next Steps

- Merge PR #3 once CI green and CodeRabbit review complete
- Merge or close old PRs #1 and #2 (CodeRabbit test PRs)
- Build Login screen (Screen #2) — `app/login.tsx` is currently a stub
- Folder structure cleanup (screens/, docs/, hooks/, types/, services/)
- Deploy website to Netlify, point htwa-app.com DNS
- Verify MailerLite form with a live test submission

---

## 1 May 2026 (Session 14)

### What Was Built / Changed

- **CodeRabbit PR review set up and actioned**:
  - Added `.coderabbit.yaml` with HTWA-specific standards (TypeScript strictness, React Native performance, API security, GDPR)
  - Opened test PR #1 (`test/coderabbit` branch) to verify CodeRabbit fires correctly
  - Opened full codebase review PR #2 (`main` → `review/base`) to audit all existing code
  - Actioned 19 of 21 findings from the review (2 skipped: one already correct, one rejected as incorrect)

- **Fixes applied from CodeRabbit review** (all committed in `1f91416`):
  - `__tests__/unit/HomeScreen.test.tsx` — replaced fragile `Platform.OS` direct mutation with `jest.spyOn` getter spy + `finally` restore
  - `.github/workflows/ci.yml` — removed `--legacy-peer-deps` from `npm ci`; widened PR trigger from `[main]` to `['**']` so CI runs on all branches
  - `app/index.tsx` — added `accessibilityLabel` to search TextInput; added `accessibilityRole="button"` and `accessibilityLabel` to both CTA TouchableOpacity components and all route row TouchableOpacity components
  - `app/index.tsx` + `constants/theme.ts` — moved duplicate hardcoded dark-mode hex values into a `Colors.dark` sub-object in the design tokens file; `app/index.tsx` now imports from there
  - `BUILD-PLAN.md` — Stage 7 marked ✅ (Jest + CI workflow confirmed in place)
  - `CLAUDE.md` — resolved `[confirm full name with Jordan]` placeholder → "Heading That Way Anyway"
  - `jest.config.js` — removed redundant `integration/**` pattern from `testMatch` (already covered by the broader pattern)
  - `legal/community-safety-pledge.md` — replaced three absolute guarantee statements with scoped, qualified language; added Markdown links to Terms of Service and Privacy Policy in footer
  - `PROGRESS.md` — fixed markdown lint spacing around heading and table
  - `scripts/generate-ireland-path.mjs` — added `AbortController` 10s timeout, `res.ok` check, and null guards after country `find()` calls
  - `.claude/settings.json` — Stop hook now reminds about both `PROGRESS.md` and `CLAUDE.md`
  - `marketing/mailerlite-form-code.md` — fixed MD022/MD031 blank lines around headings and fenced code blocks

- **Findings skipped**:
  - `legal/privacy-policy.md` effective date — already reads "To be confirmed on launch", no change needed
  - `website/index.html` route lines translate — rejected; the `-10px` shift was applied to the projection before exporting coordinates, so all elements share the same coordinate space; adding `translate(10,0)` would break alignment

- **Earlier in session** (map work — see Sessions 12–13 entry):
  - Mobile responsive CSS fix: all three hero columns stack vertically on mobile
  - Map stroke removed for cleaner fill-only appearance
  - Galway→Belfast and Sligo→Athlone route lines added; Athlone→Dublin and Kilkenny→Dublin removed
  - City locations verified geographically accurate

### Decisions Made

- `Colors.dark` added to `constants/theme.ts` as the canonical source for dark-mode colour tokens — `app/index.tsx` and any future dark screens should import from there, not hardcode hex values
- HTWA full name confirmed as "Heading That Way Anyway" (reflected in CLAUDE.md)
- CodeRabbit will run automatically on all future PRs via `.coderabbit.yaml`

### Next Steps

- Merge or close PR #1 (CodeRabbit test) and PR #2 (full review) now that findings are actioned
- Continue with folder structure cleanup (screens/, docs/, hooks/, types/, services/)
- Deploy website to Netlify, point htwa-app.com DNS
- Verify MailerLite form with a live test submission
- Begin building design system components (Button, Card, Input, Badge)

---

## 1 May 2026 (Sessions 12–13)

### What Was Built / Changed

- **Fixed NI northeast coast cut-off (Ards Peninsula)** — The merged topojson approach from Session 11 was still clipping County Down / Ards Peninsula, and any clip-path fix also accidentally clipped Scotland's Mull of Kintyre into view (only ~11px apart at this scale):
  - Switched from `topojson.merge` (which includes all of Great Britain) to centroid-filtering the UK (826) MultiPolygon sub-polygons to extract NI only (centroid: -6.74°W, 54.52°N)
  - Render ROI (372) and NI as two separate `<path>` elements — no GB geometry in the SVG at all, so a simple full-width `<rect>` clipPath works cleanly
  - Shifted projection 10px left so Ards Peninsula (~x=207 pre-shift) lands at x≈197, well within the 200px viewBox
  - NI path bounding box confirmed: x=92.5→195.6, y=12.3→91.7 — full coast including Portaferry and Donaghadee visible
  - Updated `scripts/generate-ireland-path.mjs` accordingly
- **Removed coastline stroke** — island paths changed from `stroke="rgba(31,122,120,0.28)" stroke-width="1.5"` to `stroke="none"` for a cleaner fill-only appearance
- **Added route lines**: Galway→Belfast and Sligo→Athlone
- **Removed route lines**: Athlone→Dublin and Kilkenny→Dublin
- **City locations verified** — all 9 cities placed using real lat/lon coordinates via d3-geo Mercator projection; positions confirmed accurate against coastline outline
- **Committed & pushed**: `54f969e`, `ff94d8a`, `03776ab`

### Confirmed by Jordan ✅

- Full island visible including Ards Peninsula and all northeast coastline, no Great Britain showing
- City dots geographically accurate
- Route lines correct

---

## 30 April 2026 (Session 11)

### What Was Built / Changed

- **Northern Ireland added to island map** — ROI-only outline was missing NI (which is part of the UK feature, id 826, not Ireland id 372):
  - Updated `scripts/generate-ireland-path.mjs` to use `topojson.merge(world, targetGeoms)` — merges Ireland (372) + UK (826) into a single seamless MultiPolygon, dissolving the shared border so there is no visible line between ROI and NI
  - Projection is still `geoMercator().fitExtent([[4,4],[196,256]], ireland)` — fitted to ROI only, which gives the correct scale and position; NI sits just north and falls within the same viewBox naturally
  - Great Britain (part of the UK feature) projects to x > 200 and is hidden via `<clipPath id="island-clip"><rect x="0" y="0" width="200" height="260"/></clipPath>` applied to the path element
  - Added `<clipPath>` to `<defs>` in `website/index.html`
  - Replaced the `<path d="...">` with the new ~18KB merged path + `clip-path="url(#island-clip)"` attribute (via Python regex substitution — path string too large for text edit)
  - City pixel coordinates unchanged from Session 10 (projection is the same)
- **Committed** `bfc81c3` — "Add Northern Ireland to island map via topojson.merge" — pushed to GitHub

### Confirmed by Jordan ✅

- Map verified in browser — full island (ROI + NI) renders as one seamless shape, Great Britain not visible, city dots and route lines correct.

---

## 30 April 2026 (Session 10)

### What Was Built / Changed

- **Ireland map SVG — baked static path, works on `file://`** — the D3 runtime-fetch approach was broken locally because browsers block `fetch()` on `file://` URLs. Fix:
  - Created `scripts/generate-ireland-path.mjs` — Node.js script that fetches world-atlas, projects Ireland (372) with `d3-geo` Mercator, and prints the SVG path string + pixel coordinates for all 8 cities
  - Ran the script; confirmed projection is correct (scale 2208, Dublin at 175.6, 138.5)
  - Replaced the D3 `<script>` block with a static `<path d="...">` element in the SVG
  - Updated all 8 city dot `cx/cy`, all 8 route line `x1/y1/x2/y2`, and all 8 label `x/y` to real projected pixel coordinates
  - Removed D3 v7 and topojson-client CDN `<script>` tags
  - Map now renders with zero network requests and works on `file://`


### City pixel coordinates (for reference)

| City | x | y |
|------|---|---|
| Belfast | 187.9 | 55.6 |
| Derry | 134.7 | 28.9 |
| Dublin | 175.6 | 138.5 |
| Galway | 67.4 | 142.5 |
| Athlone | 110.3 | 132.7 |
| Limerick | 83.8 | 181.1 |
| Kilkenny | 136.9 | 181.9 |
| Cork | 89.9 | 229.6 |

### Questions for Jordan

- **Map shape** — please open `website/index.html` in your browser and confirm: (1) the island outline looks like Ireland, (2) city dots sit on or near the right locations, (3) the animated route lines connect plausibly between cities. The projection is from real geographic data so it should be accurate — but let me know if anything looks off.

---

## 30 April 2026 (Session 9)

### What Was Built / Changed

- **Ireland map SVG → D3.js rendered map** — replaced hand-coded `<path>` with a real geographic map:
  - D3 v7 + topojson-client v3 loaded from jsDelivr CDN
  - Fetches `world-atlas@2/countries-50m.json` at runtime
  - Extracts Ireland (country code 372) and UK (826) features
  - Projects with `d3.geoMercator().fitExtent()` fitted to the island's bounding box (−10.7 to −5.2 lon, 51.2 to 55.5 lat) inside the 200×260 viewBox
  - UK path has `clip-path="url(#island-clip)"` applied — Great Britain projects east of x=200 and is hidden; only Northern Ireland (top-right of the island) is visible
  - All existing city dots, route lines, CSS animation, and labels unchanged
  - Falls back silently if the CDN fetch fails (console.warn only)

### Questions for Jordan

- **City dots vs real map** — the city dot coordinates (Belfast, Derry, Dublin etc.) were hand-placed for the old polygon. They may not sit exactly on the D3-rendered outline. Please open the page and check: do the dots sit roughly over the correct parts of the island shape? If any are clearly off, tell me which city and I'll recalculate its SVG coordinates from the projection.

---

## 30 April 2026 (Session 8)

### What Was Built / Changed

- **Ireland map SVG replaced** — swapped out the smooth-curve Bézier outline for a geographically corrected straight-segment polygon path provided by Jordan. New city coordinates: Belfast (172,57), Derry (123,33), Dublin (160,135), Galway (61,139), Athlone (100,129), Limerick (76,175), Kilkenny (125,177), Cork (81,222). All 8 animated route lines and city labels updated to match.

### Questions for Jordan

- **Map shape** — the new SVG path is in place but I can't verify how it looks in the browser from here. Please open `website/index.html` and confirm the island outline looks geographically correct, that city dots sit on or near the right locations, and the animated route lines connect plausibly. If any dot looks wrong, tell me the city name and I'll adjust its coordinates.

---

## 30 April 2026 (Session 7)

### What Was Built / Changed

- **`website/index.html` completely rebuilt** — polished, on-brand landing page:
  - **Logo mark** — teal rounded-square app icon, white Poppins 700, amber dot on the full stop; used in nav, hero, and footer
  - **Three-column desktop hero** (full viewport height, vertically centred):
    - Left: hand-coded SVG map of the island of Ireland — faint teal fill, 8 animated dashed route lines (Belfast→Dublin, Dublin→Cork, Galway→Dublin, Derry→Galway, Cork→Limerick, Limerick→Athlone, Athlone→Dublin, Kilkenny→Dublin) with amber arrowheads and staggered CSS flow animation; lavender city dots; city name labels
    - Centre: logo mark (large), "Heading That Way Anyway?" tagline, subtext, MailerLite embedded form (`p3xCkw`) with full CSS overrides (teal pill submit button, rounded inputs, transparent background), three trust badges (ID Verified green, Women-only lavender, Always cheaper amber)
    - Right: phone frame mockup in pure HTML/CSS — profile screen with avatar, verified badge, 4.95 star rating, stats, "this semester" teal savings card, two journey cards, one review
  - **Mobile-first layout** — below 900px: map and phone hidden entirely; single-column form (heading + subtext + form + badges), full width
  - **Three feature cards** below hero: Share my journey (teal), Women-only journeys (lavender), ID verified (green)
  - **Minimal footer**: Instagram @htwa.app · hello@htwa-app.com · htwa-app.com · "Launching September 2026" pill
  - "htwa" lowercase everywhere, no exceptions

### Decisions Made

| Decision | Rationale |
|----------|-----------|
| Map and phone hidden on mobile | Too small to be useful; mobile is form-only, no distractions |
| SVG map drawn in code, not an image | No external assets; scales perfectly; animation is pure CSS |
| MailerLite CSS overrides with `!important` | MailerLite injects its own stylesheet; only `!important` reliably overrides it |
| Logo mark dot (.) in amber | Contrast against both white text and teal background; distinctive brand detail |

### Suggested Next Steps

1. **Deploy the website** — drag the `website/` folder to Netlify or Vercel; point htwa-app.com DNS to it (15 min)
2. **Verify MailerLite form works** — submit a test entry, confirm it appears in the MailerLite dashboard subscriber list
3. **Rebuild app home screen** — now that `constants/theme.ts` exists, rebuild `app/index.tsx` with the correct light theme from DESIGN-SPEC.md; install Poppins first (`npx expo install @expo-google-fonts/poppins expo-font`)
4. **Build design system components** — `Button.tsx`, `Card.tsx`, `Input.tsx` using theme tokens (BUILD-PLAN Stage 10)

---

## 29 April 2026 (Session 6)

### What Was Built / Changed

- **`constants/theme.ts`** — complete design token file; every colour, typography style, spacing value, border radius, and shadow from DESIGN-SPEC.md exported as named TypeScript constants with JSDoc; single source of truth for all future screens and components
- **`website/index.html`** — full landing page for htwa-app.com:
  - Sticky nav with HTWA logo and "Join the waitlist" CTA
  - Hero: "Heading That Way Anyway?" headline, tagline, social proof avatar stack
  - Waitlist form: name, email, university dropdown (ROI + NI universities), ROI/NI region toggle — submits to Supabase REST API
  - "How it works" section — 3 steps (verify, find/offer, travel safely)
  - Safety features grid — Share my journey (teal), Women-only mode (lavender), Verified IDs (green), Silent SOS (red)
  - Footer with privacy/terms/contact links and legal cost-share note
  - Mobile-first, responsive, Poppins font, exact DESIGN-SPEC.md brand colours
- **`website/supabase-waitlist.sql`** — SQL to create the `waitlist` table in Supabase with RLS policies; ready to run once Supabase project is set up

### Decisions Made

| Decision | Rationale |
|----------|-----------|
| `constants/theme.ts` as design token source | Enforces code standard: no hardcoded colours/sizes anywhere in the codebase |
| Website form submits directly to Supabase REST API | No separate backend needed; Supabase anon key + RLS is the correct pattern |
| University dropdown covers ROI + NI institutions | Matches Phase 1 target market; easy to expand |
| Supabase credentials injected at deploy time | Keeps secrets out of the HTML source file in the repo |

### Pending Before Supabase Is Live

1. Create a Supabase project at supabase.com
2. Run `website/supabase-waitlist.sql` in the SQL editor
3. Copy the project URL and anon key into `website/index.html` (`SUPABASE_URL` and `SUPABASE_ANON` variables at the top of the `<script>` block)

### Suggested Next Steps

1. **Set up Supabase** — create project, run SQL, add credentials to website (15 min)
2. **Deploy website** — host `website/index.html` at htwa-app.com (Netlify or Vercel, drag-and-drop deploy)
3. **Rebuild home screen** — now that `constants/theme.ts` exists, rebuild `app/index.tsx` using the light theme from DESIGN-SPEC.md; install Poppins font first (`npx expo install @expo-google-fonts/poppins expo-font`)
4. **Build design system components** — `Button.tsx`, `Card.tsx`, `Input.tsx` using theme tokens

---

## 29 April 2026 (Session 5)

### What Was Built / Changed

- **Jest test suite installed** — jest 29, jest-expo 55, @testing-library/react-native 13, @testing-library/jest-native 5, react-test-renderer 19.1.0; pinned to avoid React 19.1/19.2 peer dep conflict
- **jest.config.js** — jest-expo preset, separate unit/integration test paths, 70% coverage threshold
- **28 tests written, all passing:**
  - `__tests__/unit/HomeScreen.test.tsx` — smoke, branding, search input (including state updates), CTAs, popular routes rendering, POPULAR_ROUTES data integrity, platform variant (Android)
  - `__tests__/integration/HomeScreenSearch.test.tsx` — full user search journey including Irish characters and clear sequence
- **100% coverage** — statements, branches, functions, lines all at 100%
- **GitHub Actions CI** (`.github/workflows/ci.yml`) — triggers on every push to `main` and every pull request; runs unit tests, integration tests, and coverage check separately; blocks merge on failure; confirmed green ✅
- **`app/index.tsx` improvements** — switched `SafeAreaView` to `react-native-safe-area-context` (core one deprecated); moved `Platform.OS` check into component render so it's mockable in tests; exported `POPULAR_ROUTES` for data unit tests

### Decisions Made

| Decision | Rationale |
|----------|-----------|
| Jest 29 (not 30) | jest-expo 55 bundles Jest 29 internally; Jest 30 caused module resolution errors |
| `--legacy-peer-deps` for test installs | react-test-renderer 19.2.5 vs react 19.1.0 version mismatch; `--legacy-peer-deps` resolves safely |
| 70% branch coverage threshold | Enforces meaningful test coverage without being unreachable on early-stage UI |
| Platform check moved to render function | StyleSheet.create runs once at module load; Platform mocks only work on per-render code |

### Testing Standard (applies to all future code on this project)

- Every function written must have a corresponding unit test
- Functions that interact with other functions or external services (API, auth, payments) must also have integration tests
- Tests live in `__tests__/unit/` or `__tests__/integration/`
- Coverage threshold: 70% minimum (branches, functions, lines, statements)
- CI blocks merge if any test fails

### Problems Encountered

- **Jest 30 / jest-expo 55 incompatibility** — Expo's `winter` runtime uses `import.meta` which Jest 30 doesn't handle; fixed by pinning jest to 29.x
- **Branch coverage stuck at 50%** — `Platform.OS` ternary was inside `StyleSheet.create()` (evaluated once at import time), so mocking Platform at test time had no effect; fixed by moving the check into the component function body

### Suggested Next Steps

1. **Build "Find a ride" results screen** — list of journeys with driver info, price, seats, departure time; write unit + integration tests alongside
2. **Build "Offer a ride" form screen** — from, to, date, seats, price fields; validate inputs (unit test each validator)
3. **Add a tab bar** — Home / My Rides / Profile navigation
4. **Set up Stripe Connect account**

---

## 29 April 2026 (Session 4)

### What Was Built / Changed

- **Expo Router installed** — added `expo-router`, `react-native-screens`, `react-native-safe-area-context`, `expo-linking`, `expo-splash-screen`; entry point changed from `App.tsx` to `expo-router/entry`; deep-link scheme `htwa` added to `app.json`
- **Home screen built** (`app/index.tsx`) — dark-themed, branded UI including:
  - HTWA logo + tagline: *"Share the journey. Split the cost."*
  - Destination search bar
  - "Find a ride" (green CTA) and "Offer a ride" (secondary CTA) buttons
  - Popular routes list: Dublin→Galway, Belfast→Dublin, Cork→Limerick with indicative prices
  - Legal footer: *"Drivers share costs only — never profit from a journey."*
- **Root layout added** (`app/_layout.tsx`) — Stack navigator, no header, light status bar
- **Confirmed running** in iPhone 17 Pro Simulator via native build

### Decisions Made

| Decision | Rationale |
|----------|-----------|
| Dark navy + green (`#00C48C`) colour scheme | Professional, distinctive, works well on mobile |
| Expo Router (file-based) over React Navigation | Modern default for Expo SDK 54+; simpler routing as screens are added |
| Popular routes hardcoded for now | Placeholder data — will be replaced by live API data once backend exists |
| Legal note on home screen | Reinforces the cost-share model from first impression |

### Problems Encountered

- **Metro dev server connection issue** — after the native build completed, the background Metro process lost its connection to the simulator. The app showed "Could not connect to development server". Fixed by killing the stale Metro process and re-running `expo run:ios` from scratch, which starts Metro and launches the app as a single connected flow.

### Domain Note

Confirmed: domain is **htwa-app.com**. Bundle ID `com.htwa.app` and deep-link scheme `htwa` are already set consistently.

### Suggested Next Steps

1. **Confirm domain** — verify it's `htwa-app.com` (not `hwat-app.com`)
2. **Build the "Find a ride" results screen** — list of available journeys with driver, price, seats, departure time
3. **Build the "Offer a ride" screen** — form: from, to, date, seats, price per seat
4. **Add a tab bar** — Home / My Rides / Profile tabs
5. **Set up Stripe Connect account** — needed before payment flow

---

## 29 April 2026 (Session 3)

### What Was Built / Changed

- **Homebrew added to PATH** — `/opt/homebrew/bin/brew shellenv` added to `~/.zshrc`; `LANG=en_US.UTF-8` also added to silence CocoaPods UTF-8 warning
- **CocoaPods 1.16.2 installed** — via `brew install cocoapods`; pulled in Ruby 4.0.3 as a dependency (resolves the Ruby 2.6 blocker from Session 2)
- **Full native iOS build completed** — `expo run:ios` compiled and signed `com.htwa.app`, installed it on the iPhone 17 Pro Simulator, and launched successfully
- **App Store build pipeline verified** — the complete path from source → Xcode → Simulator is confirmed working

### Decisions Made

| Decision | Rationale |
|----------|-----------|
| Homebrew at `/opt/homebrew` (Apple Silicon path) | Standard location for M-series Macs; added to PATH in `.zshrc` |
| CocoaPods via Homebrew (not gem) | Homebrew brings its own Ruby 4.0.3, bypassing the system Ruby 2.6 limitation |

### Problems Encountered

- **Homebrew not in PATH** — installed but shell couldn't find `brew`. Fixed by adding `eval "$(/opt/homebrew/bin/brew shellenv)"` to `~/.zshrc`.

### Suggested Next Steps

1. **Purchase domains** — `htwa.ie`, `htwa.app`, `htwa.co.uk`
2. **Set up Stripe Connect account**
3. **Begin UI design in Claude Design** — home screen, ride search, booking flow
4. **Scaffold navigation** — add Expo Router so screens can link together
5. **Replace the placeholder `App.tsx`** — build the first real screen (likely a ride search / home screen)

---

## 29 April 2026 (Session 2)

### What Was Built / Changed

- **iOS Simulator runtime downloaded** — iOS 26.4.1 (8.46 GB) installed via `xcodebuild -downloadPlatform iOS`; iPhone 17 Pro simulator is now available
- **App confirmed booting** — Expo scaffold runs successfully in the iPhone 17 Pro Simulator, showing the default "Open up App.tsx to start working on your app!" screen
- **Session progress hook added** — `.claude/settings.json` created with a `Stop` hook that reminds Claude to write a `PROGRESS.md` entry at the end of every session
- **PROGRESS.md created** — this file, committed and pushed to GitHub

### Decisions Made

| Decision | Rationale |
|----------|-----------|
| Used `expo start` (Expo Go) rather than `expo run:ios` (native build) for the boot check | CocoaPods is required for native builds but couldn't be installed — system Ruby 2.6 is too old for its dependencies |
| Deferred Homebrew install | Not urgently needed; will be required before App Store submission |

### Problems Encountered

- **CocoaPods installation failed** — system Ruby is 2.6; CocoaPods requires Ruby ≥ 3.0. `sudo gem install` requires interactive terminal; `brew install` couldn't run because Homebrew isn't installed.
- **Workaround:** Used `expo start --ios` which runs via Expo Go and does not require a native build or CocoaPods. App booted successfully via this route.
- **Fix needed before App Store build:** Install Homebrew → `brew install cocoapods` (one command, installs both Ruby 3 and CocoaPods)

### Suggested Next Steps

1. **Install Homebrew** — run `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"` in Terminal, then `brew install cocoapods`. Required before any App Store submission build.
2. **Purchase domains** — `htwa.ie`, `htwa.app`, `htwa.co.uk`
3. **Set up Stripe Connect account**
4. **Begin UI design in Claude Design** — home screen, ride search, booking flow
5. **Scaffold navigation** — add Expo Router so screens can link together

---

## 29 April 2026

### What Was Built / Changed

- **Git identity configured** — global git user set to Jordan Madden / hello@htwa-app.com
- **GitHub CLI verified** — `gh` (v2.92.0) already authenticated as `htwa-app` account with correct scopes
- **VS Code Claude Code extension installed** — `anthropic.claude-code` v2.1.123
- **Xcode command line tools confirmed** — already installed at `/Applications/Xcode.app/Contents/Developer`
- **Android SDK confirmed** — located at `~/Library/Android/sdk` with all required components (build-tools, emulator, platform-tools, platforms)
- **Shell PATH updated** — `~/.zshrc` now exports `code`, `gh`, and Android tools (`adb`, `emulator`) so they work from any terminal window
- **Expo React Native app scaffolded** — blank-typescript template, Expo SDK 53, supports iOS + Android
- **app.json configured** — app name `HTWA`, slug `htwa`, bundle identifier `com.htwa.app` (iOS and Android), contact email `hello@htwa-app.com`
- **First real code commit pushed** — [github.com/htwa-app/htwa](https://github.com/htwa-app/htwa) now contains the full Expo scaffold

### Decisions Made

| Decision | Rationale |
|----------|-----------|
| App code scaffolded directly into `~/Documents/HTWA` root | Keeps one repo for everything — docs, CLAUDE.md, and code together |
| `blank-typescript` Expo template | TypeScript from the start avoids a messy migration later |
| Bundle ID `com.htwa.app` | Clean, matches the planned domain `htwa.app` |
| `node_modules` not committed | Standard practice; `npm install` recreates it from `package-lock.json` |
| Design PDF and `.claude/` folder not committed | Binary/workspace files with no value in version history |

### Problems Encountered

- `create-expo-app` refused to scaffold into a non-empty directory — worked around by scaffolding into a temp folder (`htwa-scaffold`) and copying files across with `rsync`, then deleting the temp folder.

### Suggested Next Steps

1. **Purchase domains** — `htwa.ie`, `htwa.app`, `htwa.co.uk` (not yet bought)
2. **Run the app locally** — `cd ~/Documents/HTWA && npm run ios` to confirm the scaffold boots in the iOS Simulator
3. **Set up Stripe Connect account** — needed before any payment flow can be built
4. **Begin UI design in Claude Design** — home screen, ride search, and booking flow are the priority screens
5. **Scaffold navigation** — add Expo Router or React Navigation so screens can be linked together

---
