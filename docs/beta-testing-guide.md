
# htwa Beta Testing Guide

How to get htwa into testers' hands before the public launch — TestFlight (iOS), Google Play internal testing (Android), inviting people from the waiting list, and collecting structured feedback.

> Prerequisites: Apple Developer account (Stage 82), Google Play Developer account (Stage 83), and a successful EAS build (`eas build`, profiles in `eas.json`).

---

## 0. What a tester actually experiences (updated 20 July 2026 to match the real app)

This is the real flow as built — brief testers on it up front so they aren't surprised by the verification wait or the manual review step.

1. **Sign up** — email only, no password. A 6-digit code is emailed (`supabase.auth.signInWithOtp`); entering it creates the account.
2. **Identity verification (mandatory for every user, not just drivers)** — photo ID upload + date of birth + a live in-app selfie (camera capture, not a gallery photo). **Under-18 is blocked client-side and by a database constraint.** This is reviewed **manually** by Jordan via the Supabase dashboard — there's no instant approval, so testers should expect a wait (minutes to a day, until item 6 below is checked). The app is fully unusable until this is approved; make sure testers know this up front so they don't think the app is broken.
3. **Profile setup** — nominated contact (who gets the live-tracking link on every trip), university, home location (ROI/NI — sets € vs £ display).
4. **Driving? One more verification step** — driver's licence photo, car photo, and registration, submitted via **Driver Setup**, reviewed the same manual way as item 2 but as a *separate* review queue (a tester can be ID-verified as a passenger and still be pending as a driver).
5. **Community Safety Pledge / waiver** — a one-time acceptance screen (cost-share terms, no-profit driver cap, conduct expectations) gating first booking/first ride offered.
6. **Live tracking** — every trip generates a shareable tracking link (`/track/[token]`, also viewable in-app) showing route + live position to the nominated contact from step 3, without them needing the app or an account.
7. **Payments** — Stripe **test mode only** right now (see item 2 in BLOCKERS-FOR-JORDAN.md for when live mode is ready) — testers should use Stripe's test card `4242 4242 4242 4242`, any future expiry, any CVC.
8. **Search results should have real rides to book** — see `scripts/seed-demo-data.mjs` (run it before a testing wave starts) for a handful of demo drivers/rides between real Irish cities on upcoming dates, so testers aren't looking at an empty list on day one.

---

## 1. iOS — TestFlight

1. **Build & submit:** `bash scripts/build-ios.sh` (runs `eas build --platform ios --profile production`), then `eas submit --platform ios --profile production`.
2. In **App Store Connect → TestFlight**, wait for the build to finish processing (≈10–30 min) and complete the export-compliance question (htwa uses only standard HTTPS encryption → usually "No" to the proprietary-encryption question).
3. **Internal testers** (up to 100, no review): add Apple IDs under *Internal Testing*. Good for Jordan + close circle.
4. **External testers** (up to 10,000): create a public **TestFlight link** under *External Testing*. The first external build needs a short Beta App Review (usually < 24h). Share the link with waiting-list members.

## 2. Android — Google Play internal testing

1. **Build & submit:** `bash scripts/build-android.sh` (`eas build --platform android --profile production`), then `eas submit --platform android --profile production` (uses `google-service-account.json`, track `internal`).
2. In **Play Console → Testing → Internal testing**, create a release and a **tester email list** (up to 100). Internal testing has no review delay.
3. Share the **opt-in URL** with testers; they must accept before they can install.
4. Promote to **Closed testing** to widen the pool (Closed testing of ≥14 days with ≥12 testers is also a requirement before a new personal Play account can go to production).

## 3. Inviting from the waiting list

The waiting list lives in **MailerLite** (`marketing/mailerlite-form-code.md`).

1. Export or segment the MailerLite subscribers (prioritise verified college-email addresses and the target campuses).
2. Send a campaign with: the **TestFlight public link** (iOS) and the **Play opt-in URL** (Android), a one-line ask, and a link to the feedback form.
3. Tag responders as `beta-ios` / `beta-android` so follow-ups are targeted.
4. Cap the first wave (~50–100) so issues are manageable, then widen.

## 4. Feedback collection

Use a single short form (Google Form or Tally) plus the in-app report flow. Template:

```
htwa Beta Feedback

1. Device + OS version:
2. Are you testing as a driver, a passenger, or both?
3. What did you try to do?
4. What happened vs. what you expected?
5. Did anything crash, freeze, or look wrong? (screenshot if possible)
6. Safety features — did Share journey / women-only / Silent SOS behave as expected?
7. On a scale of 1–5, how likely are you to use htwa for a real trip? Why?
8. One thing we should fix first:
```

Triage rule of thumb:
- **P0** — crash, payment error, safety feature failure, women-only bypass → fix before widening the beta.
- **P1** — broken flow with a workaround → next build.
- **P2** — polish / copy / nice-to-have → backlog.

## 5. Exit criteria (beta → launch)

- No open P0 issues; P1 issues triaged.
- Auth → verify → offer/find → book → pay (test mode) → live-trip → rate works end-to-end on both platforms.
- Crash-free sessions ≥ 99% across the beta cohort.
- Load test (Stage 81) passed for expected launch concurrency.
