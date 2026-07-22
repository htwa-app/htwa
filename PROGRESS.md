# htwa — Session Progress Log

Entries are added at the top. Most recent session is always first.

---

## 22 July 2026 — Overnight run: legal fixes, PR #32 triaged, Edge Functions deployed, push notifications wired, fresh test builds

**Top-of-file summary for Jordan:**

- **Ready to test now:** Full push-notification wiring (booking request/accept/decline + SOS/off-course alerts, backgrounded/killed-app delivery via a new `send-push` Edge Function — see below for the one manual step still needed for Android), all 7 payment/tracking Edge Functions deployed and health-checked live, Twilio SMS wired via a Restricted API Key, GDPR-compliant legal doc fixes (retention balancing, pseudonymisation terminology, Article 14 nominated-contact notice), and a batch of real bug fixes from PR #32's CodeRabbit review (see "Task 2" below). Two fresh EAS `development`-profile builds are ready to install — see "Task 5" below for exact links and what is/isn't functional in them.
- **Still blocked, and why:**
  - **Android push delivery** needs Jordan to run `eas credentials -p android` at a real terminal (2 minutes) to attach the already-present Firebase service account key as the FCM V1 credential — full steps in `BLOCKERS-FOR-JORDAN.md` item 4c. The code path is complete and deployed either way; without this step, sends will just fail silently (logged, not surfaced) rather than reaching a device.
  - **iOS push** additionally needs Apple Developer Program enrolment (`BLOCKERS-FOR-JORDAN.md` item 4b) — unrelated to tonight's work, still the longest-lead-time item outstanding.
  - **Twilio SMS** is fully wired except one value: `TWILIO_FROM_NUMBER` (a purchased Twilio phone number) — searched exhaustively, genuinely absent from both 1Password items and `.env.local`. SMS alerts degrade gracefully (`{ok:false, reason:'unavailable'}`) until it's added.
  - **PR #33 and #34** still need their CodeRabbit reviews triggered/triaged — #33 was triggered tonight but hit CodeRabbit's rate limit; a retry is scheduled and this will continue past this session if needed (see "Task 2").
  - **Nothing merged to `main`** — per standing instruction, every fix tonight lives on its own branch (or the stacked PR branches), ready for review. Merging stays explicitly Jordan's call.
