# HTWA — Screen Inventory
> Complete map of every screen, modal, and third-party flow in the app.
> Claude Code must build everything marked **Screen** or **Modal**.
> Everything marked **Third-party** is handled by an external SDK — integrate, don't rebuild.
> **Every screen and modal must be built in strict accordance with DESIGN-SPEC.md — colours, typography, spacing, border radius, shadows, and component styles without exception.**
> Last updated: 11 May 2026

---

## How to read this document

| Type | Meaning |
|------|---------|
| **Screen** | A full standalone screen in the navigation stack |
| **Modal** | Overlays an existing screen — bottom sheet or popup |
| **Third-party** | Entirely handled by an external SDK — we just trigger it |

---

## Navigation Structure

The app uses a **bottom tab bar with 4 tabs**, always visible after authentication regardless of trip state.

| Tab | Route file | Title | Idle state | Notes |
|-----|------------|-------|------------|-------|
| 1 | `app/(tabs)/index.tsx` | Search | Find a ride / Offer a ride toggle | Main entry point for all ride activity |
| 2 | `app/(tabs)/history.tsx` | History | "Your trip history will appear here" | Past trips, savings, CO₂ stats |
| 3 | `app/(tabs)/live-trip.tsx` | Live Trip | "You don't have an active journey right now" | Active journey map + safety sharing + Silent SOS. Shows idle message when no trip is in progress. |
| 4 | `app/(tabs)/profile.tsx` | Profile | User profile | Settings accessed via cog icon inside this screen — not a separate tab |

Onboarding screens (Login, Sign Up, Verification) live in the parent Stack navigator and never show the tab bar.

---

## 1. Onboarding

| # | Name | Type | Notes |
|---|------|------|-------|
| 1 | Splash / Loading | Screen | App open state, checks auth token |
| 2 | Login | Screen | Documented in DESIGN-SPEC §9.1 |
| 3 | Sign Up | Screen | Name, email, phone, university, password |
| 4 | Phone / Email Verification | Screen | OTP confirmation step after sign up |
| 5 | ID & Selfie Verification | Third-party | Triggered after sign up — handled entirely by KYC provider SDK (Stripe Identity or Onfido). User never leaves the SDK flow. On completion, verified status is written to their profile. |
| 6 | Profile Setup | Screen | Photo, display name, home location (ROI or NI sets currency). Shown once after verification. |

---

## 2. Search Tab — Find & Offer a Ride

| # | Name | Type | Notes |
|---|------|------|-------|
| 7 | Search (Home) | Screen | Documented in DESIGN-SPEC §9.2. Tab 1. Toggle between Find a ride / Offer a ride. Entry point for all ride activity. |
| 8 | Search Results | Screen | List of available rides matching the query. Filter by time, seats, women-only. |
| 9 | Ride Detail | Screen | Full info on a specific ride — driver profile card, route, price, seats, car details. CTA: Book this ride. |
| 10 | Booking Confirmation | Modal | Appears on top of Ride Detail. Summary of the booking + price. CTA: Confirm & Pay. |
| 11 | Payment | Third-party | Stripe Payment Sheet triggered by Confirm & Pay. Handles card entry, Apple Pay, Google Pay natively. We never touch card data. |
| 12 | Booking Success | Modal | Brief success state after payment. Shows ride summary and deep link to Live Trip when journey starts. |

---

## 3. Offering a Ride (Driver)

