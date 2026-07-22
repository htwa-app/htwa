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

## 8. CodeRabbit review debt — 5 of 6 stacked PRs triaged, #34 remains (updated 22 Jul, overnight run 2)

**Why:** PR #28 (`feat/full-sweep`) grew to 184 files — over CodeRabbit's 100-file review cap — so it was split into 6 stacked PRs along the existing commit history's natural boundaries: #29 (80 files, ✅ triaged), #30 (44 files, ✅ triaged), #31 (83 files, ✅ triaged), #32 (38 files, ✅ triaged), #33 (54 files, ✅ triaged), #34 (26, top of the branch — the only one left).

**Status:** #29–#33 are all fully triaged — see PROGRESS.md for the detailed rundown of what was fixed vs. dismissed on each, and each PR's own comment thread for the full reasoning.
- **#32** landed 23:57:09 UTC 21 Jul, 26 findings (posted as one review-body summary, not inline comments — the format varies between PRs). 10 fixed, 16 dismissed.
- **#33** landed 00:57:44 UTC 22 Jul, 14 findings (this time as proper inline comments). 10 fixed, 4 dismissed. Real ones included the SAME notify-trigger bug as #32 but on `public.verification` instead of `driver_verifications`, and a genuinely serious one: the DB-enforced 18+ age gate's NULL-`date_of_birth` exemption was scoped to "any NULL row," not just the two specific accounts it was meant to grandfather — closed that gap live (migration `20260722030001`, verified via a rolled-back test transaction that a non-grandfathered NULL DOB now correctly fails the constraint).
- Both PRs' fixes were cherry-picked onto their own stack branch AND onto `feat/full-sweep`, so tonight's integration branch has everything too.

**What to do:** #34 was triggered twice tonight (01:24 → rate-limited, "more reviews in 19 minutes"; a retry then fired around ~01:50 and was ALSO rate-limited the same way). A further retry is scheduled ~19 minutes after that. **This is the point where the session paused for the night** — if you're reading this before it's landed, #34 is the one item left: trigger `@coderabbitai full review` on it (respecting whatever cooldown it reports), triage the same way as the other five (fix real issues, dismiss noise with a one-line reason on the PR thread), then all 6 stacked PRs are clean. Merge only once every PR in the stack is clean (base branches first, since each depends on the one before it) — **and only when you explicitly say to merge; that step is never automatic.**

**Unblocks:** actually clearing the review debt that's been deferred since PR #8 — this is the first time it's been attempted at all this branch's size.

---

## 9. ~~Run the demo-data seed script~~ — ✅ DONE (21 Jul evening)

`op` had recovered (a plain `op vault list` returned in ~4.5s, confirming the earlier hang was a transient/environmental issue, not a code bug). Re-ran the seed script successfully in under 4 seconds. **Verified directly against the live database:** 4 demo drivers (Aoife Kelly/UCD, Cian Murphy/TCD, Niamh Byrne/QUB, Sean Doyle/UCC) and 8 rides spanning **23–28 July 2026** across real Irish/NI city pairs, correct EUR/GBP currency split, 2 rides correctly flagged women-only. Search results now have real data to test against. Nothing further needed — re-run `op run --env-file=.secrets.env -- node scripts/seed-demo-data.mjs` any time to refresh the departure dates (it's idempotent).

---

*Entries are appended as new blockers are hit; nothing above stops the build — every feature behind these has a graceful fallback.*

**Note on Stripe (updated 19 Jul):** test-mode payments are fully working end-to-end — I verified a real test-card charge with the 10% platform fee, a driver-mismatch full refund, and idempotent refund retries against the live backend tonight. Item 2 above only matters when real money starts.
