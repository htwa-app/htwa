
# htwa — Legal Adviser Briefing Pack

**Prepared:** 17 July 2026
**From:** Jordan Madden, founder — hello@htwa-app.com
**Covers:** Republic of Ireland and Northern Ireland (both jurisdictions apply to every item unless stated)

---

## What htwa is (2-minute context)

htwa is a cost-sharing carpool app for Ireland and Northern Ireland, aimed first at university students. Drivers post journeys they are already making; passengers pay a share of the journey's cost. The core legal position is that htwa is **not** a taxi/private-hire service: drivers can never profit. Prices are derived from official mileage rates (Revenue.ie civil service rates for ROI drivers; HMRC AMAP rates for NI drivers, chosen by the driver's home jurisdiction), the total a driver recovers is capped at cost, and the platform enforces this in software — drivers cannot set or edit prices. htwa takes a 10% service charge plus a flat £2/€2 booking fee from the passenger, on top of the driver's cost share (the driver never receives more than cost).

Safety is the brand: mandatory ID + selfie verification for all users, driver identity/vehicle disclosure to passengers before travel, live journey tracking shared with a nominated contact, route-deviation alerts, a silent SOS button, women-only journeys, and permanently retained in-app chat records.

Target launch: September 2026 (university semester start). Beta testing planned for August.

**All documents referenced below are drafts prepared without legal input, marked "PLACEHOLDER — PENDING ADVISER REVIEW". Nothing has launched.**

---

## Items needing your review and sign-off

### A. The core model

**1. Cost-sharing at full official mileage rate.**
Drivers recover cost calculated at the full Revenue.ie / HMRC AMAP rate for the journey, split fixed at one-fifth per seat (÷5, standard vehicle capacity, maximum 4 bookable seats). Is charging at the *full* official rate (rather than a discounted rate) defensible as genuine cost-sharing in both jurisdictions — i.e. does it keep drivers outside SPSV licensing (ROI) and taxi/PHV licensing (NI), and outside "hire or reward" for insurance purposes?

**2. Honour-system annual mileage total.**
The UK AMAP rate drops after 10,000 miles/year. htwa tracks a driver's cumulative platform mileage automatically but relies on the driver manually declaring non-platform mileage (an unenforced "+1" system). Is this adequate, or does it create exposure if a driver under-declares and is paid above the applicable rate?

**3. Insurance attestation wording.**
At driver onboarding, drivers tick confirmations that (a) they hold a valid insurance certificate and (b) they have notified their insurer they intend to cost-share. Please review the exact checkbox wording in the app (marked `PLACEHOLDER LEGAL TEXT` in `app/driver-onboarding.tsx`) and confirm the attestations are adequate — in particular whether the no-profit condition keeps standard social/domestic/pleasure policies valid in both jurisdictions, and whether our wording creates any duty on htwa to verify cover.

**4. Driver declaration wording.**
The onboarding declaration (tax residence, mileage-rate basis, no off-app reimbursement, responsibility disclaimer) is drafted in `app/driver-onboarding.tsx` (`declarationText()`, version v1-placeholder-2026-06). Please review/replace.

### B. Safety features and data

**5. Gender safety disclaimer + women-only journeys.**
We record gender (Female/Male, as shown on government ID) at signup, with this in-app disclaimer: *"Everyone is free to identify however they wish. For the safety and protection of our users, we record the gender shown on your government-issued ID, for consistency and safety. This also enables our women-only journeys feature."* Women-only journeys are enforced at database level in both directions (female drivers can restrict journeys; female passengers can filter). Questions: (a) is the disclaimer wording appropriate; (b) is the two-option ID-based approach lawful under equality law in both jurisdictions (ROI Equal Status Acts / NI equality law); (c) any GDPR issue with the gender field's purpose limitation?

**6. Permanent chat retention vs right to erasure.**
In-app messages between users are retained permanently as a safeguarding/dispute record and cannot be deleted, including on account deletion (messages are anonymised, not erased). Proposed lawful basis: legitimate interests (safeguarding, dispute/incident records). Does this stand up against GDPR/UK GDPR Article 17, and what must the privacy policy disclose?

**7. Account deletion = anonymise-in-place.**
On account deletion we scrub the user's identifying fields (name, email, phone, photos) but retain the anonymised row so linked records (chats, journeys, payments) stay intact. Journey/payment records are retained for legal/financial periods regardless. Is this an acceptable implementation of erasure?

**8. Driver identity disclosure to passengers. (NEW)**
Driver verification requires: a driving licence photo, a live-captured selfie, a photo of the car with registration plate visible, and entered vehicle details (make/model/colour/registration), manually reviewed before the driver can post journeys. Before travel, a booking passenger is shown the driver's verified selfie (never the licence), full name, gender, and vehicle make/model/colour/registration, so they can check the person and car match at pickup. Drivers consent at onboarding; disclosure is to booked passengers only. Questions: (a) is driver consent at onboarding sufficient, or should this be framed as necessary-for-contract/legitimate-interests; (b) any issue disclosing gender specifically; (c) any concerns holding driving-licence images and vehicle photos (retention drafted as active-driver period + 12 months); (d) retention obligations for the passenger-facing disclosure surface.

