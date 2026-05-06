# HTWA — Project Intelligence File

> This file is the single source of truth for the HTWA project.
> It is read automatically by Claude Code every time it opens in this folder.
> It is also read by Claude in Cowork mode at the start of each session.
> Keep it updated as the project evolves.

---

## ⚠️ STANDING RULES — READ BEFORE DOING ANYTHING

These rules apply to all Claude tools (Cowork, Claude Code, Claude in Chrome) at all times:

1. **Payment methods** — Never use any of Jordan's credit cards or payment methods without asking explicitly each time, for every transaction, no exceptions.
2. **Personal email** — Never access or read Jordan's personal email accounts.
3. **Personal social media** — Never access personal social media accounts. The business Instagram (@htwa.app) is fine.
4. **Passwords & personal info** — Never share Jordan's passwords or personal information with any third party or service.

If in doubt about whether an action falls under these rules, stop and ask first.

---

## ⚠️ BRAND NAMING RULES — NEVER GET THESE WRONG

- The app name is always **htwa** — all lowercase, never "HTWA", "Htwa", or "H T W A"
- The tagline is always **"heading that way anyway."** — all lowercase, including the first word, always with a period (not a question mark)
- The logo always renders as **htwa.** with an amber dot on the period
- These rules apply everywhere without exception — in-app copy, code comments, documents, and marketing

---

## ⚠️ HOW TO WORK WITH CLAUDE EFFECTIVELY — KNOWN WEAKNESSES & MITIGATIONS

Claude has specific weaknesses as a software engineer. These mitigations are baked in as standing instructions.

### 1. Claude cannot run code — it only reads it
**Risk:** Changes may look correct but fail at runtime.
**Standing rule:** After any code change, Jordan runs it and pastes errors back. Never assume it works because Claude said it should.

### 2. Context degrades over long sessions
**Risk:** Claude forgets decisions made earlier in a conversation or in previous sessions, leading to contradictions or repeated mistakes.
**Standing rule:** CLAUDE.md and PROGRESS.md are the memory. If something important was decided in a previous session, paste the relevant section at the start of the new one. If something seems off, tell Claude: "check PROGRESS.md first."

### 3. Claude is overconfident about things it cannot verify
**Risk:** Claude says something "looks right" when it would need to run the code to actually know. This happened with map coordinates — Claude declared them correct before visual verification.
**Standing rule:** For anything visual or behavioural, force verification: "show me a screenshot" or "verify it in the browser." Don't accept abstract reasoning as proof.

### 4. Claude hallucinates APIs and library defaults
**Risk:** Claude confidently uses a method, prop, or config option that doesn't exist or behaves differently in the version installed.
**Standing rule:** For any new library usage, ask Claude to state which version is installed and whether the API exists in that version. Check the docs for anything unfamiliar.

### 5. Claude changes more than it was asked to
**Risk:** Claude fixes adjacent things it wasn't asked to touch, making diffs hard to review. This happened when the form-col border was removed without being asked.
**Standing rule:** Be explicit about scope: "only change X, nothing else." After any change ask: "what else did you touch?" Claude must answer honestly.

### 6. Claude buries uncertainty behind confident language
**Risk:** When unsure, Claude tends to give a confident-sounding answer rather than flagging the uncertainty.
**Standing rule:** After any significant task, ask: **"What could go wrong with what you just did, and what should I verify?"** This is the single most effective prompt for drawing out honest uncertainty.

### 7. Claude lacks accumulated project taste
**Risk:** Claude doesn't remember past mistakes or "we tried that, it broke X" lessons across sessions.
**Standing rule:** Document recurring patterns and past mistakes in this file under the Lessons Learned section below. Claude reads this every session.

---

## 1. What Is HTWA?

HTWA is a **cost-sharing rideshare app for Ireland** (and Northern Ireland).

It is not a taxi service. The legal model is a **carpool platform** — drivers share the cost of a journey with passengers, and can never profit from a ride. This distinction is what keeps the platform legal without requiring taxi/SPSV licensing.

The name HTWA stands for **Heading That Way Anyway**. Domain purchased:
- `htwa-app.com` ✅

