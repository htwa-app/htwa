# HTWA — Build Plan
> Stage-by-stage implementation plan. Work through these in order.
> ✅ = Complete | 🔄 = In Progress | ⬜ = Not Started

---

## Context & Strategy

- **Target launch:** September 2026 (start of new university semester)
- **Summer goal:** Build, test, refine the app AND grow the waiting list to critical mass before launch
- **Budget:** Minimal — flyers, branded coasters with QR codes, some social media advertising
- **QA:** Jordan's friend (senior QA) will be reviewing as we go
- **Priority order:** Website + waiting list → Legal → App screens
- **Parallel tracks:** Website/legal/marketing can run alongside app development
- **Code standards:** Must be clean, modular, and easily handed over to a human React Native developer if HTWA scales and brings in funding

---

## PHASE 1 — FOUNDATION
*Everything the project sits on. Must be solid before anything else.*

✅ **Stage 1** — Dev environment set up (Node, Git, GitHub CLI, Xcode, Android Studio, VS Code, Claude Code)
✅ **Stage 2** — GitHub repo created and connected (github.com/htwa-app/htwa)
✅ **Stage 3** — Expo React Native scaffold (TypeScript, iOS + Android, bundle ID com.htwa.app)
✅ **Stage 4** — App boots on iPhone 17 Pro Simulator
✅ **Stage 5** — Expo Router installed (file-based navigation)
✅ **Stage 6** — DESIGN-SPEC.md written (colours, typography, spacing, components)
✅ **Stage 7** — Quality control: Jest installed, smoke test written, GitHub Actions CI workflow set up (.github/workflows/ci.yml) — blocks merges if tests fail

---

## PHASE 2 — DESIGN SYSTEM
*Build the shared foundations every screen uses. Do this once, use everywhere.*

✅ **Stage 8** — Design tokens file (`constants/theme.ts`) — exports all colours, font sizes, spacing, border radius, shadows as named constants matching DESIGN-SPEC.md

✅ **Stage 9** — Typography component (`components/Text.tsx`) — wraps all text styles (displayLarge, headingMedium, bodySmall etc.) with Poppins font loaded via expo-google-fonts

✅ **Stage 10** — Core UI components built and unit tested:
- `Button.tsx` (primary, secondary, disabled states)
- `Card.tsx`
- `Input.tsx`
- `Badge.tsx` (Verified, Women-only, Trusted)
- `Chip.tsx` (route chips, filter chips)
- `Avatar.tsx`

✅ **Stage 11** — Tab bar navigation (`app/(tabs)/_layout.tsx`) — Home, Search, Trips, Profile tabs with correct icons and teal active state

✅ **Stage 12** — Home screen rebuilt from scratch using DESIGN-SPEC.md and the HTML design file as reference — greeting, Find/Offer toggle, route input, safety grid, upcoming rides

---

## PHASE 3 — AUTHENTICATION
*Every user must be verified before using the app. Build auth before any other screens.*

✅ **Stage 13** — Backend chosen and set up: **Supabase** (PostgreSQL database + auth + realtime + storage). Create project at supabase.com, connect to HTWA repo, set environment variables

✅ **Stage 14** — User database schema created in Supabase:
- `users` table (id, email, phone, full_name, home_location, currency, created_at)
- `verification` table (user_id, id_verified, selfie_verified, verified_at)
- `profiles` table (user_id, bio, university, travel_preferences, nominated_contact)

✅ **Stage 15** — Login screen built — "htwa" logo, tagline, Continue with Apple / Google / mobile / email buttons, social proof (verified students count), legal footer

✅ **Stage 16** — Sign up screen — name, email, phone number, university, home location (ROI or NI — sets currency to € or £)

✅ **Stage 17** — Email/phone verification — OTP code entry screen

⬜ **Stage 18** — ID verification screen (mandatory — blocks app access until complete):
- Upload government ID (passport/driving licence)
- Take selfie
- Submission confirmation screen ("We're verifying your ID — usually takes a few minutes")
- Verified badge applied to profile on approval

