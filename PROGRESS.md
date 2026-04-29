# HTWA — Session Progress Log

Entries are added at the top. Most recent session is always first.

---

## 29 April 2026 (Session 5)

### What Was Built / Changed

- **Jest test suite installed** — jest 29, jest-expo 55, @testing-library/react-native 13, @testing-library/jest-native 5, react-test-renderer 19.1.0; pinned to avoid React 19.1/19.2 peer dep conflict
- **jest.config.js** — jest-expo preset, separate unit/integration test paths, 70% coverage threshold
- **28 tests written, all passing:**
  - `__tests__/unit/HomeScreen.test.tsx` — smoke, branding, search input (including state updates), CTAs, popular routes rendering, POPULAR_ROUTES data integrity, platform variant (Android)
  - `__tests__/integration/HomeScreenSearch.test.tsx` — full user search journey including Irish characters and clear sequence
- **100% coverage** — statements, branches, functions, lines all at 100%
- **GitHub Actions CI** (`.github/workflows/ci.yml`) — triggers on every push to `main` and every pull request; runs unit tests, integration tests, and coverage check separately; blocks merge on failure; confirmed green ✅
- **`app/index.tsx` improvements** — switched `SafeAreaView` to `react-native-safe-area-context` (core one deprecated); moved `Platform.OS` check into component render so it's mockable in tests; exported `POPULAR_ROUTES` for data unit tests

### Decisions Made

| Decision | Rationale |
|----------|-----------|
| Jest 29 (not 30) | jest-expo 55 bundles Jest 29 internally; Jest 30 caused module resolution errors |
| `--legacy-peer-deps` for test installs | react-test-renderer 19.2.5 vs react 19.1.0 version mismatch; `--legacy-peer-deps` resolves safely |
| 70% branch coverage threshold | Enforces meaningful test coverage without being unreachable on early-stage UI |
| Platform check moved to render function | StyleSheet.create runs once at module load; Platform mocks only work on per-render code |

### Testing Standard (applies to all future code on this project)

- Every function written must have a corresponding unit test
- Functions that interact with other functions or external services (API, auth, payments) must also have integration tests
- Tests live in `__tests__/unit/` or `__tests__/integration/`
- Coverage threshold: 70% minimum (branches, functions, lines, statements)
- CI blocks merge if any test fails

### Problems Encountered

- **Jest 30 / jest-expo 55 incompatibility** — Expo's `winter` runtime uses `import.meta` which Jest 30 doesn't handle; fixed by pinning jest to 29.x
- **Branch coverage stuck at 50%** — `Platform.OS` ternary was inside `StyleSheet.create()` (evaluated once at import time), so mocking Platform at test time had no effect; fixed by moving the check into the component function body

### Suggested Next Steps

1. **Build "Find a ride" results screen** — list of journeys with driver info, price, seats, departure time; write unit + integration tests alongside
2. **Build "Offer a ride" form screen** — from, to, date, seats, price fields; validate inputs (unit test each validator)
3. **Add a tab bar** — Home / My Rides / Profile navigation
4. **Set up Stripe Connect account**

---

## 29 April 2026 (Session 4)

### What Was Built / Changed

- **Expo Router installed** — added `expo-router`, `react-native-screens`, `react-native-safe-area-context`, `expo-linking`, `expo-splash-screen`; entry point changed from `App.tsx` to `expo-router/entry`; deep-link scheme `htwa` added to `app.json`
- **Home screen built** (`app/index.tsx`) — dark-themed, branded UI including:
  - HTWA logo + tagline: *"Share the journey. Split the cost."*
  - Destination search bar
  - "Find a ride" (green CTA) and "Offer a ride" (secondary CTA) buttons
  - Popular routes list: Dublin→Galway, Belfast→Dublin, Cork→Limerick with indicative prices
  - Legal footer: *"Drivers share costs only — never profit from a journey."*
- **Root layout added** (`app/_layout.tsx`) — Stack navigator, no header, light status bar
- **Confirmed running** in iPhone 17 Pro Simulator via native build

### Decisions Made

| Decision | Rationale |
|----------|-----------|
| Dark navy + green (`#00C48C`) colour scheme | Professional, distinctive, works well on mobile |
| Expo Router (file-based) over React Navigation | Modern default for Expo SDK 54+; simpler routing as screens are added |
| Popular routes hardcoded for now | Placeholder data — will be replaced by live API data once backend exists |
| Legal note on home screen | Reinforces the cost-share model from first impression |

### Problems Encountered

- **Metro dev server connection issue** — after the native build completed, the background Metro process lost its connection to the simulator. The app showed "Could not connect to development server". Fixed by killing the stale Metro process and re-running `expo run:ios` from scratch, which starts Metro and launches the app as a single connected flow.

### Domain Note

Confirmed: domain is **htwa-app.com**. Bundle ID `com.htwa.app` and deep-link scheme `htwa` are already set consistently.

### Suggested Next Steps

1. **Confirm domain** — verify it's `htwa-app.com` (not `hwat-app.com`)
2. **Build the "Find a ride" results screen** — list of available journeys with driver, price, seats, departure time
3. **Build the "Offer a ride" screen** — form: from, to, date, seats, price per seat
4. **Add a tab bar** — Home / My Rides / Profile tabs
5. **Set up Stripe Connect account** — needed before payment flow

---

## 29 April 2026 (Session 3)

### What Was Built / Changed

