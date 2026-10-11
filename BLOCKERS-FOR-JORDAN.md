# Blockers for Jordan

Things only you can do. Each entry says exactly what I need, how to get it, and what it unblocks. Everything listed here is already **stubbed gracefully in the app** — nothing crashes while these are missing.

---

## 1. Google Maps API key

**✅ RESOLVED (20 Jul, overnight run, corrected after initially being reported dead):** an earlier version of this key tested as dead (`API_KEY_INVALID` on Routes/Geocoding) after its value was accidentally printed in plaintext in the Claude Code transcript twice (a mistake, already flagged in-session) — Google's exposed-key scanning likely auto-revoked it. You then gave a replacement key. Re-tested live against `.env.local`'s current value:
- **Routes API: working.** Real Belfast→Dublin query returned `distanceMeters: 168932, duration: 7184s`.
- **Places API (New) autocomplete: working.** Real suggestions returned for a test query.
- **Geocoding API: `REQUEST_DENIED` — not enabled on the project.** Not used anywhere in the app's code (only Routes + Places are), so this doesn't block anything. Worth enabling anyway for future-proofing but not urgent.

**Also confirmed:** EAS's stored `development` environment variable has the exact same value as `.env.local` (verified via matching SHA-256 checksums, without ever printing either raw key). So the two builds kicked off in Block 7 tonight are using the correct, working key — nothing to update.

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

## 3. Twilio — 3 of 4 values wired tonight (22 Jul), one still missing: the phone number