⬜ **Stage 19** — Onboarding screen — nominated contact setup (name + phone number who receives live journey tracking)

⬜ **Stage 20** — Auth state management — app checks verification status on launch, redirects unverified users to verification flow

---

## PHASE 4 — USER PROFILES
*Build trust. Profiles are central to the safety model.*

⬜ **Stage 21** — Profile screen (own profile) — avatar, name, university, verified badges, rating, trips taken, reliability score, vehicle details (drivers), travel preferences

⬜ **Stage 22** — Edit profile screen — update bio, travel preferences (chatty/quiet, music ok, no smoking, pets ok), profile photo

⬜ **Stage 23** — Vehicle details screen (drivers only) — make, model, year, colour, seats, A/C, dashcam toggle

⬜ **Stage 24** — Other user's profile screen (read-only) — same layout but shows reviews, frequent routes, trip history visible to others

⬜ **Stage 25** — Supabase integration — profile read/write connected to database, unit + integration tests written

---

## PHASE 5 — GOOGLE MAPS INTEGRATION
*Needed before ride search or offering works. Set up early.*

⬜ **Stage 26** — Google Maps Routes API connected — API key set up, environment variable added, route calculation working

⬜ **Stage 27** — Route input component — autocomplete address search (Google Places API), From/To with swap button

⬜ **Stage 28** — Cost calculation engine (`utils/costCalculator.ts`):
- Detects driver's home jurisdiction (ROI or NI)
- Applies Revenue.ie rates (ROI drivers) or HMRC AMAP rates (NI drivers) for full journey
- Calculates per-seat cost based on number of passengers
- Enforces hard cap: driver can never earn more than calculated cost
- Unit tests for all calculation scenarios including cross-border journeys

⬜ **Stage 29** — Currency formatting utility (`utils/currency.ts`) — formats amounts as € or £ based on user's home location preference. Unit tested.

---

## PHASE 6 — RIDE FLOWS
*The core of the app. Find a ride and offer a ride.*

⬜ **Stage 30** — Ride database schema in Supabase:
- `rides` table (id, driver_id, from_location, to_location, departure_datetime, seats_total, seats_available, cost_per_seat, currency, women_only, status)
- `bookings` table (id, ride_id, passenger_id, seats_booked, status, created_at)

⬜ **Stage 31** — Offer a ride screen — from/to (using route input component), date picker, time picker, seats available, price per seat (auto-calculated, editable within cap), women-only toggle, vehicle auto-populated from profile

⬜ **Stage 32** — Offer a ride confirmation screen — summary of journey details, cost breakdown, legal note ("You may only charge up to the cost of the journey"), submit button

⬜ **Stage 33** — Find a ride screen — route input, date/time filter, seats filter, women-only filter toggle

⬜ **Stage 34** — Search results screen — list of available rides, each card showing: driver avatar + verified badge, route, departure time, seats available, price per seat, women-only badge if applicable

⬜ **Stage 35** — Ride detail screen — full driver profile preview, vehicle details, route map, departure/arrival times, seat selector, total cost, "Request to join" button

⬜ **Stage 36** — Booking request flow — passenger sends request, driver receives notification, driver accepts/declines

⬜ **Stage 37** — Booking confirmation screen — confirmed booking details, journey share prompt, add to calendar option

⬜ **Stage 38** — My Rides screen — upcoming rides (as driver and passenger), past rides, cancelled rides, each with status indicator

---

## PHASE 7 — PAYMENTS (STRIPE CONNECT)
*Money handling. Get this right — it's the legal and commercial core.*

⬜ **Stage 39** — Stripe Connect account set up at dashboard.stripe.com — platform account for HTWA, application fees configured

⬜ **Stage 40** — Driver Stripe Connect onboarding — when a user offers their first ride, they're prompted to connect a Stripe account to receive payments. Stripe Connect Express onboarding flow.

