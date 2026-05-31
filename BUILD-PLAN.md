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

✅ **Stage 18** — ID verification screen (mandatory — blocks app access until complete):
- Upload government ID (passport/driving licence)
- Take selfie
- Submission confirmation screen ("We're verifying your ID — usually takes a few minutes")
- Verified badge applied to profile on approval

✅ **Stage 19** — Onboarding screen — nominated contact setup (name + phone number who receives live journey tracking)

✅ **Stage 20** — Auth state management — `AuthContext` (user, session, isLoading, isVerified, refreshVerification), `signInWithOtp` email OTP flow, OTP verification wired to Supabase, `id-verify` upserts verification row, `profile-setup` upserts profiles table, RLS UPDATE policy on verification, full end-to-end flow verified on simulator (30 May 2026)

---

## PHASE 4 — USER PROFILES
*Build trust. Profiles are central to the safety model.*

✅ **Stage 21** — Profile screen (own profile) — avatar, name, university, verified badge, stats row (rating/trips/reliability placeholders until Phase 9), edit/settings/vehicle/my-rides actions. (`app/(tabs)/profile.tsx`)

✅ **Stage 22** — Edit profile screen — bio, university, travel preference chips (chatty, music ok, no smoking, pets ok), upsert save. (`app/edit-profile.tsx`)

✅ **Stage 23** — Vehicle details screen (drivers) — make/model/year/colour, seats stepper, A/C + dashcam toggles, saved to `profiles.vehicle_details`. (`app/vehicle-details.tsx`)

✅ **Stage 24** — Other user's profile screen (read-only) — name, university, verified + women-only badges, stats, reviews placeholder, report modal. (`app/user-profile/[id].tsx`)

✅ **Stage 25** — Supabase integration — migration `20260531000001_profile_columns.sql` (vehicle_details, women_only_mode, public-read RLS) applied to the live DB via Management API; `types/database.ts` updated to match; read/write wired with unit tests. ⏳ *Simulator end-to-end verification pending (Jordan).*

---

## PHASE 5 — GOOGLE MAPS INTEGRATION
*Needed before ride search or offering works. Set up early.*

