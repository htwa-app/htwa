# HTWA — Session Progress Log

Entries are added at the top. Most recent session is always first.

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