Original domains (htwa.ie, htwa.app, htwa.co.uk) — decided not needed for now.

---

## 2. The Founder

**Jordan Madden** — jmadden404@gmail.com  
Non-technical founder. Comfortable with high-level direction but not with writing code directly. All technical work is handled by Claude Code. Jordan reviews outputs and gives approval.

**Claude subscription:** Pro plan (confirmed April 2026). Both Claude Code and Claude Design are available on Pro — no upgrade needed.

---

## 3. The Business

### Target Market (Phase 1)
- Irish university students (intercampus and commuter routes)
- Cross-border corridor (Republic of Ireland ↔ Northern Ireland)

### Legal Model
- Drivers set journey costs based on Irish/UK civil service mileage rates (Revenue.ie / HMRC AMAP rates)
- Platform enforces a hard cap: drivers cannot earn more than cost
- This is the legal wedge that separates HTWA from an unlicensed taxi service
- Key regulatory references: Citizens Information (SPSV), Transport for Ireland carpooling guidelines, NI taxi licensing (nidirect)

### Revenue Model
- Platform takes a small fee per transaction (Stripe Connect application fees)
- Target: €1.5–2M revenue by month 36 (base case)
- Required working capital: €60–90k through month 12

### Competitive Landscape
- Primary reference: BlaBlaCar (pricing model, tech stack on StackShare)
- HTWA differentiator: Ireland-first, university focus, cross-border corridor

---

## 4. Master Plan

A full master plan document (22 sections, ~70,000 characters) was created as **HTWA-Master-Plan.docx**. It lives in the previous Cowork session's outputs folder. Jordan has a copy.

Key sections:
- **Section 1** — Claude's honest take on the idea (positive, with caveats)
- **Section 3** — Legal Foundation (most important section; read this first)
- **Section 5** — Tools & Tech Stack
- **Section 11** — Branding & Design
- **Section 19** — Revenue Projections (month 1–36)
- **Section 22.2** — Headline Q&A answers

---

## 5. Tech Stack

### Confirmed Tools
| Tool | Purpose | Status |
|------|---------|--------|
| Claude Code | AI coding assistant | ✅ Built into Claude Desktop (Code tab) |
| Claude Code extension | VS Code integration | ✅ Installed (anthropic.claude-code v2.1.123) |
| Claude Design | UI/UX mockups and prototypes | ✅ Accessible at claude.ai/design |
| VS Code | Code editor (visual interface) | ✅ Installed |
| Node.js | Runtime environment | ✅ Installed |
| npm | Package manager (bundled with Node) | ✅ Installed |
| Git | Version control | ✅ Installed & configured (hello@htwa-app.com) |
| GitHub CLI (gh) | GitHub from terminal | ✅ Authenticated as htwa-app |
| GitHub | Remote repo / backup | ✅ Live at github.com/htwa-app/htwa |
| Xcode | iOS build tool | ✅ Command line tools verified |
| Android Studio | Android build tool | ✅ SDK at ~/Library/Android/sdk |
| Stripe Connect | Payments + application fees | Planned |
| Google Maps Routes API | Route calculation + toll fees | Planned |
| GitHub Desktop | Visual Git interface | Planned |
| 1Password | Credentials management | Planned |

### Explicitly Rejected Tools
- ~~Cursor~~ — replaced by Claude Code
- ~~Figma~~ — replaced by Claude Design

### Mobile
- Target: iOS + Android
- Both app stores required (Apple App Store + Google Play)
- Apple App Store Review Guidelines apply

---

## 6. Project Folder Structure

This folder (`~/Documents/HTWA/`) is the **shared workspace** between Cowork and Claude Code.

- Both Claude Code and Cowork read/write to this folder
- `CLAUDE.md` (this file) is the living brain — update it as decisions are made
- All code, assets, and documents for the project live here

---

## 7. Current Status (as of 2 May 2026)