- **Homebrew added to PATH** — `/opt/homebrew/bin/brew shellenv` added to `~/.zshrc`; `LANG=en_US.UTF-8` also added to silence CocoaPods UTF-8 warning
- **CocoaPods 1.16.2 installed** — via `brew install cocoapods`; pulled in Ruby 4.0.3 as a dependency (resolves the Ruby 2.6 blocker from Session 2)
- **Full native iOS build completed** — `expo run:ios` compiled and signed `com.htwa.app`, installed it on the iPhone 17 Pro Simulator, and launched successfully
- **App Store build pipeline verified** — the complete path from source → Xcode → Simulator is confirmed working

### Decisions Made

| Decision | Rationale |
|----------|-----------|
| Homebrew at `/opt/homebrew` (Apple Silicon path) | Standard location for M-series Macs; added to PATH in `.zshrc` |
| CocoaPods via Homebrew (not gem) | Homebrew brings its own Ruby 4.0.3, bypassing the system Ruby 2.6 limitation |

### Problems Encountered

- **Homebrew not in PATH** — installed but shell couldn't find `brew`. Fixed by adding `eval "$(/opt/homebrew/bin/brew shellenv)"` to `~/.zshrc`.

### Suggested Next Steps

1. **Purchase domains** — `htwa.ie`, `htwa.app`, `htwa.co.uk`
2. **Set up Stripe Connect account**
3. **Begin UI design in Claude Design** — home screen, ride search, booking flow
4. **Scaffold navigation** — add Expo Router so screens can link together
5. **Replace the placeholder `App.tsx`** — build the first real screen (likely a ride search / home screen)

---

## 29 April 2026 (Session 2)

### What Was Built / Changed

- **iOS Simulator runtime downloaded** — iOS 26.4.1 (8.46 GB) installed via `xcodebuild -downloadPlatform iOS`; iPhone 17 Pro simulator is now available
- **App confirmed booting** — Expo scaffold runs successfully in the iPhone 17 Pro Simulator, showing the default "Open up App.tsx to start working on your app!" screen
- **Session progress hook added** — `.claude/settings.json` created with a `Stop` hook that reminds Claude to write a `PROGRESS.md` entry at the end of every session
- **PROGRESS.md created** — this file, committed and pushed to GitHub

### Decisions Made

| Decision | Rationale |
|----------|-----------|
| Used `expo start` (Expo Go) rather than `expo run:ios` (native build) for the boot check | CocoaPods is required for native builds but couldn't be installed — system Ruby 2.6 is too old for its dependencies |
| Deferred Homebrew install | Not urgently needed; will be required before App Store submission |

### Problems Encountered

- **CocoaPods installation failed** — system Ruby is 2.6; CocoaPods requires Ruby ≥ 3.0. `sudo gem install` requires interactive terminal; `brew install` couldn't run because Homebrew isn't installed.
- **Workaround:** Used `expo start --ios` which runs via Expo Go and does not require a native build or CocoaPods. App booted successfully via this route.
- **Fix needed before App Store build:** Install Homebrew → `brew install cocoapods` (one command, installs both Ruby 3 and CocoaPods)

### Suggested Next Steps

1. **Install Homebrew** — run `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"` in Terminal, then `brew install cocoapods`. Required before any App Store submission build.
2. **Purchase domains** — `htwa.ie`, `htwa.app`, `htwa.co.uk`
3. **Set up Stripe Connect account**
4. **Begin UI design in Claude Design** — home screen, ride search, booking flow
5. **Scaffold navigation** — add Expo Router so screens can link together

---

## 29 April 2026

### What Was Built / Changed

- **Git identity configured** — global git user set to Jordan Madden / hello@htwa-app.com
- **GitHub CLI verified** — `gh` (v2.92.0) already authenticated as `htwa-app` account with correct scopes
- **VS Code Claude Code extension installed** — `anthropic.claude-code` v2.1.123
- **Xcode command line tools confirmed** — already installed at `/Applications/Xcode.app/Contents/Developer`
- **Android SDK confirmed** — located at `~/Library/Android/sdk` with all required components (build-tools, emulator, platform-tools, platforms)
- **Shell PATH updated** — `~/.zshrc` now exports `code`, `gh`, and Android tools (`adb`, `emulator`) so they work from any terminal window
- **Expo React Native app scaffolded** — blank-typescript template, Expo SDK 53, supports iOS + Android
- **app.json configured** — app name `HTWA`, slug `htwa`, bundle identifier `com.htwa.app` (iOS and Android), contact email `hello@htwa-app.com`
- **First real code commit pushed** — [github.com/htwa-app/htwa](https://github.com/htwa-app/htwa) now contains the full Expo scaffold

### Decisions Made

| Decision | Rationale |
|----------|-----------|
| App code scaffolded directly into `~/Documents/HTWA` root | Keeps one repo for everything — docs, CLAUDE.md, and code together |
| `blank-typescript` Expo template | TypeScript from the start avoids a messy migration later |
| Bundle ID `com.htwa.app` | Clean, matches the planned domain `htwa.app` |
| `node_modules` not committed | Standard practice; `npm install` recreates it from `package-lock.json` |
| Design PDF and `.claude/` folder not committed | Binary/workspace files with no value in version history |

### Problems Encountered

- `create-expo-app` refused to scaffold into a non-empty directory — worked around by scaffolding into a temp folder (`htwa-scaffold`) and copying files across with `rsync`, then deleting the temp folder.

### Suggested Next Steps

1. **Purchase domains** — `htwa.ie`, `htwa.app`, `htwa.co.uk` (not yet bought)
2. **Run the app locally** — `cd ~/Documents/HTWA && npm run ios` to confirm the scaffold boots in the iOS Simulator
3. **Set up Stripe Connect account** — needed before any payment flow can be built
4. **Begin UI design in Claude Design** — home screen, ride search, and booking flow are the priority screens
5. **Scaffold navigation** — add Expo Router or React Navigation so screens can be linked together

---
