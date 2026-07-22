# Blockers for Jordan

Things only you can do. Each entry says exactly what I need, how to get it, and what it unblocks. Everything listed here is already **stubbed gracefully in the app** — nothing crashes while these are missing.

---

## 1. Google Maps API key

**✅ RESOLVED (20 Jul, overnight run, corrected after initially being reported dead):** an earlier version of this key tested as dead (`API_KEY_INVALID` on Routes/Geocoding) after its value was accidentally printed in plaintext in the Claude Code transcript twice (a mistake, already flagged in-session) — Google's exposed-key scanning likely auto-revoked it. You then gave a replacement key. Re-tested live against `.env.local`'s current value:
- **Routes API: working.** Real Belfast→Dublin query returned `distanceMeters: 168932, duration: 7184s`.
- **Places API (New) autocomplete: working.** Real suggestions returned for a test query.
- **Geocoding API: `REQUEST_DENIED` — not enabled on the project.** Not used anywhere in the app's code (only Routes + Places are), so this doesn't block anything. Worth enabling anyway for future-proofing but not urgent.

**Also confirmed:** EAS's stored `development` environment variable has the exact same value as `.env.local` (verified via matching SHA-256 checksums, without ever printing either raw key).

**Original setup instructions below, for a fresh key if this ever needs rotating again — deliberately avoids putting any key value on a command line (shell history / process listings can expose it) or in chat:**

**I need:** a Google Maps API key with the Routes API and Places API (New) enabled.

**Get it by:**
1. Go to https://console.cloud.google.com and sign in (create the account with hello@htwa-app.com if you don't have one). **Note:** Google's old "$200/month free credit" promotion ended February 28, 2025 — current pricing is per-SKU free monthly billable events instead. Check https://developers.google.com/maps/billing-and-pricing/overview for what's actually free before assuming a budget cushion.
2. Top bar → "Select a project" → **New Project** → name it `htwa` → Create.
3. In the search bar type **Routes API** → open it → click **Enable**.
4. Search **Places API (New)** → open it → click **Enable**.
5. Search **Maps SDK for iOS** → **Enable**. Then search **Maps SDK for Android** → **Enable**.
6. Left menu → **APIs & Services → Credentials** → **+ Create credentials → API key**.
7. **Before using the key anywhere**, restrict it: open the new key's settings → **Application restrictions** → set iOS apps restricted to bundle ID `com.htwa.app` (and the equivalent Android package + SHA-1 for the Android key, or a separate key per platform) → **API restrictions** → limit to only Routes API, Places API (New), and the two Maps SDKs enabled above. Also set a daily quota and a budget alert (Billing → Budgets & alerts) so a leaked or abused key can't run up an unbounded bill. Google explicitly recommends all of this: https://developers.google.com/maps/api-security-best-practices — an unrestricted client-side key is the actual risk, not a hypothetical one.
8. Copy the key that appears.
9. Open 1Password → HTWA vault → **+ New Item → API Credential** → title it exactly `htwa google maps API key` → paste the key into the **credential/password** field → Save.
10. Also open `~/Documents/HTWA/.env.local` in any text editor and add a line at the bottom: `EXPO_PUBLIC_GOOGLE_MAPS_KEY=` followed by the key (this one is a client-side key, so .env.local is the right place).
11. Update the EAS-stored copy through the **EAS dashboard** (expo.dev → project → Environment variables), not a command-line `--value` flag — that would put the raw key in shell history and process listings, which is exactly what CodeRabbit's review of this file flagged.

**Unblocks:** real route distance/duration calculation (currently "distance unavailable" stub), live map on the Live Trip + tracking screens (currently coordinate/progress text), address autocomplete on journey posting/search.

---

## 2. Stripe Connect platform profile (needed before real money, not for testing)

**I need:** the Stripe Connect platform profile completed so driver payouts work outside test mode.

**Get it by:**
1. Go to https://dashboard.stripe.com and sign in.
2. Left menu → **Connect** → if it shows "Complete your platform profile", click it.
3. Answer the questionnaire (platform type: marketplace; your users provide services — transportation; loss liability: platform).
4. That's it — nothing to copy anywhere.

**Unblocks:** live-mode driver onboarding and payouts. **Test mode already works** — I verified tonight that a test driver gets a real Stripe onboarding URL and test payments with the 10% platform fee go through, so this is NOT urgent for beta testing with test cards.

---

## 3. Twilio credentials (SMS safety alerts to nominated contacts)

**I need:** a Twilio Account SID, Auth Token, and an SMS-capable phone number.

