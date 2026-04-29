# HTWA — Session Progress Log

Entries are added at the top. Most recent session is always first.

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
