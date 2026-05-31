#!/bin/bash
# scripts/build-android.sh
#
# Stage 87 — Android production build script.
# Produces an .aab suitable for Google Play submission.
#
# Prerequisites:
#   - Google Play account and upload key configured
#   - EAS CLI installed: npm install -g eas-cli
#
# Usage:
#   ./scripts/build-android.sh [production|preview]

set -euo pipefail

PROFILE="${1:-production}"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> htwa Android build: profile=$PROFILE"
cd "$PROJECT_ROOT"

if [ ! -f "eas.json" ]; then
  echo "ERROR: eas.json not found. Run 'eas build:configure' first."
  exit 1
fi

echo "==> Starting EAS build..."
npx eas-cli build \
  --platform android \
  --profile "$PROFILE" \
  --non-interactive \
  --auto-submit

echo "==> Android build submitted."
echo "==> Check status at https://expo.dev/accounts/htwa-app/projects/htwa/builds"
