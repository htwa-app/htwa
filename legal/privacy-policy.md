
# htwa Privacy Policy

**Last updated:** 19 July 2026 (PLACEHOLDER — PENDING ADVISER REVIEW)  
**Effective date:** To be confirmed on launch

---

## 1. Who We Are

htwa ("we", "us", "our") operates the htwa mobile application and website at htwa-app.com. htwa is a cost-sharing rideshare platform connecting Irish university students for shared journeys across Ireland and Northern Ireland.

For the purposes of data protection law:
- In the Republic of Ireland: we are a data controller under the **General Data Protection Regulation (GDPR)** and the **Data Protection Acts 1988–2018**
- In Northern Ireland: we are a data controller under **UK GDPR** and the **Data Protection Act 2018**

**Contact:** hello@htwa-app.com

---

## 2. What Data We Collect

### 2.1 Account Data
- Full name
- Email address
- Phone number
- University or college
- Home location (Republic of Ireland or Northern Ireland — used to set currency and applicable mileage rates)
- Profile photo (optional)

### 2.2 Verification Data
**Every user must complete identity verification before booking or posting a journey** (browsing/search is available while review is pending). This applies equally to passengers and drivers — it is not a driver-only requirement, because it protects everyone on the platform, including female drivers who need assurance about who they are picking up. <!-- ADVISER NOTE: universal identity verification (extended from driver-only) — ADVISER-BRIEFING.md item 11. -->
- Photo ID (passport, driving licence, or national ID card) — any government-issued photo ID, uploaded for identity verification only; never shown to other users
- Date of birth — confirmed as part of identity verification
- Selfie photograph (live-captured in-app) — used to match against ID document, and to confirm your identity to us; review-only and never shown to other users, **except** when you drive on htwa, where it becomes the disclosure photo shown to your booked passengers (see §4)
- Verification status (pending/approved/rejected)
- Gender <!-- ADVISER NOTE: collected at signup; used solely to power the women-only journey/filter feature (§4) and safety review — legal basis / equality-law sign-off tracked in ADVISER-BRIEFING.md item 5. -->

**Drivers additionally provide:**
- Driving licence photo — used to verify driving entitlement only; never shown to other users
- A photo of their vehicle with the registration plate visible — used to verify the registered vehicle details; never shown to other users
- Vehicle details: make, model, colour and registration number — shown to booked passengers (see §4) so they can confirm the vehicle at pickup

### 2.3 Journey Data
- Trip routes (from/to locations)
- Departure date and time
- Number of seats offered or booked
- Journey cost and payment records
- Live location during active journeys (driver only, shared with booked passengers and nominated contact)

### 2.4 Payment Data
- Payment method details (processed and stored securely by Stripe — we do not store card numbers)
- Transaction history
- Driver payout records (via Stripe Connect)