⬜ **Stage 41** — Payment method setup (passengers) — add card screen, Stripe payment method saved securely

⬜ **Stage 42** — Payment flow — passenger payment captured at booking, held in escrow, released to driver after trip completion minus platform fee

⬜ **Stage 43** — Platform fee applied — HTWA application fee deducted automatically via Stripe Connect

⬜ **Stage 44** — Payment confirmation screen — receipt, breakdown of cost per seat, platform fee shown

⬜ **Stage 45** — Refund handling — cancellation by driver triggers full refund, cancellation by passenger within policy triggers partial refund

⬜ **Stage 46** — Transaction history screen — list of payments made and received, downloadable receipts

---

## PHASE 8 — LIVE TRIP & SAFETY FEATURES
*The features that differentiate HTWA. Safety is the brand.*

⬜ **Stage 47** — Real-time location tracking — driver's location shared during active journey using device GPS + Supabase realtime

⬜ **Stage 48** — Live trip screen — map with animated route, live driver position, ETA, "Shared with X trusted contacts" panel

⬜ **Stage 49** — Journey sharing — when trip starts, nominated contact automatically receives a tracking link (SMS + push notification) with live map view. Link works without app install.

⬜ **Stage 50** — Auto check-in — push notification sent to nominated contact when trip completes ("Jordan has arrived safely at Galway, NUIG")

⬜ **Stage 51** — Silent SOS — one-tap button on live trip screen. Silently alerts nominated contact with live location and driver details. No sound, no indication to driver.

⬜ **Stage 52** — Women-only mode — filter logic for search, badge display on profiles and ride cards, driver setting on offer screen

⬜ **Stage 53** — In-app messaging — driver/passenger chat within a booking, basic text messages only, no external contact details shared

---

## PHASE 9 — REVIEWS & TRUST
*Post-trip trust loop. Ratings make the platform self-policing.*

⬜ **Stage 54** — Post-trip rating prompt — appears after journey marked complete, 5-star rating + optional comment for both driver and passenger

⬜ **Stage 55** — Rating submission and storage in Supabase

⬜ **Stage 56** — Rating display on profiles — average star rating, total trip count, reliability score (% of trips not cancelled)

⬜ **Stage 57** — Reviews list on profile — most recent first, reviewer name, star rating, comment, date

---

## PHASE 10 — NOTIFICATIONS
*Keep users informed at every stage.*

⬜ **Stage 58** — Push notifications set up — Expo Notifications + APNs (iOS) + FCM (Android) configured

⬜ **Stage 59** — Notification triggers wired up:
- Booking request received (driver)
- Booking accepted/declined (passenger)
- Trip starting soon (both)
- Trip completed (both)
- New review received
- Journey share alert (nominated contact)
- Auto check-in arrival

---

## PHASE 11 — SAVINGS & STATS
*The "save money vs bus/train" promise made visible.*

⬜ **Stage 60** — Bus/train fare lookup or estimate table by route (`utils/publicTransportFares.ts`) — used to calculate "Saved €X vs bus" on trip cards and history

⬜ **Stage 61** — Journey history screen — total saved this semester, CO₂ saved, trip list with per-trip savings vs public transport

⬜ **Stage 62** — CO₂ savings calculation (`utils/carbonCalculator.ts`) — calculates kg CO₂ saved vs solo car journey for shared seats

---

## PHASE 12 — POLISH & ACCESSIBILITY
*Make it feel like a proper product.*

⬜ **Stage 63** — App icon and splash screen — using HTWA brand assets, correct sizes for iOS and Android

⬜ **Stage 64** — Dark mode variant — all screens tested and styled for dark mode using dark theme tokens

⬜ **Stage 65** — Women-only mode UI variant — lavender colour scheme applied when women-only filter is active

