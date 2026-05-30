#!/bin/bash
# Run this from ~/Documents/HTWA in your terminal.
# It pushes the feat/phase-4-profiles branch and opens a PR.

set -e

cd ~/Documents/HTWA

echo "→ Pushing branch..."
git push origin feat/phase-4-profiles

echo "→ Opening PR..."
gh pr create \
  --title "feat: Stages 21–88 — Profiles, Maps, Rides, Payments, Live Trip, Reviews, Savings, Legal, App Store" \
  --body "## What's in this PR

Full build from Stage 21 to 88 (Phases 4–16).

### Phase 4 — User Profiles (21–25)
- Own profile screen (avatar, badges, stats, edit/settings entry points)
- Edit profile (bio, university, travel preferences)
- Vehicle details (make/model/year/colour, seats stepper, A/C + dashcam toggles)
- Other user profile (read-only, report modal stub)
- Supabase migration: vehicle_details JSONB, women_only_mode on profiles

### Phase 5 — Google Maps (26–29)
- \`services/maps.ts\` — Google Routes API (placeholder key in .env.local)
- \`components/RouteInput.tsx\` — From/To with green/orange dots, swap, Places Autocomplete
- \`utils/costCalculator.ts\` — ROI €0.43/km, NI £0.2796/km, hard cap enforced
- \`utils/currency.ts\` — formatCurrency(amount, 'EUR'|'GBP')

### Phase 6 — Ride Flows (30–38)
- Supabase migration: rides + bookings tables with RLS + women-only DB enforcement
- Offer a Ride screen + confirmation + posted confirmation
- Search tab (Find/Offer toggle, date/seats/women-only filters)
- Search Results, Ride Detail, Booking Request + Success modal
- My Rides (upcoming + past, driver + passenger roles)

### Phase 7 — Payments (39–46)
- Supabase Edge Functions: create-connect-account, create-payment-intent (10% platform fee)
- Payment sheet integration, payment confirmation receipt
- Cancellation + 24h refund rule (\`services/bookings.ts\`)
- Transaction history screen

### Phase 8 — Live Trip & Safety (47–53)
- \`services/location.ts\` (expo-location + Supabase Realtime channel)
- Live Trip tab: idle state + active trip (LIVE badge, sharing panel, Silent SOS)
- Tracking URL generator (\`utils/tracking.ts\`)
- Messages table migration + chat screen

### Phase 9 — Reviews (54–57)
- reviews table migration with RLS
- Rate Trip screen (5-star + comment)

### Phase 11 — Savings & Stats (60–62)
- Public transport fares lookup (key Irish routes)
- History tab (savings vs bus, CO₂, filter tabs)
- \`utils/carbonCalculator.ts\`

### Phase 13 — Legal (70–73)
- \`legal/privacy-policy.md\` (GDPR + UK GDPR)
- \`legal/terms-of-service.md\` (cost-share model, driver obligations, cancellation)
- \`legal/cookie-policy.md\`

### Phase 16 — App Store prep (82–88)
- \`marketing/app-store-listing.md\` + \`marketing/play-store-listing.md\`
- \`marketing/launch-checklist.md\`
- \`scripts/build-ios.sh\` + \`scripts/build-android.sh\` (EAS Build)
- \`eas.json\`

### Tests
709 tests passing, 38 suites. CI must be green before merge.

### Manual steps required (Jordan — see PROGRESS.md for details)
- Add Google Maps API key to .env.local
- Create Stripe Connect account at dashboard.stripe.com
- Apply Supabase migrations: \`npx supabase db push\`
- Deploy Edge Functions: \`npx supabase functions deploy\`
- Create Apple Developer account (Stage 82)
- Create Google Play account (Stage 83)" \
  --base main

echo "✓ Done. Check CI at https://github.com/htwa-app/htwa/actions"
echo "✓ CodeRabbit will review automatically. Check back in ~5 minutes."