**9. Verification responsibility waiver. (NEW)**
Passengers must accept, per booking, an acknowledgment that: verifying the driver/vehicle match at pickup is their responsibility; their nominated contact must be genuinely available during the journey; and safety tools do not transfer responsibility to htwa. Draft at `legal/verification-responsibility-waiver.md` and Terms §7A. Questions: (a) is this enforceable as drafted in both jurisdictions; (b) does it improperly attempt to exclude liability that cannot be excluded (we have kept the standard carve-out for death/personal injury by negligence); (c) is per-booking acceptance (checkbox + stored timestamp + document version) adequate evidence?

**10. Nominated contact data. (NEW)**
The nominated contact is a third party whose name and phone number the user provides, and who receives live tracking, deviation alerts and SOS alerts (with live or last-known location). The contact may not be an htwa user and has not consented to us processing their details. What is the correct basis and what notice (if any) must we give the contact — e.g. a first-contact SMS explaining what they've been nominated for with an opt-out?

**11. Universal identity verification — extended to all users, not just drivers. (NEW)**
Previously only drivers went through a manual verification review; passengers just ticked a placeholder. Every user (driver or passenger) must now provide: any government-issued photo ID (passport, driving licence, or national ID card), date of birth, and a live selfie, reviewed manually before that user can book a seat or post a journey (browsing/searching is available while review is pending — see item 8 for the separate, additional driving-licence/vehicle disclosure drivers provide). Rationale: this is a safety measure so that, in particular, female drivers have the same verified-identity assurance about who they are picking up that passengers already have about drivers. Data, retention and manual-review model mirror the existing driver verification (item 8) and are reflected in `privacy-policy.md` §2.2/§6/§7. Questions: (a) is "any photo ID" (rather than a single accepted document type) adequate for verification purposes; (b) is retaining date of birth alongside the ID document for the same 12-month period appropriate, or does DOB need separate/shorter treatment; (c) anything specific to flag for collecting this from passengers who are not driving (i.e. no vehicle/insurance angle, purely identity/safety); (d) **age gate (resolved 19 Jul, was flagged as a gap):** Terms §2/§5 state users must be 18+; the app now enforces this against the self-reported date of birth both client-side (`app/id-verify.tsx` blocks submission) and at the database layer (a CHECK constraint on `verification.date_of_birth`, migration `20260719210001`, live-tested to reject an under-18 DOB). The DOB itself is still self-reported, not OCR'd from the document — Jordan manually cross-checks the stated DOB against the uploaded photo ID during review, same as every other verification field. Please advise whether self-report + manual human cross-check is adequate evidence of age for this purpose, or whether something more (e.g. automated document OCR) is expected in either jurisdiction.

### C. Commercial terms

**12. Cancellation/refund policy.**
Implemented behaviour: driver cancels → full refund; passenger cancels >24h before departure → full refund; ≤24h → **no refund**; no-show → no refund; passenger declines to travel because driver/vehicle doesn't match verified details → full refund. Is the ≤24h no-refund line acceptable under ROI/UK consumer law (including distance-contract cancellation rules) for this kind of booking?

**13. Governing law split.**
Terms use Irish law/courts for ROI users and Northern Ireland law/courts for NI users, with a consumer mandatory-protection carve-out. Sensible? Any cross-border wrinkles for journeys that span both jurisdictions?

### D. Documents to review

All in the app repository under `legal/`:

| Document | Status |
|---|---|
| `terms-of-service.md` | Updated 17 Jul — new §5.1 (driver disclosure), §7A (responsibility waiver), §8A (message retention), refund + governing-law fixes. Updated 19 Jul — §2/§5 extended to universal identity verification (photo ID + DOB + selfie, all users); 18+ eligibility now DB-enforced against self-reported DOB, cross-checked manually against the photo ID during review |
| `privacy-policy.md` | Updated 17 Jul — driver-ID disclosure, per-journey nominated contact, safety-alert data, permanent message retention, account deletion §7A. Updated 19 Jul — §2.2/§6/§7 extended to cover universal identity verification (photo ID + date of birth + gender, all users, not just drivers) |
| `verification-responsibility-waiver.md` | New 17 Jul — full in-app acknowledgment text |
| `community-safety-pledge.md` | Unchanged (plain-English pledge shown at signup) |
| `cookie-policy.md` | Unchanged (essential cookies only) |
| In-app copy | Driver declaration + insurance checkboxes (`app/driver-onboarding.tsx`), gender disclaimer (`app/signup.tsx`) — all marked `PLACEHOLDER LEGAL TEXT` |

---

## What we need back

For each item: sign-off as-is, amended wording, or "stop — structural problem". Items 1–3 are the highest priority (they underpin the legality of the whole model); items 8–11 are next (they gate the safety features we're building now); the rest can follow. We're aiming to freeze legal copy by end of August for a September launch.
