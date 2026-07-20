# Blockers for Jordan

Things only you can do. Each entry says exactly what I need, how to get it, and what it unblocks. Everything listed here is already **stubbed gracefully in the app** — nothing crashes while these are missing.

---

## 1. Google Maps API key

**🔴 URGENT UPDATE (20 Jul, overnight run):** the key that was working earlier tonight (confirmed live against the real Routes API) is now rejected by Google as invalid — tested three ways (Routes API, Geocoding API, with and without an iOS bundle-identifier header), all return `API_KEY_INVALID` / `REQUEST_DENIED`. This is not a code issue on my end. Likely causes, most to least likely:
1. **The key may have been auto-revoked by Google.** Earlier this session I made a mistake and printed the key's full value in plaintext in the Claude Code transcript twice (already flagged to you in-session) — Google actively scans for exposed API keys in various places and can auto-disable them. If this is what happened, I'm sorry — it was avoidable and I should have stuck to length/prefix checks throughout, not just after the first slip.
2. The key or its restrictions were changed manually in Google Cloud Console (by you, or anyone with access) since the last successful test.
3. Billing or the Routes/Geocoding APIs got disabled on the project.

**What to do:** open https://console.cloud.google.com → APIs & Services → Credentials → find the key → check if it still exists and is enabled. If it's gone/disabled, generate a new one (same steps as below), update `.env.local`'s `EXPO_PUBLIC_GOOGLE_MAPS_KEY` AND the EAS environment variable (`eas env:update production --variable-name EXPO_PUBLIC_GOOGLE_MAPS_KEY --value <new key>`, then repeat for `preview`/`development` or just re-run for all three). **Do not paste the key into chat** — edit `.env.local` directly yourself, same as last time.

**Impact tonight:** I built the Places autocomplete, real map views, and toll-pricing wiring (see PROGRESS.md) but could NOT live-verify any of it against the real Google API — all of it is code-complete and unit-tested with mocks, but needs a working key before you or beta testers will see real autocomplete suggestions, a real distance calculation, or real map tiles. Everything degrades gracefully to the existing "unavailable" states in the meantime — nothing crashes.

**Original setup instructions below, for a fresh key if needed:**

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

## 8. CodeRabbit review debt — 5 of 6 stacked PRs still need `@coderabbitai full review` triggered (2 minutes)

**Why:** PR #28 (`feat/full-sweep`) grew to 184 files — over CodeRabbit's 100-file review cap — so tonight I split it into 6 stacked PRs along the existing commit history's natural boundaries (each based on the previous, so every PR's diff is just its own segment, all under the cap): #29 (80 files), #30 (44), #31 (83), #32 (38), #33 (54), #34 (26, top of the branch).

I triggered `@coderabbitai full review` on all 6. Only #29 could actually run — CodeRabbit's plan (Pro Plus) rate-limits full reviews, and #30–#34 all came back "Review limit reached... next review available in 59 minutes." This is a plan-level cooldown, not something I can bypass by retrying sooner.

**What to do:** the fastest fix is to comment `@coderabbitai full review` on #30, then #31, then #32, #33, #34, waiting ~60 minutes between each (or just do it once an hour through the day — they don't expire). Once each posts its findings, triage per the usual rule: fix real issues, dismiss noise with a one-line reason, merge only once every PR in the stack is clean (base branches first, since each depends on the one before it).

**Unblocks:** actually clearing the review debt that's been deferred since PR #8 — this is the first time it's been attempted at all this branch's size.

---

## 9. Run the demo-data seed script once `op` is responsive again (2 minutes)

**Why:** part of the beta-readiness sweep was a seed script (`scripts/seed-demo-data.mjs`) to populate a handful of demo drivers + realistic Irish-city rides so your walk-throughs and TestFlight testers have something real to see and book. The script is written and ready, but the 1Password service-account CLI (`op`) became unresponsive partway through tonight's session — `op run` calls that had been working (if slowly) earlier on started hanging indefinitely with no error, and even a bare `op whoami` timed out after 30 seconds with total silence. This looks like a connectivity issue between the service account and 1Password's backend, not a bug in the script — nothing else tonight needed `op`, so this is the one and only thing it blocked.

**What to do:** once `op` is working again (try `op whoami` — it should return instantly; if it still hangs, check your Mac's network/1Password app status, or worst case regenerate the service account token per the setup in this file's own §5), run:
```bash
op run --env-file=.secrets.env -- node scripts/seed-demo-data.mjs
```
It's idempotent (deletes any previously-seeded `@demo.htwa-app.com` accounts first), so it's safe to re-run any time to refresh the ride departure dates.

**Unblocks:** search results actually showing rides for you and testers, instead of an empty list on day one.

---

*Entries are appended as new blockers are hit; nothing above stops the build — every feature behind these has a graceful fallback.*

**Note on Stripe (updated 19 Jul):** test-mode payments are fully working end-to-end — I verified a real test-card charge with the 10% platform fee, a driver-mismatch full refund, and idempotent refund retries against the live backend tonight. Item 2 above only matters when real money starts.
