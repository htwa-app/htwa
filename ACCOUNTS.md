# HTWA — Accounts & Services
> What exists, what's needed, and when to set it up.
> Last updated: 1 May 2026

---

## ✅ Already Have

| Service | Purpose | Account | Notes |
|---------|---------|---------|-------|
| GitHub | Code repo & version control | htwa-app | Private repo, CodeRabbit connected |
| Netlify | Website hosting | Connected to GitHub | htwa-app.com live |
| Wix | Domain registrar | Jordan's account | htwa-app.com registered here |
| Stripe | Payments platform | hello@htwa-app.com | Sandbox/test mode, Connect enabled |
| MailerLite | Waiting list email marketing | Connected to website | Embedded on htwa-app.com |
| Claude (Anthropic) | AI development (Cowork + Claude Code) | Pro plan | Both tools active |
| CodeRabbit | Automated PR code review | Connected to GitHub | Config file added to repo |
| Instagram | Business social media | @htwa.app | Business account |

---

## ⏳ Needed — Set Up Now (May 2026)

| Service | Purpose | Why Now | Est. Cost |
|---------|---------|---------|-----------|
| **Apple Developer Account** | Required for TestFlight + App Store submission | Apple takes several days to verify. Need this well before the August TestFlight deadline. Without it nothing ships to iOS. | €99/year |
| **Supabase** | Database, auth, real-time, storage | Claude Code needs this before building any backend or auth screens | Free tier to start |
| **Stripe Identity** | ID + selfie verification for users | Needed before auth screens are built (Stage 18 in BUILD-PLAN) | Pay-per-verification (~€1.50 each) |
| **Google Cloud Console** | Google Maps Routes API + Places API + Firebase | Maps needed for ride search. Firebase needed for Android push notifications. | Pay-as-you-go — low cost at launch |
| **Sentry** | Crash reporting and error tracking | Wire up early so bugs are caught from day one of testing | Free tier sufficient |

---

## 📅 Needed — Set Up Before TestFlight (July 2026)

| Service | Purpose | Why Then | Est. Cost |
|---------|---------|---------|-----------|
| **Google Play Developer Account** | Required for Android beta + Play Store submission | Needed before Android testing begins. One-time fee, instant approval. | $25 one-time |
| **Expo Application Services (EAS)** | Cloud builds for iOS + Android (no local Xcode/Android Studio build needed) | Needed to generate TestFlight and Play Store builds | Free tier available, ~$29/month if volume increases |
| **PostHog** | Product analytics — screen drop-off, onboarding completion, feature usage | Want real data from beta testers, not guessing | Free up to 1M events/month |
| **1Password** | Team password and secrets manager | Before any live API keys are generated — never store secrets in plain text | ~€4/month |

---

## 📅 Needed — Before Going Live (August 2026)

| Service | Purpose | Why Then | Est. Cost |
|---------|---------|---------|-----------|
| **Stripe (live mode)** | Switch from test to live payments | Must complete "Tell us about your business" verification in Stripe dashboard. Can take several days. Start the process in July. | Transaction fees only |
| **Cloudflare** | DNS, DDoS protection, SSL for htwa-app.com | Transfer domain from Wix. Currently working on Wix DNS but Cloudflare is cleaner long-term. | Free |
| **APNs Certificate** | Apple Push Notification service for iOS | Required for push notifications to work on real devices | Included in Apple Developer account |

---

## 📅 Needed — Post-Launch (September 2026 onwards)

| Service | Purpose | Notes |
|---------|---------|-------|
| **Customer support tool** (Intercom or similar) | Handle user queries, reports, disputes | Not needed at beta — email is fine initially |
| **Legal review** | Privacy policy, terms, GDPR compliance sign-off | Before public launch, have a solicitor review the legal docs Claude Code produces |
| **Business bank account** | Receive Stripe payouts for HTWA's application fees | Needs to be in place before live Stripe payouts can be received |

---

## 🔑 Credentials & Secrets Tracker

> Never store actual keys here. This is a reminder of what needs to go into `.env` when the time comes.

| Key | Where It Comes From | When Needed |
|-----|-------------------|-------------|
| `STRIPE_PUBLISHABLE_KEY` | Stripe dashboard → Developers → API keys | Phase 7 (Payments) |
| `STRIPE_SECRET_KEY` | Stripe dashboard → Developers → API keys | Phase 7 (Payments) |
| `STRIPE_WEBHOOK_SECRET` | Stripe dashboard → Webhooks | Phase 7 (Payments) |
| `SUPABASE_URL` | Supabase project settings | Phase 3 (Auth) |
| `SUPABASE_ANON_KEY` | Supabase project settings | Phase 3 (Auth) |
| `GOOGLE_MAPS_API_KEY` | Google Cloud Console | Phase 5 (Maps) |
| `STRIPE_IDENTITY_WEBHOOK_SECRET` | Stripe dashboard → Webhooks | Phase 3 (Auth) |
| `SENTRY_DSN` | Sentry project settings | Phase 2 (Design system) |

All keys go into `.env` (never committed to GitHub) and `.env.example` (committed, with placeholder values only).
