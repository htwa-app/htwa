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

If in doubt about whether an action falls under these rules, stop and ask first.

---

## 1. What Is HTWA?

HTWA is a **cost-sharing rideshare app for Ireland** (and Northern Ireland).

It is not a taxi service. The legal model is a **carpool platform** — drivers share the cost of a journey with passengers, and can never profit from a ride. This distinction is what keeps the platform legal without requiring taxi/SPSV licensing.

The name HTWA stands for **[confirm full name with Jordan]**. Domains to purchase (not yet bought as of last session):
- `htwa.ie`
- `htwa.app`
- `htwa.co.uk`

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
| Claude Code | AI coding assistant | ✅ Installed |
| Claude Design | UI/UX mockups and prototypes | ✅ Accessible at claude.ai/design |
| VS Code | Code editor (visual interface) | ✅ Installed |
| Node.js | Runtime environment | ✅ Installed |
| npm | Package manager (bundled with Node) | ✅ Installed |
| Git | Version control | ✅ Installed |
| GitHub | Remote repo / backup | ✅ Account exists, connecting now |
| Stripe Connect | Payments + application fees | Planned |
| Google Maps Routes API | Route calculation + toll fees | Planned |
| Xcode | iOS build tool | Planned |
| Android Studio | Android build tool | Planned |
| GitHub Desktop | Visual Git interface | Planned |
| 1Password | Credentials management | Planned |

### Explicitly Rejected Tools
- ~~Cursor~~ — replaced by Claude Code
- ~~Figma~~ — replaced by Claude Design

### Mobile
- Target: iOS + Android
- Both app stores required (Apple App Store + Google Play)
- Apple App Store Review Guidelines apply

---

## 6. Project Folder Structure

This folder (`HTWA/` on Jordan's Desktop) is the **shared workspace** between Cowork and Claude Code.

- Both Claude Code and Cowork read/write to this folder
- `CLAUDE.md` (this file) is the living brain — update it as decisions are made
- All code, assets, and documents for the project live here

---

## 7. Current Status (as of 29 April 2026)

### Completed
- [x] Project concept defined and master plan written
- [x] Legal model validated (cost-share carpool, not taxi)
- [x] Tools stack decided (Claude Code + Claude Design replacing Cursor + Figma)
- [x] Node.js installed
- [x] Claude Code installed and accessible via Terminal (`claude`)
- [x] VS Code installed
- [x] Git installed
- [x] GitHub account exists
- [x] HTWA project folder created on Desktop
- [x] Cowork connected to HTWA folder
- [x] CLAUDE.md created (this file)

### In Progress
- [ ] Connect Claude Code to GitHub (create repo, initialise, push)

### Next Up
- [ ] Purchase domains: htwa.ie, htwa.app, htwa.co.uk
- [ ] Scaffold the project (initialise Node/React Native project)
- [ ] Set up Stripe Connect account
- [ ] Begin UI mockups in Claude Design

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