### 2.5 Safety Data
- Nominated contact name and phone number (per journey — defaults to your last-used contact and can be changed for each journey)
- Silent SOS activations, including the live or last-known location transmitted with an alert
- Route-deviation alerts (where a journey's live position departs significantly from its planned route)
- Last-known location and timestamp where live tracking disconnects mid-journey
- Journey tracking links generated and their access

### 2.6 Communications
- In-app messages between drivers and passengers
- Reviews and ratings submitted
- Support correspondence with our team

### 2.7 Technical Data
- Device type and operating system
- App version
- IP address
- Usage logs and crash reports

---

## 3. Why We Collect It (Legal Basis)

| Data | Purpose | Legal Basis |
|------|---------|-------------|
| Account data | Creating and managing your account | Contract |
| Verification data | Mandatory ID verification before platform access | Legal obligation + Legitimate interests (safety) |
| Journey data | Enabling ride matching and bookings | Contract |
| Live location | Real-time journey tracking during active trips | Contract + Consent |
| Payment data | Processing transactions via Stripe | Contract |
| Safety data | Nominated contact alerts, SOS feature | Consent |
| Technical data | App performance and security | Legitimate interests |
| Reviews | Trust and safety on the platform | Legitimate interests |

---

## 4. How We Share Your Data

We share your data only where necessary:

- **Other users:** Your first name, profile photo, verified status, and rating are visible to other users when you offer or book a journey.
- **Drivers → booked passengers:** if you drive on htwa, passengers who book your journey are shown your verified photo, full name, gender, and your vehicle's make, model, colour and registration number. This exists so passengers can confirm at pickup that the person and vehicle match what they booked — a core safety feature of the platform. It is disclosed to booked passengers only (never publicly), and drivers consent to it when offering journeys.
- **Nominated contact:** your live location, journey details and driver identity details are shared with your nominated contact during active journeys, including via Silent SOS and route-deviation alerts. If tracking disconnects, your last-known location and its timestamp are shared instead.
- **Stripe:** Payment processing. Stripe's privacy policy applies to payment data: stripe.com/privacy
- **Supabase:** Our database provider. Data is stored in EU data centres.
- **Apple/Google:** Push notification delivery only.
- **Law enforcement:** Where required by law or to protect user safety.

We do not sell your data. We do not share it with advertisers.

---

## 5. Location Data

We collect your live location **only during active journeys** and only when you have granted location permission. Location data is:
- Shared with booked passengers on your trip (if you are the driver)
- Shared with your nominated contact via the journey tracking link
- Not stored permanently — journey location data is deleted 30 days after trip completion

You can revoke location permission at any time in your device settings, but this will prevent live tracking from working.

---

## 6. ID Verification Data

Your photo ID, date of birth, and selfie are used solely for identity verification. Once verification is complete:
- The documents and date of birth are retained for 12 months in case of disputes or regulatory requests
- After 12 months, they are permanently deleted
- Verification data is never used for marketing or shared with third parties

---

## 7. How Long We Keep Your Data

| Data | Retention Period |
|------|-----------------|
| Account data | Until account deletion + 30 days |
| Journey history | 3 years (legal/financial records) |
| Payment records | 7 years (tax and accounting requirements) |
| ID verification documents + date of birth | 12 months from verification date¹ |
| Driver licence photo + vehicle photo | While the user remains an active driver, + 12 months |
| Live location data | 30 days after trip completion |
| In-app messages | Retained permanently as a safeguarding and dispute record² |
| SOS and safety alert records | Retained permanently as a safeguarding record² |
| Support correspondence | 2 years |

¹ The driver's verified photo shown to booked passengers is retained for as long as the driver offers journeys on the platform.

² In-app messages and safety-incident records cannot be deleted by users, including on account deletion. We retain them on the basis of legitimate interests (user safeguarding, dispute and incident records) — messages are exchanged between users arranging to travel together, and a permanent record protects both parties in the event of a safety incident, dispute or law-enforcement request. <!-- ADVISER NOTE: lawful basis for permanent retention vs Art. 17 right to erasure needs sign-off — ADVISER-BRIEFING.md item 6. -->

### 7A. Account deletion

When you delete your account, your `users` record is anonymised in place: your name, email, phone number, photos and other identifying details are erased or replaced with non-identifying values. Records that must be retained (journey history for legal/financial purposes, payment records for tax purposes, in-app messages and safety records for safeguarding) are kept in that anonymised or pseudonymised form. This means your identity is removed from the platform while the integrity of other users' records — for example, the other side of a chat or a shared journey record — is preserved. <!-- ADVISER NOTE: anonymise-in-place vs full erasure needs sign-off — ADVISER-BRIEFING.md item 7. -->

---

## 8. Your Rights

Under GDPR (ROI) and UK GDPR (NI), you have the right to:

- **Access** — request a copy of the personal data we hold about you
- **Rectification** — ask us to correct inaccurate data
- **Erasure** — ask us to delete your data ("right to be forgotten"), subject to legal retention requirements
- **Restriction** — ask us to limit how we use your data
- **Portability** — receive your data in a machine-readable format
- **Object** — object to processing based on legitimate interests
- **Withdraw consent** — where processing is based on consent (e.g. location sharing)

To exercise any of these rights, contact us at hello@htwa-app.com. We will respond within 30 days.

**ROI users** may also lodge a complaint with the Data Protection Commission: dataprotection.ie  
**NI users** may lodge a complaint with the Information Commissioner's Office: ico.org.uk

---

## 9. Cookies & Tracking

Our website (htwa-app.com) uses only essential cookies necessary for the waiting list form to function. We do not use advertising cookies or third-party tracking.

Our mobile app does not use cookies. We use anonymised crash reporting to improve app stability.

---

## 10. Security

We use industry-standard security measures including:
- Encryption in transit (TLS)
- Encryption at rest for sensitive data
- Row-level security on our database
- Stripe-certified payment handling (PCI DSS compliant)
- Regular security reviews

---

## 11. Children

htwa is not intended for users under 18. We do not knowingly collect data from minors. If you believe a minor has registered, contact us at hello@htwa-app.com and we will delete the account immediately.

---

## 12. Changes to This Policy

We will notify users of material changes to this policy via email and in-app notification at least 14 days before changes take effect. Continued use of the app after that date constitutes acceptance.

---

## 13. Contact

**Email:** hello@htwa-app.com  
**Instagram:** @htwa.app  
**Website:** htwa-app.com
