# HTWA — Project Intelligence File

> This file is the single source of truth for the HTWA project.
> It is read automatically by Claude Code every time it opens in this folder.
> It is also read by Claude in Cowork mode at the start of each session.
> Keep it updated as the project evolves.

---

## ⚠️ STANDING RULES — READ BEFORE DOING ANYTHING

These rules apply to all Claude tools (Cowork, Claude Code, Claude in Chrome) at all times:

1. **Payment methods** — Never use any of Jordan's credit cards or payment methods without asking explicitly each time, for every transaction, no exceptions.
2. **Personal email** — Never access or read Jordan's personal email accounts.
3. **Personal social media** — Never access personal social media accounts. The business Instagram (@htwa.app) is fine.
4. **Passwords & personal info** — Never share Jordan's passwords or personal information with any third party or service.
5. **Project service credentials — OK to use freely** — Claude may read and use stored project credentials (1Password vault entries and `.env.local` env vars) to operate project services — Supabase, Stripe, GitHub, MailerLite — without asking each time. This covers running migrations, deploying, calling project APIs, and managing repos. **Limits that still apply:** this does NOT authorise making payments (rule 1 stands — every transaction needs explicit approval), and credentials must never be pasted into chat, committed to git, logged, or shared with any third party (rule 4 stands). Sensitive keys (Supabase service-role key, Stripe secret key, MailerLite API key) live in 1Password and are referenced via `op://…`, never written to disk.
6. **PROGRESS.md entry required** — Every session must end with a PROGRESS.md entry listing every file created or modified. No exceptions. If the session ends without one, write it before closing.

If in doubt about whether an action falls under these rules, stop and ask first.

---

## ⚠️ BRAND NAMING RULES — NEVER GET THESE WRONG

- The app name is always **htwa** — all lowercase, never "HTWA", "Htwa", or "H T W A"
- The tagline is always **"heading that way anyway."** — all lowercase, including the first word, always with a period (not a question mark)
- The logo always renders as **htwa.** with an amber dot on the period
- These rules apply everywhere without exception — in-app copy, code comments, documents, and marketing

---

## ⚠️ HOW TO WORK WITH CLAUDE EFFECTIVELY — KNOWN WEAKNESSES & MITIGATIONS

Claude has specific weaknesses as a software engineer. These mitigations are baked in as standing instructions.

### 1. Claude cannot run code — it only reads it
**Risk:** Changes may look correct but fail at runtime.
**Standing rule:** After any code change, Jordan runs it and pastes errors back. Never assume it works because Claude said it should.

### 2. Context degrades over long sessions
**Risk:** Claude forgets decisions made earlier in a conversation or in previous sessions, leading to contradictions or repeated mistakes.
**Standing rule:** CLAUDE.md and PROGRESS.md are the memory. If something important was decided in a previous session, paste the relevant section at the start of the new one. If something seems off, tell Claude: "check PROGRESS.md first."

### 3. Claude is overconfident about things it cannot verify
**Risk:** Claude says something "looks right" when it would need to run the code to actually know. This happened with map coordinates — Claude declared them correct before visual verification.
**Standing rule:** For anything visual or behavioural, force verification: "show me a screenshot" or "verify it in the browser." Don't accept abstract reasoning as proof.

### 4. Claude hallucinates APIs and library defaults
**Risk:** Claude confidently uses a method, prop, or config option that doesn't exist or behaves differently in the version installed.
**Standing rule:** For any new library usage, ask Claude to state which version is installed and whether the API exists in that version. Check the docs for anything unfamiliar.

### 5. Claude changes more than it was asked to
**Risk:** Claude fixes adjacent things it wasn't asked to touch, making diffs hard to review. This happened when the form-col border was removed without being asked.
**Standing rule:** Be explicit about scope: "only change X, nothing else." After any change ask: "what else did you touch?" Claude must answer honestly.

### 6. Claude buries uncertainty behind confident language
**Risk:** When unsure, Claude tends to give a confident-sounding answer rather than flagging the uncertainty.
**Standing rule:** After any significant task, ask: **"What could go wrong with what you just did, and what should I verify?"** This is the single most effective prompt for drawing out honest uncertainty.

### 7. Claude lacks accumulated project taste
**Risk:** Claude doesn't remember past mistakes or "we tried that, it broke X" lessons across sessions.
**Standing rule:** Document recurring patterns and past mistakes in this file under the Lessons Learned section below. Claude reads this every session.