⬜ **Stage 66** — Accessibility audit — VoiceOver (iOS) and TalkBack (Android) tested, minimum touch target sizes, colour contrast checked

⬜ **Stage 67** — Performance audit — lazy loading, image optimisation, bundle size check

⬜ **Stage 68** — Error states — every screen has an empty state, error state and loading state designed and built

⬜ **Stage 69** — Offline handling — graceful degradation when no internet connection

---

## PHASE 13 — LEGAL & COMPLIANCE
*Must be done before any public launch.*

⬜ **Stage 70** — Privacy policy written and hosted at htwa-app.com/privacy — covers GDPR (ROI) and UK GDPR (NI), data retention, location data usage

⬜ **Stage 71** — Terms of service written and hosted at htwa-app.com/terms — covers cost-share model, driver obligations, cancellation policy, prohibited use

⬜ **Stage 72** — Community safety pledge — short, plain-English pledge shown at signup and linked in app footer

⬜ **Stage 73** — Cookie/tracking policy for website

---

## PHASE 14 — WEBSITE & WAITING LIST
*Launch the waiting list before the app is ready.*

⬜ **Stage 74** — htwa-app.com landing page — hero, how it works, safety features, waiting list signup form

⬜ **Stage 75** — Waiting list backend — email capture connected to Supabase or Mailchimp

⬜ **Stage 76** — QR code links to waiting list signup page

⬜ **Stage 77** — University flyer printed and distributed (design already done in Claude Design)

---

## PHASE 15 — BETA TESTING
*Real users before public launch.*

⬜ **Stage 78** — TestFlight set up (iOS) — invite beta testers from waiting list

⬜ **Stage 79** — Google Play internal testing (Android) — invite beta testers

⬜ **Stage 80** — Beta feedback collected and critical bugs fixed

⬜ **Stage 81** — Load testing — simulate concurrent users on Supabase

---

## PHASE 16 — APP STORE SUBMISSION
*The finish line for Phase 1.*

⬜ **Stage 82** — Apple Developer account set up (hello@htwa-app.com, €99/year)

⬜ **Stage 83** — Google Play Developer account set up (hello@htwa-app.com, €25 one-time)

⬜ **Stage 84** — App Store listing prepared — screenshots (all required sizes), description, keywords, category (Travel), age rating

⬜ **Stage 85** — Google Play listing prepared — same assets adapted for Play Store requirements

⬜ **Stage 86** — iOS App Store submission — build uploaded via Xcode, review guidelines checklist completed, submitted for Apple review

⬜ **Stage 87** — Android Google Play submission — AAB uploaded, content rating completed, submitted for review

⬜ **Stage 88** — App approved and live on both stores 🎉

---

## Notes & Priorities

**Parallel tracks — run these simultaneously:**
- 🔴 **Track A (Immediate):** Website + waiting list (Stages 74–76) — start now, before any app screens
- 🟠 **Track B (Soon):** Legal — privacy policy, T&Cs, community safety pledge (Stages 70–73) — draft during summer
- 🟡 **Track C (Ongoing):** App build (Stages 7–69) — steady daily progress through the summer
- 🟢 **Track D (Ongoing):** Marketing — flyers, coasters, social media, waiting list growth

**Key dates:**
- Now → August: Build app, grow waiting list, complete legal
- August: Beta testing with waiting list users (TestFlight)
- September: App Store submission and launch

**Code quality rules (non-negotiable):**
- Every function must have a unit test
- Integration tests wherever functions touch external services
- All merges to main blocked unless CI passes
- Code must be clean, well-commented and modular — ready to hand to a human React Native developer at any point
- No magic numbers — all values come from theme.ts constants
- No inline styles — all styles in StyleSheet or theme components

**Never skip the tests** — every stage involving a new function requires unit tests before moving to the next stage

**Stripe account setup** can happen in parallel with Phase 6 — the account approval takes time, start early

**Legal (Phase 13) should be drafted** during Phase 6 — don't leave it to the end
