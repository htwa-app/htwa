
# htwa Beta Testing Guide

How to get htwa into testers' hands before the public launch — TestFlight (iOS), Google Play internal testing (Android), inviting people from the waiting list, and collecting structured feedback.

> Prerequisites: Apple Developer account (Stage 82), Google Play Developer account (Stage 83), and a successful EAS build (`eas build`, profiles in `eas.json`).

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