---

## 1. What Is HTWA?

HTWA is a **cost-sharing rideshare app for Ireland** (and Northern Ireland).

It is not a taxi service. The legal model is a **carpool platform** — drivers share the cost of a journey with passengers, and can never profit from a ride. This distinction is what keeps the platform legal without requiring taxi/SPSV licensing.

The name HTWA stands for **Heading That Way Anyway**. Domain purchased:
- `htwa-app.com` ✅

Original domains (htwa.ie, htwa.app, htwa.co.uk) — decided not needed for now.

---

## 2. The Founder

**Jordan Madden** — jmadden404@gmail.com  
Non-technical founder. Comfortable with high-level direction but not with writing code directly. All technical work is handled by Claude Code. Jordan reviews outputs and gives approval.

**Claude subscription:** Pro plan (confirmed April 2026). Both Claude Code and Claude Design are available on Pro — no upgrade needed.

---

## 3. The Business

### Target Market (Phase 1)
- Irish university students (intercampus and commuter routes)
- Cross-border corridor (Republic of Ireland ↔ Northern Ireland)

### Legal Model
- Drivers set journey costs based on Irish/UK civil service mileage rates (Revenue.ie / HMRC AMAP rates)
- Platform enforces a hard cap: drivers cannot earn more than cost
- This is the legal wedge that separates HTWA from an unlicensed taxi service
- Key regulatory references: Citizens Information (SPSV), Transport for Ireland carpooling guidelines, NI taxi licensing (nidirect)

### Revenue Model
- Platform takes a small fee per transaction (Stripe Connect application fees)
- Target: €1.5–2M revenue by month 36 (base case)
- Required working capital: €60–90k through month 12

### Competitive Landscape
- Primary reference: BlaBlaCar (pricing model, tech stack on StackShare)
- HTWA differentiator: Ireland-first, university focus, cross-border corridor

---

## 4. Master Plan

A full master plan document (22 sections, ~70,000 characters) was created as **HTWA-Master-Plan.docx**. It lives in the previous Cowork session's outputs folder. Jordan has a copy.

Key sections:
- **Section 1** — Claude's honest take on the idea (positive, with caveats)
- **Section 3** — Legal Foundation (most important section; read this first)
- **Section 5** — Tools & Tech Stack
- **Section 11** — Branding & Design
- **Section 19** — Revenue Projections (month 1–36)
- **Section 22.2** — Headline Q&A answers

---

## 5. Tech Stack

