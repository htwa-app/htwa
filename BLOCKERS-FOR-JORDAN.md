# Blockers for Jordan

Things only you can do. Each entry says exactly what I need, how to get it, and what it unblocks. Everything listed here is already **stubbed gracefully in the app** — nothing crashes while these are missing.

---

## 1. Google Maps API key

**I need:** a Google Maps API key with the Routes API and Places API (New) enabled.

**Get it by:**
1. Go to https://console.cloud.google.com and sign in (create the account with hello@htwa-app.com if you don't have one — it's free to start, Google gives $200/month free maps usage).
2. Top bar → "Select a project" → **New Project** → name it `htwa` → Create.
3. In the search bar type **Routes API** → open it → click **Enable**.
4. Search **Places API (New)** → open it → click **Enable**.
5. Search **Maps SDK for iOS** → **Enable**. Then search **Maps SDK for Android** → **Enable**.
6. Left menu → **APIs & Services → Credentials** → **+ Create credentials → API key**.
7. Copy the key that appears.
8. Open 1Password → HTWA vault → **+ New Item → API Credential** → title it exactly `htwa google maps API key` → paste the key into the **credential/password** field → Save.
9. Also open `~/Documents/HTWA/.env.local` in any text editor and add a line at the bottom: `EXPO_PUBLIC_GOOGLE_MAPS_KEY=` followed by the key (this one is a client-side key, so .env.local is the right place).

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

## 5. Host the tracking web page at htwa-app.com/track

**I need:** the file `web/track.html` (in the repo) uploaded to wherever htwa-app.com is hosted, reachable at `https://htwa-app.com/track`.

**Get it by:**
1. Log in to wherever you bought/manage htwa-app.com (your domain registrar or hosting).
2. If you don't have hosting yet, the free easy option is Cloudflare Pages: go to https://pages.cloudflare.com → sign up → "Upload assets" → drag in the `web` folder from `~/Documents/HTWA` → name the project `htwa` → deploy → then add your domain htwa-app.com under Custom domains.
3. The page must be reachable at `https://htwa-app.com/track` (Cloudflare Pages: rename `track.html` to `track/index.html` when uploading, or just tell Claude which host you chose and Claude will prepare the exact upload).

**Unblocks:** the safety-contact web link. Right now, when a nominated contact WITHOUT the htwa app taps the tracking link in an SMS, nothing is hosted at that address. Contacts WITH the app already get the in-app live view. (The page itself is finished and tested — it only needs hosting.)

---

*Entries are appended as new blockers are hit; nothing above stops the build — every feature behind these has a graceful fallback.*

**Note on Stripe (updated 19 Jul):** test-mode payments are fully working end-to-end — I verified a real test-card charge with the 10% platform fee, a driver-mismatch full refund, and idempotent refund retries against the live backend tonight. Item 2 above only matters when real money starts.
