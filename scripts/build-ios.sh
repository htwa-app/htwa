#!/bin/bash
# scripts/build-ios.sh
#
# Stage 86 — iOS production build script.
# Produces an .ipa suitable for TestFlight / App Store submission.
#
# Prerequisites:
#   - Apple Developer account and certificates installed in Keychain
#   - Provisioning profile for com.htwa.app installed
#   - Xcode 26+ installed
#   - EAS CLI installed: npm install -g eas-cli
#   - eas.json configured (see below)
#
# Usage:
#   ./scripts/build-ios.sh [production|preview]
#
# Env vars required (inject via op run or CI secrets):
#   APPLE_ID, APPLE_TEAM_ID, ASC_APP_ID

set -euo pipefail

PROFILE="${1:-production}"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> htwa iOS build: profile=$PROFILE"
echo "==> Project root: $PROJECT_ROOT"
cd "$PROJECT_ROOT"

# Ensure eas.json exists
if [ ! -f "eas.json" ]; then
  echo "ERROR: eas.json not found. Run 'eas build:configure' first."
  exit 1
fi

# Run EAS Build
echo "==> Starting EAS build..."
npx eas-cli build \
  --platform ios \
  --profile "$PROFILE" \
  --non-interactive \
  --auto-submit

echo "==> iOS build submitted."
echo "==> Check status at https://expo.dev/accounts/htwa-app/projects/htwa/builds"