| # | Name | Type | Notes |
|---|------|------|-------|
| 13 | Offer a Ride | Screen | Route (from / to), date, time, available seats, price per seat. Price is calculated based on civil service mileage rates — driver cannot exceed the cap. |
| 14 | Price Calculator | Modal | Bottom sheet within Offer a Ride. Shows distance, rate applied (Revenue.ie or HMRC AMAP based on driver's home jurisdiction), max allowed price, and suggested split. |
| 15 | Ride Posted Confirmation | Screen | Confirms the ride is live. Shows a summary and links to Manage My Rides. |
| 16 | Manage My Rides | Screen | Driver's upcoming rides. Each ride shows passenger count, departure time, and status. |
| 17 | Passenger Request | Modal | Triggered when a passenger requests to join. Shows passenger profile card (name, verified badge, rating). Driver accepts or declines. |

---

## 4. Live Trip Tab

| # | Name | Type | Notes |
|---|------|------|-------|
| 18 | Live Trip | Screen | Documented in DESIGN-SPEC §9.4. Tab 3. Map view, driver info, sharing panel (lavender), Silent SOS button. Shows idle message ("You don't have an active journey right now") when no trip is in progress. Tab is always visible — not hidden when idle. |
| 19 | Journey Tracking (Nominated Contact) | Third-party / Web | A web view sent as a link to the nominated contact. Not a screen inside the app — it's a hosted tracking page. Real-time location only, no app required. |

---

## 5. Profile Tab & Settings

| # | Name | Type | Notes |
|---|------|------|-------|
| 20 | My Profile | Screen | Tab 4. Gamification level badge, stats row (journeys, km shared, trees saved), journey history cards. Documented in DESIGN-SPEC §6.11–6.13. Cog icon in top-right corner opens Settings. |
| 21 | Edit Profile | Screen | Update photo, display name, vehicle details, nominated contact. |
| 22 | Driver Profile (other user) | Screen | Documented in DESIGN-SPEC §9.3. Read-only view of another user's profile. |
| 23 | Settings | Screen | Accessed via cog icon inside the Profile tab — not a separate tab. Notification preferences, women-only mode toggle, currency display, privacy settings, account deletion. |
| 24 | Account Deletion | Modal | GDPR-required. Confirms intent, explains what data is deleted, triggers deletion request. Irreversible. |

---

## 6. Driver Payouts

| # | Name | Type | Notes |
|---|------|------|-------|
| 25 | Stripe Connect Onboarding | Third-party | Triggered the first time a driver posts a ride. Stripe hosts the entire flow — bank account, identity, tax. We pass control to Stripe and handle the callback. |
| 26 | Earnings | Screen | Driver's total earnings, per-ride breakdown, payout history. Read from Stripe Connect API. |

---

## 7. History Tab & Post-Trip

| # | Name | Type | Notes |
|---|------|------|-------|
| 27 | Rate & Review | Screen | Shown automatically after a trip completes. Star rating + optional comment. Both driver and passenger rate each other. |
| 28 | Journey History | Screen | Tab 2. Documented in DESIGN-SPEC §9.5. Stats header, filter tabs, trip list with savings vs public transport. |
| 29 | Trip Detail (past) | Screen | Full breakdown of a completed trip — route, co-driver/passenger, amount paid, CO₂ saved, receipt link. |

---

## 8. Safety

| # | Name | Type | Notes |
|---|------|------|-------|
| 30 | Safety Hub | Screen | Overview of HTWA's safety features — verified IDs, women-only mode, nominated contact, SOS. Referenced on Home screen. |
| 31 | Report a User | Modal | Triggered from any profile or live trip screen. Category selection + optional note. Submitted to moderation queue. |

---

## 9. General

| # | Name | Type | Notes |
|---|------|------|-------|
| 32 | Notifications | Screen | In-app notification centre. Ride requests, booking confirmations, trip reminders, review prompts. |
| 33 | Help / FAQ | Screen | Common questions. Lightweight — no live chat at launch. |
| 34 | Terms & Community Safety Pledge | Screen | Required reading on first sign up. User must confirm before proceeding. |

---

## Summary

| Type | Count |
|------|-------|
| Screens to build | 26 |
| Modals to build | 6 |
| Third-party flows (integrate, don't build) | 4 |
| **Total** | **36** |

---

## Third-party integrations summary

| Flow | Provider | Notes |
|------|----------|-------|
| ID & selfie verification | Stripe Identity (preferred) or Onfido | Stripe Identity keeps everything in one payment ecosystem |
| Payment processing | Stripe Payment Sheet | Handles cards, Apple Pay, Google Pay |
| Driver payout onboarding | Stripe Connect Express | Stripe hosts KYC and bank account setup for drivers |
| Nominated contact tracking | Custom hosted web page | Real-time location link, no app required for recipient |