⏸️ **Stage 26** — Google Maps Routes API connected — **DEFERRED**: needs a Google Cloud project + billing (payment, Jordan's action) and `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`. Resume when the key is available.

⏸️ **Stage 27** — Route input component (Places autocomplete) — **DEFERRED** with Maps. A plain From/To text-input stub (with swap) is built for ride flows in the interim; autocomplete added when the key lands.

✅ **Stage 28** — Cost calculation engine (`utils/costCalculator.ts`): ROI €0.43/km (Revenue.ie) / NI £0.2796/km (HMRC AMAP) by driver jurisdiction; suggested per-seat = totalCost/(seats+1) (driver shares, never profits); hard cap via `isWithinCap` (passengers' total ≤ driver cost). 24 unit tests incl. cross-border.

✅ **Stage 29** — Currency formatting utility (`utils/currency.ts`) — `formatCurrency`/`parseCurrency`/`currencySymbol`, € or £, 2dp. 16 unit tests.

---

## PHASE 6 — RIDE FLOWS
*The core of the app. Find a ride and offer a ride.*

✅ **Stage 30** — Ride database schema (`20260531000002_create_ride_tables.sql`, applied to live DB): `rides` + `bookings` with CHECK constraints, full RLS, `users.gender` column, and **DB-level women-only booking enforcement** (booking INSERT allowed only if ride is open or passenger gender = 'female'). `types/database.ts` extended with Ride/Booking/Gender types. Also added Maps-deferred stubs `components/RouteInput.tsx` (§9.2, text inputs + swap) and `components/RouteMapPlaceholder.tsx` for the ride flows.

✅ **Stage 31** — Offer a ride screen (`app/offer-ride.tsx`) — RouteInput, date/time, seats stepper, **auto-calculated price** (within cap, editable), women-only toggle, home-rate loaded from profile. ⏸️ *Distance is a manual field for now (Maps Routes API will auto-fill it).*

✅ **Stage 32** — Offer confirmation (`app/offer-ride-confirm.tsx`) — summary, cost breakdown, legal note, `rides.insert` → `app/ride-posted.tsx`. ⏳ *Entry point (Search-tab Offer toggle → /offer-ride) wired with Stage 33.*

✅ **Stage 33** — Search tab (`app/(tabs)/index.tsx`) — Find/Offer toggle; Find mode (RouteInput, date, seats stepper, women-only Switch → /search-results); Offer mode (→ /offer-ride); safety grid; greeting from `useAuth()`. Wires the Stage 32 entry point.

✅ **Stage 34** — Search results (`app/search-results.tsx`) — ride cards (driver+verified badge, route, time, seats, price, women-only); NaN seats guard, date filter, explicit `driver_id`, batched verification (no N+1); empty/loading/error states.

✅ **Stage 35** — Ride detail (`app/ride/[id].tsx`) — explicit driver/profile/verification fetches, `RouteMapPlaceholder`, vehicle chips, seat selector, total cost, "Request to join".

✅ **Stage 36** — Booking request (`app/booking-request.tsx`) — `.maybeSingle()` guard + atomic `book_ride` RPC (migration `…003`, applied live) for seat decrement; not_enough_seats handled.

✅ **Stage 37** — Booking success (`app/booking-success.tsx`) — summary + View Live Trip deep link.

✅ **Stage 38** — My Rides (`app/my-rides.tsx`) — upcoming/past, driver rides + passenger bookings, status badges (named colour constants), error state.

---

## PHASE 7 — PAYMENTS (STRIPE CONNECT)
*Money handling. Get this right — it's the legal and commercial core.*

⏸️ **Stage 39** — Stripe Connect platform account — **MANUAL (Jordan)**: must be created at dashboard.stripe.com before any payout/charge works. App-side fee config is in the Edge Functions.

✅ **Stage 40** — Driver onboarding Edge Function (`supabase/functions/create-connect-account/index.ts`) — Stripe Express account + onboarding URL. ⏳ *Deploy via `supabase functions deploy` (Jordan).*

✅ **Stage 41** — PaymentIntent Edge Function (`supabase/functions/create-payment-intent/index.ts`) — `application_fee_amount = Math.round(amount*100*0.10)` (10% platform fee).

✅ **Stage 42** — Payment flow (`app/payment.tsx`) — Stripe Payment Sheet, early guard on missing booking details, init from edge-function client secret.

✅ **Stage 43** — Platform fee — 10% applied via `application_fee_amount` in the PaymentIntent (Stage 41).

✅ **Stage 44** — Payment confirmation (`app/payment-confirmation.tsx`) — receipt: ride cost, platform fee, total.

✅ **Stage 45** — Refunds (`services/bookings.ts`) — `cancelRideAsDriver` (full refund all), `cancelBookingAsPassenger` (full refund >24h via `isFullRefundEligible`, none ≤24h), seat restoration. ⏳ *Stripe Refund API call deferred (needs stored PaymentIntent IDs).*

✅ **Stage 46** — Transaction history (`app/transaction-history.tsx`) — payments/payouts/refunds list, named status colours, empty state until the get-transactions function is deployed.

---

## PHASE 8 — LIVE TRIP & SAFETY FEATURES
*The features that differentiate HTWA. Safety is the brand.*

✅ **Stage 47** — Location tracking (`services/location.ts`) — `startTracking`/`stopTracking`/`getCurrentLocation` via expo-location + Supabase Realtime channel `trip:{id}`. Manual mock `__mocks__/expo-location.js`. ⏳ *Native build needs the package linked (`expo run:ios`).*

✅ **Stage 48** — Live trip screen (`app/(tabs)/live-trip.tsx`) — idle vs active, `RouteMapPlaceholder`-style map stub, LIVE badge, bottom sheet, lavender sharing panel; `fetchActiveTrip` checks `.error` (logs non-PGRST116) and uses explicit fetches.

✅ **Stage 49** — Journey sharing (`utils/tracking.ts`) — `generateTrackingUrl`, `sendTrackingLinkToContact` stub; copyable "Open tracking link".

⏳ **Stage 50** — Auto check-in — deferred to Phase 10 (push notifications).

✅ **Stage 51** — Silent SOS — one-tap button on live trip (`Colors.sos` bg, `Colors.surface` text), no driver-visible indication. (Contact alert wired in Phase 10.)

✅ **Stage 52** — Women-only mode — DB-level booking enforcement (migration `…002`), filter on search, badges on cards/profiles, driver toggle on offer screen.

✅ **Stage 53** — In-app messaging (`app/chat/[booking_id].tsx`) — Realtime chat per booking, messages table (migration `…004`, applied live), `handleSend` checks error / clears on success / `finally`.

---

## PHASE 9 — REVIEWS & TRUST
*Post-trip trust loop. Ratings make the platform self-policing.*

✅ **Stage 54** — Post-trip rating screen (`app/rate-trip/[booking_id].tsx`) — 5-star + optional comment; passenger rates driver, driver rates passenger.

✅ **Stage 55** — Rating storage — `reviews` table (migration `…005`, applied live, `UNIQUE(trip_id, reviewer_id, reviewee_id)`); `upsert` with matching `onConflict` so re-rating amends. `Review` types added.

⏳ **Stage 56** — Rating display on profiles — *deferred*: reviews are stored; the average/total/reliability rollup on profiles is a follow-up (placeholder stats row exists on profile screens).

⏳ **Stage 57** — Reviews list on profile — *deferred*: `app/user-profile/[id].tsx` has a reviews-section placeholder; the live list wires up when the profile rollup lands.

---

## PHASE 10 — NOTIFICATIONS
*Keep users informed at every stage.*

✅ **Stage 58** — Push notifications (`services/notifications.ts` + expo-notifications) — `registerForPushNotifications` (permission + Expo token), app.json plugin + iOS `aps-environment` entitlement. ⏳ *APNs key (Apple acct) + FCM `google-services.json` (Play acct) are EAS-credential/manual steps; native delivery needs the device build.*

✅ **Stage 59** — Notification triggers (`buildNotification` + `notify*` helpers): booking request, booking accepted, booking declined, trip starting soon, trip completed, new review. ⏳ *Journey-share alert + auto-check-in arrival fold in once the contact-SMS channel exists (currently `sendTrackingLinkToContact` stub).*

---

## PHASE 11 — SAVINGS & STATS
*The "save money vs bus/train" promise made visible.*

✅ **Stage 60** — Fare lookup (`utils/publicTransportFares.ts`) — `getFareEstimate(from, to)` (Dublin↔Galway €13, ↔Cork €20, ↔Limerick €16, ↔Belfast €18, Cork↔Limerick €10, Galway↔Limerick €12; direction-agnostic, substring match) + `getSavingVsPublicTransport`.

✅ **Stage 61** — Journey history (`app/(tabs)/history.tsx`) — savings + CO₂ stats header, filter tabs, trip list with per-trip "Saved €X vs public transport". Checks `.error` on both queries; uses `trip.currency` (not hardcoded).

✅ **Stage 62** — CO₂ savings (`utils/carbonCalculator.ts`) — `calculateCO2Savings(distanceKm, passengers)` → `{ savedKg, treesEquivalent, savedGrams }` at 170 g/km (richer than the spec's bare `number`; the UI shows kg + trees).

---

## PHASE 12 — POLISH & ACCESSIBILITY
*Make it feel like a proper product.*

✅ **Stage 63** — App icon + splash — brand assets in `assets/` (done in earlier phases; icon verified on simulator in Session 21).

⏳ **Stage 64** — Dark mode variant — *deferred* (DESIGN-SPEC: "Never dark mode unless building the dark variant"); a follow-up once light is launch-ready.

✅ **Stage 65** — Women-only UI variant — lavender badges/panel applied (`Colors.lavender*`) across cards/profiles/live-trip; driver toggle on offer.

✅ **Stage 66** — Accessibility pass — `accessibilityLabel` on every icon-only `TouchableOpacity` (back buttons, steppers "Increase/Decrease seats"), `accessibilityRole`/`accessibilityState` on toggles. ⏳ *VoiceOver/TalkBack device pass: Jordan.*

⏳ **Stage 67** — Performance audit — *deferred* to pre-launch (lazy loading / bundle check on the real build).

✅ **Stage 68** — Error/empty/loading states — present on all data screens. Minor gaps noted in PROGRESS.md (terminal screens have no error state by design).

✅ **Stage 69** — Offline handling (`utils/connectivity.ts`) — `isConnected()` + `onConnectivityChange()` over netinfo. ⏳ *Per-screen offline banners wired incrementally.*

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

✅ **Stage 74** — htwa-app.com landing page — hero, how it works, safety features, waiting list signup form

✅ **Stage 75** — Waiting list backend — email capture connected to Supabase or Mailchimp

✅ **Stage 76** — QR code links to waiting list signup page

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