**Update:** the credentials were already sitting in 1Password (not what I expected from the original version of this item, which assumed they hadn't been created yet) — under two items: `htwa Twilio (Account SID & Auth Token)` and `htwa Twilio API (SID & Secret key)`. I used the **Restricted API Key** (SID + secret, scoped to Messages Create+Read) for authentication rather than the master Auth Token — same principle as never using a service-role key where a scoped one will do: a leaked/rotated API key can only send/read messages, never touch billing or account settings. `supabase/functions/send-tracking-alert/index.ts` and its Supabase secrets (`TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY_SID`, `TWILIO_API_KEY_SECRET`) are updated and deployed to match.

**Found and fixed a real bug in this file's own previously-documented command** while doing this: `op run --env-file=.secrets.env -- npx supabase secrets set KEY="$VAR"` silently sets **empty-string secrets** — `"$VAR"` gets expanded by the *outer* shell before `op run` ever injects the variable into its child process, so the command that reaches `supabase secrets set` has already substituted an empty string. Confirmed this by checking the secret digests after setting them (all three came back as the well-known SHA-256 hash of an empty string). **The fix:** wrap in a nested shell so the `$VAR` expansion happens inside the process that actually has the injected environment:
```bash
op run --env-file=.secrets.env -- sh -c 'npx supabase secrets set \
  KEY1="$KEY1" KEY2="$KEY2" \
  --project-ref adrwtjlphjrnrrqjkbfk'
```
Re-ran it this way and confirmed via `supabase secrets list` that all three digests are now distinct/non-empty. **If you ever set a Supabase secret this way yourself, use the `sh -c '...'` wrapper, not the bare form** — this exact bug pattern is worth remembering.

**What's still missing:** a Twilio phone number (`TWILIO_FROM_NUMBER`) — I searched both 1Password items, `.env.local`, and the already-set Supabase secrets, and it isn't stored anywhere. **What to do:** Twilio Console → Phone Numbers → Manage → **Buy a number** (or use the free trial number if you haven't already) → confirm it has SMS capability → copy it in E.164 format (e.g. `+353...`). Add it to 1Password (either existing Twilio item's notes field, or a new one) and tell Claude — wiring it in is then a 2-minute repeat of the same `secrets set` pattern above, no code changes needed.

**Unblocks:** SMS alerts to nominated contacts (SOS, off-course, journey-complete) for contacts who don't have the htwa app. Until the phone number lands: in-app alerts to contacts who ARE htwa users work already; SMS returns a graceful "unavailable" and the app records the alert in the audit table regardless — the function is deployed and ready, just missing this one value.

---

## 4. Apple Developer + Google Play accounts (push notifications & store release)

### 4a. Google Play — ✅ DONE (confirmed 21 Jul 2026)
The Play publisher service account key showed up at `~/Documents/HTWA/google-service-account.json` (`htwa-play-publisher@htwa-502918.iam.gserviceaccount.com`) — already gitignored, never committed, confirmed valid JSON. I've wired it into `eas.json`'s `submit.production.android` block (`serviceAccountKeyPath` + `track: "internal"`), so `eas submit --platform android --profile production` is now configured to actually run. **Not yet actually submitted anything** — wiring the config is different from a real submission, which is a store-facing action I'd ask before doing. This unblocks FCM push credentials too (`eas credentials` can now use the same Play Console access) — not yet wired, just unblocked.

### 4b. Apple Developer — still open
**I need:** an Apple Developer Program membership ($99/yr), under hello@htwa-app.com.

**Get it by:** https://developer.apple.com/programs/enroll → enroll as an organisation (needs a D-U-N-S number — start this early, it can take days) or as an individual to move faster. Tell Claude when done — Claude will wire the App Store Connect API key + APNs push credentials through EAS.

**Unblocks:** real push notifications on iOS (currently local-notification delivery only — works while the app is open/backgrounded, can't reach a closed app), TestFlight distribution, and the eventual App Store launch. This is the actual reason a real-iPhone build (for TestFlight or a QA tester) still can't happen — nothing on the code/build side substitutes for this. Longest lead-time item outstanding — worth starting now if enrolling as an organisation (D-U-N-S lookup can take days).

### 4c. FCM V1 push credential (Android) — 🔴 still needs 2 minutes at a real terminal; **the code side is now fully built (22 Jul)**

The Firebase service account key is confirmed present at `firebase-service-account.json` (valid, gitignored, `firebase-adminsdk-fbsvc@htwa-502918.iam.gserviceaccount.com`) — that part's done. But **attaching it via `eas credentials -p android` needs a real interactive terminal**, and my tool environment doesn't have one: `eas credentials` is a full-screen, arrow-key-navigated menu (not a simple yes/no prompt), and it immediately errors ("stdin is not readable") the moment it isn't run from an actual terminal window. Piping text into it doesn't help — it needs real keypresses, not just readable input.

I also deliberately didn't try to fake my way through it. That same menu is where the **Android keystore/signing key** lives too — the credential that, if regenerated or touched wrong, would break every existing install's ability to receive future updates (a real, hard-to-reverse mistake). Blindly guessing menu positions to reach the FCM option risked landing on the wrong item first. Not worth the risk for something that takes 2 minutes done correctly by a person looking at the screen.

**What I need from you:** open Terminal.app on this Mac, `cd ~/Documents/HTWA`, run:
```
npx eas-cli credentials --platform android
```
When prompted for a build profile, pick `production`. In the menu that appears, look for something like **"Push Notifications: Manage your FCM Api Key"** (or similarly worded — exact text may vary by CLI version) and select it, then choose the option to set up an FCM V1 service account key and give it the path `./firebase-service-account.json` when asked. Say the word once it's done (or if you hit anything confusing — screenshot it and I'll tell you exactly what to click).

**Update 22 Jul — the send-side is now built, so this credential is the ONLY thing left blocking real Android push delivery:**
- Migration `20260722010001_push_tokens.sql` adds `profiles.expo_push_token`, applied to the live DB.
- `hooks/usePushTokenRegistration.ts` (mounted in the tabs layout, same place as the realtime notifications hook) registers the device's Expo push token on sign-in and persists it via `services/notifications.ts`'s new `savePushToken()`.
- A new Edge Function, `send-push` (deployed, health-checked — see item 8/PROGRESS.md), looks up the target user's stored token and relays through Expo's push API (`https://exp.host/--/api/v2/push/send`) — Expo forwards to FCM/APNs using whatever credential is attached via `eas credentials`, so this function never talks to Firebase directly.
- Wired into all four events named in the original ask: new booking request (`app/booking-request.tsx` → pushes the driver), accept/decline (`services/chat.ts` `acceptBooking` / `services/bookings.ts` `declineBooking` → pushes the passenger), and SOS/off-course (`services/tracking.ts` `raiseAlert` → pushes the nominated contact, but **only when that contact is an htwa user** with `journey_contacts.contact_user_id` set — a contact who's just a phone number still only gets the SMS channel, which is unaffected).
- Local notifications (`hooks/useRealtimeNotifications.ts`) are untouched and still fire for the foregrounded-app case; the push path is purely additive for backgrounded/killed-app delivery.
- **What this means practically:** until the FCM credential above is attached, `send-push` will still run and log a delivery failure for Android recipients (Expo will reject the send with no valid FCM credential behind it) — the booking/chat/SOS actions themselves are unaffected either way, since push is always a secondary, logged-not-surfaced effect per CLAUDE.md §12. Once you attach the credential, Android push delivery should start working with no further code changes. **iOS push still separately needs Apple Developer enrolment (item 4b)** — that's a second, independent credential, not something this Android step unblocks.
- Not yet tested on a real device (no physical Android/iOS hardware in this session — see Task 5's honest build note in PROGRESS.md).

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

## 8. CodeRabbit review debt — ✅ ALL 6 stacked PRs triaged (22 Jul, overnight run 2)

**Why:** PR #28 (`feat/full-sweep`) grew to 184 files — over CodeRabbit's 100-file review cap — so it was split into 6 stacked PRs along the existing commit history's natural boundaries: #29 (80 files), #30 (44 files), #31 (83 files), #32 (38 files), #33 (54 files), #34 (26 files, top of the branch). All six now fully triaged.

**Status — every PR's findings verified against current code, fixed or dismissed with a reason on its own thread:**
- **#29, #30, #31** — triaged earlier in the session (see PROGRESS.md for the full rundown of each).
- **#32** landed 23:57:09 UTC 21 Jul, 26 findings (posted as one review-body summary, not inline comments — the format varies between PRs). 10 fixed, 16 dismissed.
- **#33** landed 00:57:44 UTC 22 Jul, 14 findings (inline comments this time). 10 fixed, 4 dismissed. Real ones included the SAME notify-trigger bug as #32 but on `public.verification` instead of `driver_verifications`, and a genuinely serious one: the DB-enforced 18+ age gate's NULL-`date_of_birth` exemption was scoped to "any NULL row," not just the two specific accounts it was meant to grandfather — closed that gap live (migration `20260722030001`, verified via a rolled-back test transaction that a non-grandfathered NULL DOB now correctly fails the constraint).
- **#34** landed 01:54:23 UTC 22 Jul (after two earlier rate-limited attempts — third trigger worked), 4 findings — all noise: 3 were the same "inline safe-area padding should be StyleSheet-managed" suggestion split across ~25 files (a deliberate, already-documented pattern from the earlier app-wide safe-area audit — CodeRabbit's own label called the refactor a "Heavy lift" for a purely cosmetic preference), and 1 was a stale "add a PROGRESS.md entry" nag that predated tonight's actual updates. All 4 dismissed, zero code changes needed.
- Every PR's fixes were cherry-picked onto both its own stack branch AND `feat/full-sweep`, so tonight's integration branch (and the EAS test builds built from it) has everything.

**What's left:** nothing to trigger or triage — all 6 are clean. The only remaining step is the one that was never automatic: **merging.** When you're ready, the plan (per CLAUDE.md's standing merge flow) is to rebase each stack branch onto `main` individually, starting with `stack/01`, in order — never a bulk merge. That's explicitly your call to make and start, not something done autonomously.

**Unblocks:** actually clearing the review debt that's been deferred since PR #8 — this is the first time it's been attempted at all this branch's size.

---

## 9. ~~Run the demo-data seed script~~ — ✅ DONE (21 Jul evening)

`op` had recovered (a plain `op vault list` returned in ~4.5s, confirming the earlier hang was a transient/environmental issue, not a code bug). Re-ran the seed script successfully in under 4 seconds. **Verified directly against the live database:** 4 demo drivers (Aoife Kelly/UCD, Cian Murphy/TCD, Niamh Byrne/QUB, Sean Doyle/UCC) and 8 rides spanning **23–28 July 2026** across real Irish/NI city pairs, correct EUR/GBP currency split, 2 rides correctly flagged women-only. Search results now have real data to test against. Nothing further needed — re-run `op run --env-file=.secrets.env -- node scripts/seed-demo-data.mjs` any time to refresh the departure dates (it's idempotent).

---

## 10. Sign in with Apple + Apple Pay — Apple Developer steps (needs item 4b first)

**Code is done** (branch `feat/payments-auth`, Stages 89–90). What's left is Apple-side set-up. You need an active Apple Developer Program membership first (item 4b).

**A. Register the capabilities on the app's ID**
1. https://developer.apple.com/account → **Certificates, Identifiers & Profiles** → **Identifiers**.
2. Open **`com.htwa.app`** (create it as *App IDs → App → Explicit* with that exact bundle ID if it isn't there).
3. Tick **Sign In with Apple** (Enable as a primary App ID) and **Apple Pay Payment Processing**. Save. (You'll attach the merchant ID to Apple Pay in step B.3.)

**B. Register the merchant ID (Apple Pay)**
1. **Identifiers** → blue **+** → choose **Merchant IDs** → Continue.
2. Description `htwa`, Identifier **`merchant.com.htwa`** — must match exactly; it's already in `app.config.js`. Register.
3. Back on the `com.htwa.app` App ID → **Apple Pay Payment Processing → Edit** → tick `merchant.com.htwa` → Save.

**C. Connect Stripe to Apple Pay (the payment-processing certificate)**
1. Stripe Dashboard (**test mode first**) → Settings → Payments → **Apple Pay** → under iOS certificates choose **Add new application** → download the CSR (`.certSigningRequest`). Stripe's guide: "Set up Apple Pay" → "iOS".
2. Apple Developer → Identifiers → Merchant IDs → `merchant.com.htwa` → **Apple Pay Payment Processing Certificate → Create Certificate** → upload Stripe's CSR → download the `.cer`.
3. Upload that `.cer` back in Stripe. Repeat once in live mode before launch.

**D. Turn the Apple provider on in Supabase**
1. https://supabase.com/dashboard/project/adrwtjlphjrnrrqjkbfk/auth/providers → **Apple** → Enable.
2. **Client IDs:** `com.htwa.app` (the bundle ID — that's the audience of the token the native flow produces). Leave **Secret Key** empty: only the browser/OAuth flow needs it and this app doesn't use that flow. Save.

**E. Next iOS build:** for a **real iPhone** build, EAS will sync the Sign In with Apple + Apple Pay capabilities from `app.config.js` onto the App ID (needs the Apple login EAS asks for). Simulator builds need none of this.

**What you can / can't test before this is done**
- Sign in with Apple: the button works in the iOS **Simulator** as long as the simulator is signed into an Apple ID (Settings → top of the list) — *but* signing in will fail until step D is done ("not available yet" appears if Supabase reports the provider disabled).
- Apple Pay: needs steps A–C and, reliably, a **real iPhone with a card in Wallet**. Until the merchant ID exists the sheet simply won't offer Apple Pay; card entry always works.
- Google Pay: real Android device only; no setup needed for the test environment (it switches on automatically with a `pk_test_` key). Going live needs Google's production access (Google Pay & Wallet Console) — later.

---

## 11. Sign in with Google — Google Cloud OAuth clients

**Code is done** (Stage 91). Until the two client IDs exist the Google button honestly says "Google sign-in isn't available yet".

1. https://console.cloud.google.com → pick the htwa project → **APIs & Services → OAuth consent screen**: *External*, app name `htwa`, support + developer email `hello@htwa-app.com`, scopes `openid`, `email`, `profile`. Save. (While in "Testing", add your own Google accounts as test users.)
2. **APIs & Services → Credentials → + Create credentials → OAuth client ID**, three times:
   - **Web application** — name `htwa web (Supabase)`. Authorised redirect URI: `https://adrwtjlphjrnrrqjkbfk.supabase.co/auth/v1/callback`. Create → note the **Client ID** and **Client secret**.
     **The secret goes straight into 1Password** (HTWA vault, new item e.g. `htwa google oauth web`) **— never paste it into chat or any file.** The Client ID is not secret.
   - **iOS** — name `htwa iOS`, bundle ID `com.htwa.app`. Create → note the **Client ID** (there is no secret).
   - **Android** — name `htwa Android`, package name `com.htwa.app`, **SHA-1** of the signing key: run `npx eas-cli credentials --platform android` → the Keystore summary shows the SHA1 fingerprint (it's public, not a secret). Add the SHA-1 of any other keystore you sign with later (e.g. Play App Signing).
3. **Turn the Google provider on in Supabase:** https://supabase.com/dashboard/project/adrwtjlphjrnrrqjkbfk/auth/providers → **Google** → Enable.
   - **Client IDs:** the web ID, the iOS ID and the Android ID, comma-separated (web first).
   - **Client Secret:** the web client's secret (copy it out of 1Password).
   - **Skip nonce checks: ON.** Required — the Google sign-in library can't pass a nonce, so Supabase would otherwise reject every token.
   Save.
4. Set the two env vars from item 12, then make a **new native build** (the iOS client ID becomes an Info.plist URL scheme at build time).

---

## 12. Environment variable names the code expects

| Variable | Used by | Value |
|---|---|---|
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | `services/socialAuth.ts` (Google `webClientId`; also the idToken audience) | the **web** OAuth client ID (`…apps.googleusercontent.com`) |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | `services/socialAuth.ts` **and** `app.config.js` (derives the iOS URL scheme `com.googleusercontent.apps.…`) | the **iOS** OAuth client ID |

Both are public client IDs, not secrets (the Web client **secret** lives only in Supabase + 1Password — never in the app or an env var).
- Put them in `~/Documents/HTWA/.env.local` (edit the file yourself) **and** in the EAS environment via the **EAS dashboard** (expo.dev → project → Environment variables, for `development`, `preview`, `production`) — not a command-line `--value` flag.
- No Android-specific variable: Android uses the web ID plus the Android OAuth client + SHA-1 registered in step 11.2.
- If the iOS ID is missing at build time, `app.config.js` simply leaves the Google plugin out (it throws without a scheme) and the button shows "not available yet".
- Already in place from before: `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_GOOGLE_MAPS_KEY`.

---

## 13. 🔴 Decision needed — a driver is currently paid MORE than their cost share (found in live test mode, 23 Oct)

I ran a real test-mode payment end to end and the numbers don't match the fixed pricing model in CLAUDE.md §12:
- Driver cost share **€10.00** → passenger pays **€13.00** (10.00 + 10% service charge 1.00 + booking fee 2.00) ✅ correct.
- But `create-payment-intent` sets the platform's `application_fee_amount` to **10% of the total = €1.30**, so the driver's Connect account receives **€11.70 — €1.70 more than their €10.00 cost share.** htwa keeps €1.30 instead of the €3.00 (service charge + booking fee) the model says it should.
- That breaks "drivers can never profit / total recovered is capped at cost" — the legal wedge of the whole product — even though it's test mode today. Evidence: Stripe test PaymentIntent `pi_3UPNTqPzPTSO57bW0kUrsgWz` (amount 1300, driver payout 11.70).
- The receipt screens are also inconsistent with the model: `app/payment.tsx` and `app/payment-confirmation.tsx` show "Platform fee (10%)" and derive "Journey cost" as total − 10% (€11.70 here, not €10.00).

**Proposed fix (NOT applied — you said not to change the charge model, and this changes what money moves and what receipts say):** set `application_fee_amount` = total − (driver cost share × seats), i.e. exactly service charge + booking fee, so the driver gets precisely their cost share; and show the real breakdown (cost share / service charge / booking fee) on the payment + receipt screens. Destination charges stay as they are. Tell me "apply the fee fix" and I'll do it with tests and a live re-check.

---

## 14. Supabase paused itself — keep it awake before beta

When I started this run the project was **`INACTIVE`** (Supabase's free tier pauses a project after about a week without activity), so the app, every build and every test would have failed to connect. I **restored it on 11 Oct** (Management API `POST /v1/projects/{ref}/restore`; it came back healthy in a few minutes). It will pause again if left idle. **Before beta: upgrade the project to Pro** (Dashboard → Settings → Billing / Compute & Disk — Pro projects don't auto-pause), or accept re-restoring it from the dashboard each time.

---

## 15. `htwa-app.com/privacy` didn't exist — page now generated, publishes on merge

The first-contact SMS to a nominated contact (Article 14 — Stage 92) links to **htwa-app.com/privacy** as the full notice, and the policy itself says that's where it lives — but the URL returned **404** (and `/track` does too until this branch is merged, because Netlify serves `website/` from `main`).
- I added `website/privacy/index.html`, **generated from `legal/privacy-policy.md`** (`node scripts/build-privacy-page.js`; a test fails if it goes stale; internal ADVISER NOTE comments are stripped; marked `noindex`).
- **Your call:** merging to `main` publishes the **draft** policy (still marked "PLACEHOLDER — PENDING ADVISER REVIEW") at that URL. Either merge as-is (contacts get a working link; the draft marker is visible) or hold the website bit back until the adviser signs off. Until it's live, contacts who tap the link get a 404.
- Separately flagged for the adviser (ADVISER-BRIEFING item 10): a nominated contact who is **never** alerted never receives the notice, though we hold their name and number — Article 14's one-month outer limit may need a notice at nomination time.

---

## 16. Demo journeys are all in the past

The seeded demo rides depart 23–28 July 2026, so search now shows nothing bookable (they've departed). Refresh them (idempotent — only touches the `demo.` accounts):
```bash
cd ~/Documents/HTWA && op run --env-file=.secrets.env -- node scripts/seed-demo-data.mjs
```

---

*Entries are appended as new blockers are hit; nothing above stops the build — every feature behind these has a graceful fallback.*

**Note on Stripe (updated 19 Jul):** test-mode payments are fully working end-to-end — I verified a real test-card charge with the 10% platform fee, a driver-mismatch full refund, and idempotent refund retries against the live backend tonight. Item 2 above only matters when real money starts.