### Confirmed Tools
| Tool | Purpose | Status |
|------|---------|--------|
| Claude Code | AI coding assistant | ✅ Built into Claude Desktop (Code tab) |
| Claude Code extension | VS Code integration | ✅ Installed (anthropic.claude-code v2.1.123) |
| Claude Design | UI/UX mockups and prototypes | ✅ Accessible at claude.ai/design |
| VS Code | Code editor (visual interface) | ✅ Installed |
| Node.js | Runtime environment | ✅ Installed |
| npm | Package manager (bundled with Node) | ✅ Installed |
| Git | Version control | ✅ Installed & configured (hello@htwa-app.com) |
| GitHub CLI (gh) | GitHub from terminal | ✅ Authenticated as htwa-app |
| GitHub | Remote repo / backup | ✅ Live at github.com/htwa-app/htwa |
| Xcode | iOS build tool | ✅ Command line tools verified |
| Android Studio | Android build tool | ✅ SDK at ~/Library/Android/sdk |
| Stripe Connect | Payments + application fees | Planned |
| Google Maps Routes API | Route calculation + toll fees | Planned |
| GitHub Desktop | Visual Git interface | Planned |
| 1Password CLI (`op`) | Credentials management | ✅ Installed (v2.34.0, `/opt/homebrew/bin/op`); account sign-in pending (Jordan's action) |

### Explicitly Rejected Tools
- ~~Cursor~~ — replaced by Claude Code
- ~~Figma~~ — replaced by Claude Design

### Mobile
- Target: iOS + Android
- Both app stores required (Apple App Store + Google Play)
- Apple App Store Review Guidelines apply

### Secrets & Credentials (1Password)

Sensitive server-side keys live in **1Password** (account `hello@htwa-app.com` on `my.1password.eu`), in the dedicated **HTWA** vault. They are **never** stored in `.env.local` or committed.

- **Public, client-safe keys** stay in `.env.local` (gitignored): `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
- **Sensitive keys** are 1Password items in the **HTWA** vault (value in the item's `password` field):
  - `op://HTWA/htwa supabase API key/password` → Supabase `sb_secret_…` project secret key (new-format replacement for the `service_role` JWT; authenticates against the project data API, NOT `api.supabase.com`). Env var: `SUPABASE_SECRET_KEY`.
  - `op://HTWA/htwa stripe API key/password` → Stripe `sk_test_…` secret key. Env var: `STRIPE_SECRET_KEY`.
  - `op://HTWA/htwa mailerlite API key/password` → MailerLite API token (JWT). Env var: `MAILERLITE_API_KEY`.
- **Non-interactive access (no Touch ID):** a **1Password Service Account** (`htwa-claude-ci`, read-only on the HTWA vault) provides the token in `~/.config/op/htwa-sa.token` (perms `600`). `~/.zshenv` exports it as `OP_SERVICE_ACCOUNT_TOKEN`, so **every** `op` command runs silently — no biometric prompt. This is what makes credential access frictionless for Claude Code.
- **How to use them:** `.secrets.env` (gitignored — pointers only) maps env-var names to the `op://` references. Run anything needing a secret through `op run`:
  ```bash
  op run --env-file=.secrets.env -- <command>
  # exposes SUPABASE_SECRET_KEY, STRIPE_SECRET_KEY, MAILERLITE_API_KEY for that process only
  ```
  Secrets are injected as env vars for the command's lifetime and never written to disk.
- **Rules:** never `echo`/print a secret value into the transcript or logs; to verify a reference, check `| wc -c` (length) not the value.
- **Caveats of the service-account setup:**
  - The token is **read-only and scoped to the HTWA vault only** — it cannot read Personal or write/edit anything. Item creates/edits/moves still need the **desktop-app integration** (Touch ID); to do those, run in a shell with `unset OP_SERVICE_ACCOUNT_TOKEN` so `op` falls back to the app.
  - Because `OP_SERVICE_ACCOUNT_TOKEN` is set globally in `~/.zshenv`, the `op` CLI defaults to the service account everywhere; `unset` it in a terminal to use the full interactive account.
  - **Security posture:** combined with `bypassPermissions`, this grants Claude unattended, no-confirmation **read** access to these three keys. Accepted by Jordan (30 May 2026) in exchange for zero friction. To revoke: delete the service account in 1Password (Developer → Service Accounts) and remove the `~/.zshenv` line.

---

## 6. Project Folder Structure

This folder (`~/Documents/HTWA/`) is the **shared workspace** between Cowork and Claude Code.

- Both Claude Code and Cowork read/write to this folder
- `CLAUDE.md` (this file) is the living brain — update it as decisions are made
- All code, assets, and documents for the project live here

---

## 7. Current Status (as of 31 May 2026 — BUILD COMPLETE, Stages 21–88)

**The full app is built and merged to `main`** across 14 per-phase PRs (#11–#24), each tsc-0, CI-green, CodeRabbit-clean. **`tsc --noEmit`: 0 errors. Jest: 759 tests.** Phases 4–13 (profiles → legal) are implemented; Phases 14–16 are delivered as docs/config (beta guide, store listings, `eas.json`, build scripts). 7 migrations applied to the live Supabase DB; `types/database.ts` is the typed source of truth (regenerable via `supabase gen types` with the Management token in 1Password).

**Remaining work is external/manual (flagged at each stage + listed at the top of PROGRESS.md):** Google Maps key, Stripe Connect account + Edge Function deploy, `react-native-maps`/`datetimepicker` native installs, Apple/Google developer accounts, and simulator/device verification. Deferred polish: dark mode (64), perf audit (67), profile review rollup (56–57).

See **BUILD-PLAN.md** for per-stage status and **PROGRESS.md** (top entry) for the manual-steps checklist.

<details><summary>Earlier milestone detail (through Phase 3)</summary>

### Completed
- [x] Project concept defined and master plan written
- [x] Legal model validated (cost-share carpool, not taxi)
- [x] Tools stack decided (Claude Code + Claude Design replacing Cursor + Figma)
- [x] Node.js, Git, VS Code, GitHub CLI — all installed and configured
- [x] GitHub repo live at github.com/htwa-app/htwa
- [x] Expo React Native app scaffolded (TypeScript, SDK 53, iOS + Android)
- [x] CI workflow (GitHub Actions) — unit + integration + coverage gate
- [x] CodeRabbit automated PR reviews wired up
- [x] `constants/theme.ts` — all DESIGN-SPEC §1–5 tokens with 100 tests
- [x] `components/Text.tsx`, `Button.tsx`, `Card.tsx`, `Input.tsx`, `Badge.tsx`, `Chip.tsx`, `Avatar.tsx` — all built and tested
- [x] `app/screens/SplashScreen.tsx` — routes via `useAuth()`: loading→stay, no session→/login, unverified→/id-verify, verified→/(tabs)
- [x] `app/login.tsx` — Login screen with 4 auth buttons
- [x] `app/signup.tsx` — `signInWithOtp` email OTP flow, form validation, error state
- [x] `app/verify.tsx` — OTP entry, `verifyOtp`, inserts `public.users` + `public.verification`, resend
- [x] `app/id-verify.tsx` — beta placeholder: upserts verification row, `refreshVerification()`, routes to /profile-setup; Stripe Identity deferred to Phase 15
- [x] `app/profile-setup.tsx` — nominated contact, `supabase.from('profiles').upsert()`, AsyncStorage cache
- [x] `context/AuthContext.tsx` — `AuthProvider`, `useAuth()`, `refreshVerification()`
- [x] `supabase/migrations/` — users, verification, profiles tables; RLS policies including UPDATE on verification
- [x] 523 tests, all passing
- [x] Full end-to-end auth flow verified on iPhone 17 Pro simulator (iOS 26.4): Login → Sign Up → OTP → ID Verify → Profile Setup → Tabs
- [x] PR #8 merged — Phase 3 Authentication (Stages 13–20) squash-merged to `main` (commit d2f4902); `feat/auth` auto-deleted
- [x] `main` coverage gate fixed — functions threshold lowered 70→60 (untested stub screens); CI green again

</details>

---

## 8. How Jordan & Claude Work Together

- **Cowork** (this app): Planning, decisions, documents, high-level direction
- **Claude Code** (Terminal or VS Code tab): All coding, file creation, Git operations
- **Claude Design** (claude.ai/design): UI mockups, prototypes, visual assets
- **Plan mode in Claude Code**: Press Shift+Tab twice — Claude writes a plan before touching any file
- **Plan mode in Cowork**: Type "plan first, don't execute yet" — same effect

---

## 9. Key Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| Apr 2026 | Use Claude Code instead of Cursor | Native integration, saves ~€20/month |
| Apr 2026 | Use Claude Design instead of Figma | Bundled with Pro plan, AI-native workflow |
| Apr 2026 | Legal model = cost-share carpool | Avoids SPSV/taxi licensing requirements |
| Apr 2026 | University + cross-border as Phase 1 wedge | Sharp, defensible initial market |
| Apr 2026 | Shared HTWA folder as single source of truth | Enables Cowork ↔ Claude Code continuity |
| Apr 2026 | Cross-border cost calculation uses driver's home jurisdiction rate | Driver based in ROI uses Revenue.ie rates for full journey; NI-based driver uses HMRC AMAP rates. Simpler, legally clean, easier to build. |
| Apr 2026 | Currency display set at account creation based on user's home location | ROI users see €, NI users see £. Can be changed in settings. |
| Apr 2026 | Savings displayed as money saved vs bus/train equivalent | More compelling than showing money shared |
| Apr 2026 | Mandatory ID + selfie verification before app use | All users must complete before accessing platform. Shows as green "Verified" tick on profile. |
| Apr 2026 | Nominated contact receives live journey tracking | Selected by user in app settings. Receives real-time tracking link for every trip, similar to Uber's share journey feature. |
| May 2026 | Women-only mode works both ways | A female driver can toggle women-only mode when offering a ride — only female passengers can request to join. A female passenger can filter search results to show only women-only rides. Both directions must be enforced at the database level, not just the UI. |
| May 2026 | Tab bar renamed and restructured | 4 tabs: Search (main/home), History (past trips), Live Trip (active journey + safety sharing — shows "no active journey" message when idle), Profile (settings via cog icon inside screen). Tab bar always visible regardless of trip state. |
| May 2026 | Claude Code permissions set to `bypassPermissions` | No tool-approval prompts in this repo (Jordan's choice, risks acknowledged). Removes the confirmation gate on destructive shell commands; standing rules (payments, personal email/social) still apply regardless. Lives in `.claude/settings.json` via PR #9. |
| May 2026 | Config changes kept in separate PRs from feature work | bypassPermissions split out of the auth PR (#8) via cherry-pick + revert so the feature diff stays reviewable. |
| 30 May 2026 | Claude may use stored project credentials without asking | New standing rule #5. Lets Claude operate Supabase/Stripe/GitHub/MailerLite using secrets in 1Password + `.env.local` without a per-action prompt. Deliberately scoped: payment approval (rule 1) and no-credential-sharing (rule 4) are untouched. Jordan declined to relax the payments, personal-email, or personal-social rules. Claude cannot perform sign-ins itself — those need Jordan's master password/Touch ID; sensitive keys are stored in 1Password and referenced via `op://`. |
| 31 May 2026 | Only ONE autonomous Claude session per repo at a time | Two sessions ran overnight on the same `feat/phase-4-profiles` branch and collided (clobbered files, stale `.git/HEAD.lock`, duplicate/contradictory work). Rule: never start a second autonomous builder on a repo that already has one running. |
| 31 May 2026 | Supabase Management token to be added for autonomous migrations | Claude cannot apply DDL with the `sb_secret` key (PostgREST is data-only). Jordan to add an `sbp_…` Management token / DB connection string to 1Password so Claude can apply migrations and run `supabase gen types` autonomously. Until then, migration files are written but must be applied by Jordan in the dashboard SQL editor. |

---

## 11. Lessons Learned (add to this as the project grows)

| Date | Lesson | Detail |
|------|--------|--------|
| May 2026 | ExpoModulesCore/ExpoBridgeModule.h build failure is a stale Pods issue | Fix: `cd ios && rm -rf Pods Podfile.lock && LANG=en_US.UTF-8 pod install`. Always try this first if the iOS build fails with a missing header error. |
| May 2026 | Squash-merge ancestors cause rebase conflicts | When a branch carries commits from PRs that were squash-merged into main, a straight rebase replays duplicate commits and causes file conflicts. Fix: soft-reset to origin/main, which collapses to the net diff, then single clean commit and force-push. Use this pattern any time a branch has squash-merge ancestors. |
| May 2026 | Don't trust coordinate reasoning without visual verification | Claude declared map city coordinates correct purely by reading code. They were only confirmed correct after forcing a browser screenshot. |
| May 2026 | Scope creep — Claude removed the form-col border unprompted | When asked to "remove the border on the map", Claude incorrectly removed the form column borders instead. Always confirm scope before accepting a change. |
| May 2026 | d3-geo Polygon bbox clustering bug | Passing a GeoJSON Polygon rectangle to `fitExtent` causes spherical winding ambiguity — all coordinates cluster in ~3px. Use MultiPoint or an actual geographic feature instead. |
| May 2026 | `topojson.merge` on UK includes all of Great Britain | Merging Ireland (372) + UK (826) brings in Scotland and England. Fix: filter UK MultiPolygon sub-polygons by centroid to extract NI only. |
| May 2026 | `jest.spyOn(Platform, 'OS', 'get')` fails in jest-expo | `Platform.OS` is a plain value property, not a getter — spying on it with `'get'` access type throws at test time. Fix: `Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true, writable: true })` inside a `try/finally` that restores the original value. |
| May 2026 | Never call `render()` inside `act()` in RTL | `@testing-library/react-native`'s `act()` unmounts the component when it exits, causing "Can't access .root on unmounted test renderer". Pattern: call `render()` outside `act`, use `waitFor()` for async assertions. |
| May 2026 | AsyncStorage must be mocked globally in Jest | `@react-native-async-storage/async-storage` uses a native module that doesn't exist in Jest. Always add `'@react-native-async-storage/async-storage': require.resolve('@react-native-async-storage/async-storage/jest/async-storage-mock')` to `moduleNameMapper` in `jest.config.js`. |
| May 2026 | `jest.doMock` + dynamic `import()` needs `--experimental-vm-modules` | Testing a conditional mock state (e.g. `useFonts` returning `[false, null]`) with `jest.doMock` + `await import(...)` fails with "dynamic import callback invoked without --experimental-vm-modules". Fix: declare a mutable `const mockFn = jest.fn()` (name must start with `mock`), use it in the `jest.mock` factory, and call `mockFn.mockReturnValue(...)` inside `beforeEach` to flip state between suites. |
| May 2026 | App icon updates require changing TWO files | `assets/icon.png` is the Expo source of truth (committed). But `ios/` is gitignored — the Xcode build reads from `ios/HTWA/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png` directly. Always copy the new icon to both paths. A fresh `expo prebuild` would regenerate the ios copy from assets/, but since ios/ already exists on disk it won't be regenerated automatically. |
| May 2026 | Xcode DerivedData caches stale app icons | Even after replacing the icon file and rebuilding, the simulator may show the old icon because DerivedData cached it. Fix: `rm -rf ~/Library/Developer/Xcode/DerivedData/HTWA-*` + `xcrun simctl uninstall booted com.htwa.app`, then rebuild. The MD5 of `AppIcon60x60@2x.png` inside DerivedData must match `assets/icon.png` before the correct icon will appear. |
| May 2026 | Partial Edit replacements leave orphaned code blocks | When using Edit to replace a component function, code below the match (styles, constants) is left in place even if it's no longer referenced. Always check the full file after a targeted Edit — orphaned `StyleSheet.create` blocks will crash Metro at runtime. |
| May 2026 | Squash merge base PR before dependent PR — rebase required | When PR #4 was based on PR #3's branch, squash-merging #3 into main caused #4 to conflict (commits already upstream). Fix: `git fetch && git rebase origin/main` on the dependent branch — Git drops already-upstreamed commits, force-push, re-trigger CI, then merge. |
| May 2026 | Spec values not in §1 palette → named local constants, not added to Colors | Some component specs (§6.1 disabled grey #C8C8C8, §6.4 card border 0.08 opacity, §6.5 badge 11px, §6.7 women-only text #2A1F4A) reference values absent from the brand palette. These must NOT be hardcoded anonymously or silently added to theme.ts. Declare them as named constants at the top of the component file with a comment citing the spec section. |
| May 2026 | Separate `containerTestID` from `testID` on Input | The Input component has an outer View (layout) and an inner bordered View (the one whose borderColor changes on focus). If you put `testID` on the outer wrapper and pass the same prop through to TextInput, style assertions on the border view become impossible. Fix: give the bordered wrapper a dedicated `containerTestID` prop, let the standard `testID` flow to the `TextInput` via the rest-spread. Tests can then independently access both elements. |
| May 2026 | `supabase.auth.signUp` sends a magic link by default, not a 6-digit OTP | `signUp` triggers the "Confirm signup" email template which sends a clickable link. For OTP code entry screens, use `supabase.auth.signInWithOtp({ email })` instead, and set the Supabase "Magic Link" email template to use `{{ .Token }}` (not `{{ .ConfirmationURL }}`). |
| May 2026 | Supabase `upsert` without `onConflict` uses the primary key, not a unique column | Calling `supabase.from('verification').upsert({ user_id: id, ... })` without `{ onConflict: 'user_id' }` generates a new `id` UUID and tries to INSERT, hitting the unique constraint on `user_id`. Always specify `{ onConflict: 'column_name' }` when upserting on a non-PK unique column. |
| May 2026 | RLS `UPDATE` policy required for `upsert` to work on existing rows | Supabase `upsert` = INSERT on first call, UPDATE on subsequent calls. If the table has RLS enabled and no `FOR UPDATE` policy, the update path is silently blocked ("new row violates row-level security policy"). Add a matching UPDATE policy whenever you use upsert. |
| May 2026 | Hermes framework must be manually pre-extracted on Xcode 26 | After every clean `pod install`, the `[Hermes] Replace Hermes for the right configuration` build phase script fails to extract the `.tar.gz` artifacts in `ios/Pods/hermes-engine-artifacts/`. Fix: `cd ios/Pods/hermes-engine && mkdir -p destroot && tar -xzf ../hermes-engine-artifacts/hermes-ios-<version>-debug.tar.gz -C destroot --strip-components=1`. Must be repeated after every clean pod install until this Xcode 26 / RN 0.81.x incompatibility is resolved upstream. |
| May 2026 | `expo run:ios` must be run from the project root | Running `npx expo run:ios` from any subdirectory (e.g. after `cd`ing into a Pods folder) causes `@expo/config` to treat that subdirectory as the project root, throwing `ConfigError: The expected package.json path does not exist`. Always `cd /path/to/project` before running Expo CLI commands. |
| May 2026 | `@stripe/stripe-react-native` ≥ 0.56 moved Identity to a separate package | `presentIdentityVerificationSheet` was removed from the main `useStripe()` hook and moved to `@stripe/stripe-identity-react-native`. Upgrading from 0.50.x to 0.65.x will break any code using this API. For beta, replace with a direct Supabase verification upsert; wire up the real Identity package in Phase 15. |
| May 2026 | `stripe-react-native@0.50.3` `STPPaymentStatus` enum crashes Xcode 26 | Xcode 26's stricter Swift/ObjC bridging rejects the `STPPaymentStatus` enum being declared as both `NSUInteger` (ObjC header) and `NSInteger` (Swift bridging header). Fix: upgrade `@stripe/stripe-react-native` to ≥ 0.65.1. |
| May 2026 | iOS build fails when Pods are partially downloaded | Stripe pods ship large localisation bundles. If `pod install` is interrupted or has network issues, locale `.lproj` files and `PrivacyInfo.xcprivacy` may be missing, causing build failures. Fix: `rm -rf ios/Pods ios/Podfile.lock && LANG=en_US.UTF-8 pod install --repo-update` to force a full re-download. |
| May 2026 | CodeRabbit `CHANGES_REQUESTED` never auto-clears | CodeRabbit posts comment-type reviews across many commits but rarely submits an APPROVE, so GitHub's `reviewDecision` stays `CHANGES_REQUESTED` even after every finding is fixed. To merge: verify findings against the *live* code first, then either dismiss the stale reviews or `gh pr merge --squash --admin` when CI is green. |
| May 2026 | `autoApprove` is not a valid settings.json key | To stop tool-approval prompts use `permissions.defaultMode` ("bypassPermissions" / "acceptEdits") or `permissions.allow` — NOT a fictional `autoApprove` array, which is silently ignored. `permissions.defaultMode` is read at startup, so a Claude Code restart is needed for it to take effect. |
| May 2026 | Squash-merge auto-deletes the head branch | GitHub's "auto-delete head branches" removes the remote branch on merge, so a follow-up `git push origin --delete <branch>` errors with "remote ref does not exist" (harmless). Also: a PR branched from a red `main` inherits the failure — fix `main` first (merge the fix), then rebase the dependent branch. |
| 31 May 2026 | Passing Jest tests ≠ correct code — always run `tsc --noEmit` | An overnight build had 709 green tests but 77 TypeScript errors. Jest mocks Supabase and Babel strips types, so type errors sail through. CI must include a `tsc --noEmit` step, and Claude must run it after any batch of work before claiming a phase done. |
| 31 May 2026 | Regenerate `types/database.ts` after every schema migration | The 77 type errors were all `Property X does not exist on type 'never'` — caused by new tables (rides/bookings/messages/reviews) being added in migrations but the `Database` type never updated, so `supabase.from('rides')` typed as `never`. After any migration, run `supabase gen types typescript` (needs the Management token) or hand-update the types. |
| 31 May 2026 | Never commit `coverage/` or generated artifacts | An overnight session committed 42 generated `coverage/` HTML files (incl. `' 2.tsx'` worktree duplicates), `supabase/.temp/`, and `.claude/launch.json`. These must stay gitignored. Run `git status` before committing and never `git add -A` blindly. |
| 31 May 2026 | "Scaffolded + mocked tests" is not "done" | An autonomous run claimed Stages 21–88 complete; in reality 39–88 (payments, app store) were scaffolds with placeholder keys and no real verification. Only mark a stage ✅ after it typechecks, its tests are meaningful, and (for anything visual/behavioural) it's verified on the simulator. |

---

## 10. Important Links & References

- Master Plan Doc: stored in previous Cowork session (Jordan has a copy)
- Claude Design: https://claude.ai/design
- Stripe Connect docs: https://docs.stripe.com/connect
- Google Maps Routes API: https://developers.google.com/maps/documentation/routes
- Citizens Information (SPSV): https://www.citizensinformation.ie/en/travel-and-recreation/public-transport/regulation-of-taxis-and-small-public-service-vehicles/
- Revenue.ie mileage rates: https://www.revenue.ie/en/employing-people/employee-expenses/travel-and-subsistence/civil-service-rates.aspx
- HMRC AMAP rates: https://www.gov.uk/government/publications/rates-and-allowances-travel-mileage-and-fuel-allowances
- BlaBlaCar tech stack: https://stackshare.io/blablacar/blablacar
