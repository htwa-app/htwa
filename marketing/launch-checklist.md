# htwa Launch Checklist

Stage 88 — Final pre-launch verification checklist.

---

## 1. Apple App Store (Jordan: manual)

- [ ] Apple Developer account created at [developer.apple.com](https://developer.apple.com) — $99/year
- [ ] App ID `com.htwa.app` registered
- [ ] App Store Connect listing created
- [ ] App store screenshots prepared (6.7" iPhone, 12.9" iPad optional)
- [ ] App Privacy disclosures filled in (location, contacts, financial info)
- [ ] Age rating questionnaire completed (17+)
- [ ] TestFlight build uploaded and tested with beta testers
- [ ] App Review Guidelines compliance check (esp. Section 3.2.1 — rideshare)
- [ ] Submission for App Store review

## 2. Google Play (Jordan: manual)

- [ ] Google Play Developer account created at [play.google.com/console](https://play.google.com/console) — one-time $25 fee
- [ ] App listing created with screenshots
- [ ] Content rating questionnaire completed
- [ ] Data safety form completed (location, financial info, identity)
- [ ] Internal test track → closed test → open test → production rollout
- [ ] Android app bundle uploaded and tested

## 3. Stripe (Jordan: manual)

- [ ] Stripe Connect account created at [dashboard.stripe.com](https://dashboard.stripe.com)
- [ ] Platform profile completed (business name: htwa, website, support email)
- [ ] Test mode verified: create test driver Connect account, complete test payment
- [ ] Live mode enabled (requires Stripe KYC — business registration details)
- [ ] Webhook endpoint configured: `https://htwa-app.com/api/stripe-webhook`
- [ ] Real API keys added to Supabase Edge Function secrets (never to .env.local)

## 4. Supabase (can be done by Jordan or Claude)

- [ ] All migrations applied to production database (`npx supabase db push`)
- [ ] Row Level Security verified on all tables
- [ ] Edge Functions deployed (`npx supabase functions deploy`)
- [ ] Database backup schedule enabled
- [ ] Auth email templates updated with htwa branding
- [ ] Magic link email template uses `{{ .Token }}` (not confirmation URL)

## 5. Google Cloud (Jordan: manual)

- [ ] Google Cloud project created
- [ ] Routes API enabled
- [ ] Places API (New) enabled
- [ ] API key created with iOS + Android app restrictions
- [ ] Billing account linked
- [ ] Real API key added to `.env.local` (replacing `PLACEHOLDER_FILL_IN_REAL_KEY`)
- [ ] API key added to Expo's `extra.googleMapsApiKey` in `app.json`

## 6. Domain & hosting

- [ ] `htwa-app.com` DNS configured
- [ ] Tracking page `htwa-app.com/track/[tripId]` deployed (static hosting)
- [ ] Privacy policy live at `htwa-app.com/privacy`
- [ ] Terms of service live at `htwa-app.com/terms`

## 7. Code quality

- [ ] All tests passing (`npx jest --ci --coverage`)
- [ ] Coverage thresholds met (branches 70%, functions 60%, lines 70%)
- [ ] TypeScript compilation clean (`npx tsc --noEmit`)
- [ ] No hardcoded secret values in any source file
- [ ] `.env.local` and `*.key` files in `.gitignore`

## 8. Beta testing

- [ ] TestFlight beta group set up (target: 20–50 Irish university students)
- [ ] Feedback form linked from in-app Settings screen
- [ ] Known issues documented in PROGRESS.md
- [ ] Critical bugs resolved before public launch

## 9. Legal

- [ ] Privacy policy reviewed by Irish solicitor (recommended before launch)
- [ ] Terms of service reviewed
- [ ] Insurance disclaimer wording verified with legal counsel
- [ ] GDPR data processing register created
- [ ] DPC notification (if required by volume of processing)

## 10. Marketing

- [ ] Instagram account @htwa.app active and populated
- [ ] University society partnerships confirmed (UCD, TCD, UCC, NUI Galway, QUB priority)
- [ ] Launch day posts scheduled
- [ ] Press release prepared

---

## Beta Testing — TestFlight (Stage 78)

**Steps for Jordan to set up TestFlight:**
1. Build the app: `./scripts/build-ios.sh preview`
2. Go to App Store Connect → TestFlight
3. Create an "External" group: "Beta Testers"
4. Add testers by email or generate a public link
5. Submit the build for Beta App Review (usually 24–48h)
6. Share the TestFlight link with testers

## Beta Testing — Play Console (Stage 79)

1. Build: `./scripts/build-android.sh preview`
2. Go to Google Play Console → Testing → Internal Testing
3. Upload the .aab bundle
4. Add testers via email list or Google Group
5. Share the opt-in URL

## Load Testing (Stage 81)

For load testing before launch, use [k6](https://k6.io/) or [Artillery](https://artillery.io/):

```bash
# Install k6
brew install k6

# Example: simulate 100 concurrent users searching for rides
k6 run scripts/load-test-search.js
```

Create `scripts/load-test-search.js` targeting the Supabase REST API with realistic search queries.