### Completed
- [x] Project concept defined and master plan written
- [x] Legal model validated (cost-share carpool, not taxi)
- [x] Tools stack decided (Claude Code + Claude Design replacing Cursor + Figma)
- [x] Node.js, Git, VS Code, GitHub CLI — all installed and configured
- [x] GitHub repo live at github.com/htwa-app/htwa
- [x] Expo React Native app scaffolded (TypeScript, SDK 53, iOS + Android)
- [x] CI workflow (GitHub Actions) — unit + integration + coverage gate
- [x] CodeRabbit automated PR reviews wired up
- [x] `constants/theme.ts` — all DESIGN-SPEC §1–5 tokens (Colors, Typography, FontFamily, FontWeights, Spacing, BorderRadius, Shadows) with 100 tests
- [x] `components/Text.tsx` — all 12 DESIGN-SPEC §2 variants, useFonts, fallback
- [x] `components/Button.tsx` — primary / secondary / disabled (§6.1, §6.2)
- [x] `components/Card.tsx` — §6.4
- [x] `components/Input.tsx` — focus state border, label, error (§6.3)
- [x] `components/Badge.tsx` — verified + womenOnly variants (§6.5, §6.7)
- [x] `components/Chip.tsx` — interactive + display-only (§6.6)
- [x] `components/Avatar.tsx` — initials / image, primary / lavender, custom size (§6.9)
- [x] `app/screens/SplashScreen.tsx` — confirmed correct on simulator
- [x] `app/home.tsx` — HomeScreen with correct light-theme branding
- [x] `app/login.tsx` — Login screen with 4 auth buttons (stub routes)
- [x] 350 tests, 100% branch/statement/function/line coverage on all components
- [x] PRs #3 and #4 merged to main; PRs #1 and #2 closed

### In Progress
- [ ] PR #5 (`feat/login-screen`) — open, awaiting simulator screenshot approval before merge

### Next Up
- [ ] Simulator screenshot of Login screen (run `LANG=en_US.UTF-8 npx expo run:ios`)
- [ ] Merge PR #5 after Jordan approves screenshot
- [ ] Set up Stripe Connect account
- [ ] Build remaining screens (Sign-in flows, Home with real navigation, Search results, Driver Profile, Live Trip)

---

## 8. How Jordan & Claude Work Together

- **Cowork** (this app): Planning, decisions, documents, high-level direction
- **Claude Code** (Terminal or VS Code tab): All coding, file creation, Git operations
- **Claude Design** (claude.ai/design): UI mockups, prototypes, visual assets
- **Plan mode in Claude Code**: Press Shift+Tab twice — Claude writes a plan before touching any file
- **Plan mode in Cowork**: Type "plan first, don't execute yet" — same effect

---

## 9. Key Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| Apr 2026 | Use Claude Code instead of Cursor | Native integration, saves ~€20/month |
| Apr 2026 | Use Claude Design instead of Figma | Bundled with Pro plan, AI-native workflow |
| Apr 2026 | Legal model = cost-share carpool | Avoids SPSV/taxi licensing requirements |
| Apr 2026 | University + cross-border as Phase 1 wedge | Sharp, defensible initial market |
| Apr 2026 | Shared HTWA folder as single source of truth | Enables Cowork ↔ Claude Code continuity |
| Apr 2026 | Cross-border cost calculation uses driver's home jurisdiction rate | Driver based in ROI uses Revenue.ie rates for full journey; NI-based driver uses HMRC AMAP rates. Simpler, legally clean, easier to build. |
| Apr 2026 | Currency display set at account creation based on user's home location | ROI users see €, NI users see £. Can be changed in settings. |
| Apr 2026 | Savings displayed as money saved vs bus/train equivalent | More compelling than showing money shared |
| Apr 2026 | Mandatory ID + selfie verification before app use | All users must complete before accessing platform. Shows as green "Verified" tick on profile. |
| Apr 2026 | Nominated contact receives live journey tracking | Selected by user in app settings. Receives real-time tracking link for every trip, similar to Uber's share journey feature. |
| May 2026 | Women-only mode works both ways | A female driver can toggle women-only mode when offering a ride — only female passengers can request to join. A female passenger can filter search results to show only women-only rides. Both directions must be enforced at the database level, not just the UI. |

---

## 11. Lessons Learned (add to this as the project grows)