- **To install both test builds:** see "Task 5" below for the exact `eas build:view` links, or open them directly from [expo.dev/accounts/htwa-app/projects/htwa/builds](https://expo.dev/accounts/htwa-app/projects/htwa/builds). Both are `development`-profile builds (iOS Simulator + Android APK) built from a local-only integration branch containing everything from all 6 stacked PRs plus every fix from tonight.

---

### Task 1 — Legal doc fixes (GDPR compliance) — ✅ complete

Two real findings from PR #30's CodeRabbit review, plus one item flagged as still-open in that PR's own dismissal notes, needed actual legal drafting (explicitly authorised for tonight, distinct from the two items that stay pending-adviser-review):

1. **Retention language for in-app messages/safety records** (`legal/privacy-policy.md` §7): rewrote "retained permanently" into a proper legitimate-interests balancing assessment — retained for as long as needed for safeguarding, an active dispute, or a legal/regulatory request; access limited to staff handling that specific matter; reviewed at account deletion and periodically otherwise; disclosed only where legally required; erasure/objection available per record once no live reason remains.
2. **Pseudonymisation vs. anonymisation terminology** (`legal/privacy-policy.md` §7A, `legal/terms-of-service.md` §8A): both documents previously mixed the two terms for the same account-deletion-retained data. Since retained rows stay re-linkable (exactly for the disputes/legal-request scenario above), "pseudonymised" is the accurate term under GDPR — used consistently now, with rights wording that matches (pseudonymised data stays personal data, unlike true anonymous data).
3. **Article 14 nominated-contact notice** (new `legal/privacy-policy.md` §4A): the nominated contact is a third party who hasn't directly consented — drafted what's processed about them, the legitimate-interests basis, retention, and their objection/opt-out route, published at htwa-app.com/privacy. **Honest engineering gap flagged, not silently left**: the app doesn't yet send a distinct first-contact notice separate from the tracking-link SMS itself — noted as follow-up work in `legal/ADVISER-BRIEFING.md`, not conflated with the legal drafting.

Left untouched, exactly as instructed: Article 9 selfie-matching legal basis, and the 24h no-refund "provisional" framing — both still pending-adviser-review, not drafted tonight.

`constants/legalDocs.ts` regenerated to stay byte-identical with the `.md` sources (`__tests__/unit/legalDocs.test.ts`: 4/4 passing). `legal/ADVISER-BRIEFING.md` updated to mark these three items "drafted 22 Jul" with a narrower confirmation question each, while keeping the two genuinely-open items listed as pending. Posted a correction comment on PR #30 acknowledging these two findings were missing from that PR's original triage summary despite the commit claiming full coverage.

**Files:** `legal/privacy-policy.md`, `legal/terms-of-service.md`, `constants/legalDocs.ts`, `legal/ADVISER-BRIEFING.md`. Commit `64e6e0b`.

---

### Task 2 — CodeRabbit review debt: PR #32 triaged (4/6 done), #33/#34 in progress

**PR #32** (`stack/04-driver-alert-fix`, 38 files): review landed at 23:57:09 UTC with 26 actionable comments — posted this time as one review-body summary rather than per-line inline comments (the format varies; worth knowing for next time). Verified every finding against current code:

**Fixed (10 real findings):**
- **`driver_verifications` notify trigger silently missed resubmissions** — it was filtered on `UPDATE OF status`, but the resubmission upsert never includes `status` in its column list (a separate BEFORE trigger resets it to `pending`), so Postgres's column-filtered trigger never fired on that path — Jordan was missing exactly the "someone resubmitted after rejection" notifications. Fixed by dropping the column filter (new migration `20260722020001`, applied to the live DB) and trimming the driver's email out of the ntfy payload (PII reduction, no new credentials needed).
- **`driver_verifications` photo paths** — added ownership CHECK constraints (must be scoped under their own `user_id`); verified the one existing row already conforms before adding.
- **`services/driverVerification.ts`** — orphaned-file cleanup now runs on ANY upload failure, not just the final upsert failure (previously a successful licence upload followed by a failed selfie upload left the licence file orphaned in storage forever).
- **`app/driver-verification.tsx`** — `load()` now catches a thrown rejection instead of silently showing the normal empty-form UI.
- **`app/offer-ride.tsx`** — a verification-check failure no longer surfaces as the wrong "pricing details" banner (which never even ran and had no working retry) — it gets its own banner with a real retry action.
- **`app/offer-ride-confirm.tsx`** — a failed nominated-contact write now retries once, then shows a blocking alert if it still fails, instead of only a console log — a live ride with no safety contact is exactly the gap this feature exists to prevent. Also added two missing `accessibilityLabel`s.
- **`app/settings.tsx`** — account deletion no longer silently swallows a local cache-cleanup failure; retries the AsyncStorage wipe specifically (the expected part — `auth.signOut()` failing because the account's already gone server-side — is separated from the part that actually matters, leaving cache residue for the next sign-in).
- **`services/routes.ts` + `components/JourneyMap.tsx`** — Maps key selection now picks the first ACTUALLY usable key across both accepted env var names, instead of `??` picking a SET-but-placeholder primary key and never trying the fallback.
- **`website/track/index.html`** — removed the query-string token fallback for the live-tracking link; fragment-only now, so the token can't leak via server access logs or Referer headers.
- Quick ones: safe-area-aware iOS sheet padding + named backdrop-opacity constant (`DateTimeField.tsx`), a hardcoded string extracted to a constant (`booking-request.tsx`), a stale file-path reference fixed in this file's own inventory, both Maps env vars isolated in `routes.test.ts` (was only isolating the fallback — added 3 new tests for the exact bug above), a leaking `console.warn` spy restored in `imagePicker.test.ts`.

**Dismissed (16, with reasons on the PR thread)** — highlights: the selfie-matching legal-basis finding is the same already-tracked Article 9 item, explicitly deferred; a `type`→`interface` suggestion on `DriverVerificationRow` matches the exact false-positive pattern already hit once tonight (breaks `Record<string, unknown>` assignability, degrading `supabase.from()` to `never`); the ntfy "replace with an authenticated service" half of one finding stays pending Jordan's Resend API key (did the PII-reduction half instead); a few cosmetic refactors and lower-priority website-page accessibility/dedup items deferred for time. Full list on the PR #32 thread.

The fix (`8db7133` originally, applied as `2ac9134`/`2314490` on `stack/04` after resolving one merge conflict, `42bee71` on `feat/full-sweep`) surfaced a real cross-stack gap: `stack/04` predates the "Block 3 safe-area audit" work that added a `react-native-safe-area-context` Jest mock, so the new safe-area-aware fix in `DateTimeField.tsx` needed that mock pulled forward too (`__mocks__/react-native-safe-area-context.js`), or its own test and `SearchScreen`'s (which renders it) would fail with "No safe area value available." Also found and removed two stale, untracked ` 2.tsx` worktree-duplicate files (`app/booking-request 2.tsx`, `app/booking-requests/[rideId] 2.tsx`) that were causing false `tsc` errors — matches the exact junk-file pattern already documented in this project's lessons-learned.

tsc --noEmit: 0 errors. Jest: 1227/1227 tests, 85/85 suites (on `feat/full-sweep`); 1164/1164 tests, 83/83 suites (on `stack/04-driver-alert-fix`, which doesn't yet have tonight's other, unrelated work).

**PR #33** (`stack/05-maps-followthrough`, 54 files): triggered `@coderabbitai full review` at 01:24 UTC. Came back rate-limited — the trigger acknowledgment read "Full review finished... more reviews in 19 minutes," which is the SAME misleading wording that turned out to mean rate-limited on PR #32's first attempt tonight. A retry is scheduled for ~01:45 UTC (verified via the GitHub API before concluding rate-limited, not just from elapsed time). **PR #34 not yet triggered** — waiting on #33 to genuinely land first, per the one-at-a-time/respect-the-cooldown instruction.

**Nothing merged to `main` or any stack branch** — every fix tonight lives on its own branch or the stack it belongs to, explicitly stopping short of merging per the standing rule.

**Files:** `supabase/migrations/20260722020001_driver_verification_hardening.sql` (new), `services/driverVerification.ts`, `app/driver-verification.tsx`, `app/offer-ride.tsx`, `app/offer-ride-confirm.tsx`, `app/settings.tsx`, `utils/signOut.ts`, `services/routes.ts`, `components/JourneyMap.tsx`, `components/DateTimeField.tsx`, `website/track/index.html`, `app/booking-request.tsx`, `__mocks__/react-native-safe-area-context.js` (new), `__tests__/unit/{OfferRideScreen,OfferRideConfirmScreen,routes,imagePicker}.test.ts(x)`, this file. Commits: `8db7133`/`2ac9134`/`2314490` (stack/04), `42bee71` (feat/full-sweep), `d51283e` (BLOCKERS update).

---

### Task 3 — Deploy the Edge Functions — ✅ complete

All 7 Edge Functions (`create-connect-account`, `create-payment-intent`, `create-setup-intent`, `create-refund`, `get-transactions`, `send-tracking-alert`, `delete-account`) — code-complete since PR #30/#31's triage but never actually deployed — are now live on project `adrwtjlphjrnrrqjkbfk`, deployed one at a time via `op run --env-file=.secrets.env -- npx supabase functions deploy <name> --project-ref adrwtjlphjrnrrqjkbfk`. Each confirmed with a two-tier health check: an unauthenticated request reaches the platform gateway (`UNAUTHORIZED_NO_AUTH_HEADER`), and a request bearing the real anon key (valid signature, but not a genuine user session) reaches the function's OWN `getAuthedUser` logic and returns THIS codebase's own `{"error":"Unauthorized"}` — proof the deployed code actually executes, not just that the deploy command exited 0.

**Twilio wired via a Restricted API Key** (least-privilege — scoped to Messages Create+Read, not the master Auth Token): found the credential in 1Password under "htwa Twilio API (SID & Secret key)" (the user's described exact title didn't match what actually existed, so it was located by matching credential FORMAT — a 34-char `SK...` key — to the described type instead). `send-tracking-alert/index.ts` now reads three separate values (`TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY_SID`, `TWILIO_API_KEY_SECRET`) since Twilio's REST API always needs the real Account SID in the URL path regardless of which credential authenticates the request.

**A serious bug was found and fixed in the process**: `op run --env-file=.secrets.env -- npx supabase secrets set KEY="$VAR"` silently sets EMPTY-STRING secrets — `"$VAR"` gets expanded by the OUTER shell (which never has the variable) before `op run`'s child process is ever spawned. Confirmed via `supabase secrets list`'s digest showing `e3b0c4429...` (the well-known SHA-256 hash of an empty string) across all three Twilio secrets after the first attempt. Fixed by wrapping in a nested shell so expansion happens where the variable actually exists: `op run --env-file=.secrets.env -- sh -c 'npx supabase secrets set KEY="$VAR" ... --project-ref <ref>'`. This exact broken pattern had ALSO been documented as "correct" in this file's own earlier text — corrected there too, so a future session following those instructions doesn't hit the same silent failure.

**Still missing:** `TWILIO_FROM_NUMBER` (a purchased Twilio phone number) — searched both 1Password Twilio items, `.env.local`, and the already-set Supabase secrets; genuinely absent. `send-tracking-alert` degrades gracefully (`{ok:false, reason:'unavailable'}`) until it's added.

**Files:** `supabase/functions/send-tracking-alert/index.ts`, `.secrets.env` (gitignored — pointers only), `BLOCKERS-FOR-JORDAN.md`. Commit `bd81353`.

---

### Task 4 — Push notifications wired end-to-end — ✅ complete (one manual step remains)

Per PROGRESS.md's own prior honest gap report, `services/notifications.ts` only fired local notifications, no push-token storage existed, and no Edge Function sent a real push. Built tonight:

- **Migration `20260722010001_push_tokens.sql`** (applied to the live DB): adds `profiles.expo_push_token`.
- **`hooks/usePushTokenRegistration.ts`** (mounted alongside the existing realtime-notifications hook in the tabs layout): registers the device's Expo push token on sign-in and persists it via `services/notifications.ts`'s new `savePushToken()`.
- **New Edge Function `send-push`** (deployed, health-checked the same two-tier way as Task 3): looks up the target user's stored token and relays through Expo's push API (`https://exp.host/--/api/v2/push/send`) — Expo forwards to FCM/APNs using whatever credential is attached via `eas credentials`, so this function never talks to Firebase/Apple directly.
- **Wired into all four events named in the original ask**: new booking request → pushes the driver (`app/booking-request.tsx`); accept/decline → pushes the passenger (`services/chat.ts` `acceptBooking`, `services/bookings.ts` `declineBooking`); SOS/off-course → pushes the nominated contact (`services/tracking.ts` `raiseAlert`), but **only when that contact is an htwa user** with a stored token — a contact who's just a phone number still only gets the existing SMS channel.
- **Local notifications are untouched** and still fire for the foregrounded-app case; the push path is purely additive for backgrounded/killed-app delivery.
- Every push send is a secondary effect fired after its primary DB write already committed (CLAUDE.md §12): failures are logged, never surfacing to the user or blocking navigation.

**Manual step still needed** (documented in detail in `BLOCKERS-FOR-JORDAN.md` item 4c): Jordan needs to run `eas credentials -p android` at a real terminal to attach the already-present Firebase service account key as the FCM V1 credential — this specific step needs real interactive keypresses in a menu that also manages the Android signing key, so it wasn't something to script blindly. Until it's done, Android push sends will fail silently (logged) rather than reach a device; the code path itself is complete either way.

tsc --noEmit: 0 errors. Jest: 1222/1222 tests, 85/85 suites (immediately after this task, before PR #32's fixes were added).

**Files:** `supabase/migrations/20260722010001_push_tokens.sql` (new), `supabase/functions/send-push/index.ts` (new), `hooks/usePushTokenRegistration.ts` (new), `services/notifications.ts`, `app/booking-request.tsx`, `services/chat.ts`, `services/bookings.ts`, `services/tracking.ts`, `app/(tabs)/_layout.tsx`, `types/database.ts`, `BLOCKERS-FOR-JORDAN.md`, plus new/updated tests for all of the above. Commit `0158f96`.

---

### Task 5 — Integration branch + fresh EAS test builds — ✅ complete

**No merge was actually needed**: all 6 stacked PR branches (`stack/01` through `stack/06`) turned out to already be ancestors of `feat/full-sweep`'s own HEAD (confirmed via `git merge-base --is-ancestor` for each) — the stacking process means `stack/06` already contains everything from `01`–`05`, and tonight's Tasks 1/3/4 were committed directly onto `feat/full-sweep`, so that branch was already the full superset requested. `test/overnight-integration` was created as a direct, local-only pointer to that commit (never pushed) rather than an unnecessary no-op merge.

`tsc --noEmit`: 0 errors. Full Jest suite: 1227/1227 passing, 85/85 suites — confirmed independently on this branch, not just inherited from `feat/full-sweep`.

**Two EAS `development`-profile builds, rebuilt after PR #32's fixes landed — both confirmed FINISHED:**
- **iOS Simulator build page:** https://expo.dev/accounts/htwa-app/projects/htwa/builds/dd47a5f1-2b85-4e64-a4a2-817338c4331c
  Direct download (drag onto a booted simulator, or `xcrun simctl install booted <path-after-unzipping>`): https://expo.dev/artifacts/eas/2D_0pWmyiMYY8TS3a2B1DXVMM8vt82T6I3kp-Pg9ByM.tar.gz
- **Android APK build page:** https://expo.dev/accounts/htwa-app/projects/htwa/builds/cbefb5cf-2cab-4da8-9b13-a31aa1e4b47c
  Direct download (install via `adb install <path>.apk` or by opening the link on the device): https://expo.dev/artifacts/eas/FB3TiG96zbczY0V2y0JlIrVZ4ruu_y3ROSlHbeQMgl4.apk

(An earlier pair of builds — iOS `0e857d3d`, Android `bec045a7` — completed first but predate the PR #32 fixes; use the links above instead.)

**What's functional in this build, plain-English:**
- **Stripe**: test-mode only (real `sk_test_…`/publishable test key) — no real money moves, this is expected pre-launch.
- **Maps**: the Google Maps key is confirmed live and working (Routes + Places APIs) — auto distance calculation and the live map should both work. If either shows an "unavailable" state, that's worth flagging back — it would mean EAS's stored secret drifted from `.env.local`, not a code bug (their checksums matched at last check).
- **Push notifications**: won't fire on the iOS Simulator (Apple's Simulator can't receive real push at all — this is an Apple platform limitation, not a bug) and won't reach a physical Android device yet either, until the FCM credential step above is done. Local notifications (foregrounded app) work on both.
- **SMS safety alerts**: will actually send (Twilio is live) EXCEPT the sender number is still missing — sends will report `unavailable` until `TWILIO_FROM_NUMBER` is added.
- **Everything else** (auth, verification, search/booking/offer flows, chat, live tracking, SOS in-app, ratings, settings) should be fully walkable end-to-end in test mode.

**Files:** none beyond what Tasks 1–4 already touched — this task was branch/build orchestration, not code changes.

---

## 22 July 2026 — Item 8 continued: PR #31 fully triaged (3/6), moving to #32