**Get it by:**
1. Go to https://console.twilio.com and create an account (hello@htwa-app.com). The free trial includes a phone number and SMS credit (trial SMS can only go to verified numbers — fine for testing).
2. On the Console home page you'll see **Account SID** and **Auth Token** (click "Show"). Copy both.
3. Phone Numbers → Manage → **Buy a number** (or use the free trial number) → make sure it has SMS capability → copy it in +E.164 format (e.g. +353...).
4. Open 1Password → HTWA vault → **+ New Item → API Credential** → title it exactly `htwa twilio credentials` → put the Account SID in the username field, the Auth Token in the password field, and the phone number in the notes → Save.
5. Tell Claude in the next session: "Twilio creds are in the vault" — Claude will set them as Supabase Edge Function secrets (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`) and the SMS path lights up with no code changes.

**Unblocks:** SMS alerts to nominated contacts (SOS, off-course, journey-complete) for contacts who don't have the htwa app. Until then: in-app alerts to contacts who ARE htwa users work already; SMS returns a graceful "unavailable" and the app records the alert in the audit table regardless.

---

## 4. Apple Developer + Google Play accounts (push notifications & store release)

**I need:** an Apple Developer Program membership ($99/yr) and a Google Play Console account ($25 one-off), both under hello@htwa-app.com.

**Get them by:**
1. Apple: https://developer.apple.com/programs/enroll → enroll as an organisation (needs a D-U-N-S number — start this early, it can take days) or as an individual to move faster.
2. Google: https://play.google.com/console/signup → pay the $25 → verify identity.
3. Tell Claude when done — Claude will wire APNs/FCM push credentials through EAS (`eas credentials`).

**Unblocks:** real push notifications (currently local-notification delivery only, which works while the app is open/backgrounded but can't reach a closed app), TestFlight/Play beta distribution, and eventually the store launch.

---

## 5. ~~Host the tracking web page~~ — RESOLVED, no action needed

I discovered htwa-app.com is already served by Netlify from this repo's `website/` folder, so I placed the tracking page at `website/track/index.html`. It goes live at `https://htwa-app.com/track` automatically when this branch merges to main. Nothing for you to do.

---

## 6. Reviewing verification submissions — now TWO tables, not one (recurring beta task — not a blocker)

**19 Jul update:** identity verification is now universal — every user (not just drivers) submits a photo ID + date of birth + live selfie and needs your approval before they can book a seat or post a journey (they can browse/search while pending, just not book/post). This is a SEPARATE review from driver verification, in a separate table:

**A. Everyone's identity verification** — `public.verification`:
1. Table Editor → `verification` → rows with status `pending`.
2. Open **Storage** → `identity-documents` bucket → the user's folder → check their photo ID. Their selfie is in `verification-selfies`.
3. Check the `date_of_birth` column against the date of birth shown on the photo ID — the app enforces 18+ automatically, but only against what the user typed in, not against the document, so this cross-check is the part only you can do.
4. Set `status` to `approved` (or `rejected` with a short `review_note` — the user sees it in the app) and save.

**B. Drivers additionally need** `public.driver_verifications` approved before they can post journeys (on top of A, not instead of it):
1. Table Editor → `driver_verifications` → rows with status `pending`.
2. Open **Storage** → `driver-verifications` bucket → the driver's folder → check the licence photo and the car photo, and confirm the registration plate in the photo matches the `car_registration` column.
3. Set `status` to `approved`/`rejected` the same way.

Only the dashboard/service role can set either status to approved — the app physically can't self-approve either one, tamper-tested for both.

**You'll get one push notification per submission for either table** (see item 7 below) — the notification title tells you which one ("driver verification" vs "identity verification"), so you know which table to open.

---

## 7. Set up the ntfy app to get notified of new verification submissions (2 minutes)

**Why:** MailerLite (the key you already have) turned out not to support sending single one-off emails — that's a separate product (MailerSend) we don't have a key for. As an immediate, zero-signup stand-in, I wired a push notification via ntfy.sh (a free, no-account-needed push service) straight from the database — it fires the moment a `driver_verifications` **or** `verification` row enters (or re-enters) review, tapping the notification opens the Supabase Table Editor directly.

**Get it by:**
1. Install the free **ntfy** app from the App Store (search "ntfy" — publisher is "ntfy.sh").
2. Open it → tap **+** (subscribe to topic) → paste this exact topic name:
   ```
   htwa-driver-review-3b0ae5a0413c639d095a
   ```
3. Server: leave it as the default `ntfy.sh`. Tap Subscribe.

**Caveat:** ntfy's free tier has no login — that topic name is the only thing keeping these alerts private (anyone who learns the exact string could read them or post fake submissions). It's identity/driver details, not financial data, so the risk is low, but it's worth knowing. If you'd rather have a proper authenticated email instead, get a free API key from **resend.com** (2-minute signup) and tell Claude — it'll swap this trigger for a real email to hello@htwa-app.com and this ntfy trigger can be removed.

**Unblocks:** knowing the moment anyone needs review, instead of having to remember to check either table proactively.

---

*Entries are appended as new blockers are hit; nothing above stops the build — every feature behind these has a graceful fallback.*

**Note on Stripe (updated 19 Jul):** test-mode payments are fully working end-to-end — I verified a real test-card charge with the 10% platform fee, a driver-mismatch full refund, and idempotent refund retries against the live backend tonight. Item 2 above only matters when real money starts.