| Date | Lesson | Detail |
|------|--------|--------|
| May 2026 | Don't trust coordinate reasoning without visual verification | Claude declared map city coordinates correct purely by reading code. They were only confirmed correct after forcing a browser screenshot. |
| May 2026 | Scope creep — Claude removed the form-col border unprompted | When asked to "remove the border on the map", Claude incorrectly removed the form column borders instead. Always confirm scope before accepting a change. |
| May 2026 | d3-geo Polygon bbox clustering bug | Passing a GeoJSON Polygon rectangle to `fitExtent` causes spherical winding ambiguity — all coordinates cluster in ~3px. Use MultiPoint or an actual geographic feature instead. |
| May 2026 | `topojson.merge` on UK includes all of Great Britain | Merging Ireland (372) + UK (826) brings in Scotland and England. Fix: filter UK MultiPolygon sub-polygons by centroid to extract NI only. |
| May 2026 | `jest.spyOn(Platform, 'OS', 'get')` fails in jest-expo | `Platform.OS` is a plain value property, not a getter — spying on it with `'get'` access type throws at test time. Fix: `Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true, writable: true })` inside a `try/finally` that restores the original value. |
| May 2026 | Never call `render()` inside `act()` in RTL | `@testing-library/react-native`'s `act()` unmounts the component when it exits, causing "Can't access .root on unmounted test renderer". Pattern: call `render()` outside `act`, use `waitFor()` for async assertions. |
| May 2026 | AsyncStorage must be mocked globally in Jest | `@react-native-async-storage/async-storage` uses a native module that doesn't exist in Jest. Always add `'@react-native-async-storage/async-storage': require.resolve('@react-native-async-storage/async-storage/jest/async-storage-mock')` to `moduleNameMapper` in `jest.config.js`. |
| May 2026 | `jest.doMock` + dynamic `import()` needs `--experimental-vm-modules` | Testing a conditional mock state (e.g. `useFonts` returning `[false, null]`) with `jest.doMock` + `await import(...)` fails with "dynamic import callback invoked without --experimental-vm-modules". Fix: declare a mutable `const mockFn = jest.fn()` (name must start with `mock`), use it in the `jest.mock` factory, and call `mockFn.mockReturnValue(...)` inside `beforeEach` to flip state between suites. |
| May 2026 | Squash merge base PR before dependent PR — rebase required | When PR #4 was based on PR #3's branch, squash-merging #3 into main caused #4 to conflict (commits already upstream). Fix: `git fetch && git rebase origin/main` on the dependent branch — Git drops already-upstreamed commits, force-push, re-trigger CI, then merge. |
| May 2026 | Spec values not in §1 palette → named local constants, not added to Colors | Some component specs (§6.1 disabled grey #C8C8C8, §6.4 card border 0.08 opacity, §6.5 badge 11px, §6.7 women-only text #2A1F4A) reference values absent from the brand palette. These must NOT be hardcoded anonymously or silently added to theme.ts. Declare them as named constants at the top of the component file with a comment citing the spec section. |
| May 2026 | Separate `containerTestID` from `testID` on Input | The Input component has an outer View (layout) and an inner bordered View (the one whose borderColor changes on focus). If you put `testID` on the outer wrapper and pass the same prop through to TextInput, style assertions on the border view become impossible. Fix: give the bordered wrapper a dedicated `containerTestID` prop, let the standard `testID` flow to the `TextInput` via the rest-spread. Tests can then independently access both elements. |

---

## 10. Important Links & References

- Master Plan Doc: stored in previous Cowork session (Jordan has a copy)
- Claude Design: https://claude.ai/design
- Stripe Connect docs: https://docs.stripe.com/connect
- Google Maps Routes API: https://developers.google.com/maps/documentation/routes
- Citizens Information (SPSV): https://www.citizensinformation.ie/en/travel-and-recreation/public-transport/regulation-of-taxis-and-small-public-service-vehicles/
- Revenue.ie mileage rates: https://www.revenue.ie/en/employing-people/employee-expenses/travel-and-subsistence/civil-service-rates.aspx
- HMRC AMAP rates: https://www.gov.uk/government/publications/rates-and-allowances-travel-mileage-and-fuel-allowances
- BlaBlaCar tech stack: https://stackshare.io/blablacar/blablacar
