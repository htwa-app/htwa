# htwa Privacy Policy

**Effective date:** 1 June 2026  
**Last updated:** 30 May 2026

htwa ("we", "us", "our") is operated by htwa Ltd. This policy explains how we collect, use, and protect your personal data in compliance with the GDPR (Republic of Ireland) and UK GDPR (Northern Ireland).

---

## 1. Who we are

htwa is a cost-sharing carpool platform for Ireland and Northern Ireland. We are the data controller for data collected through the htwa app and website.

**Contact:** privacy@htwa-app.com

---

## 2. Data we collect

| Category | Examples | Purpose |
|----------|---------|---------|
| Account data | Name, email, phone number, university | Account creation and verification |
| Identity verification | Government ID document, selfie photo | Legal KYC requirement — processed by Stripe Identity |
| Location data | Real-time GPS coordinates during trips | Journey tracking, safety sharing, route calculation |
| Payment data | Payment card (tokenised), bank account for payouts | Processed exclusively by Stripe — we never store raw card data |
| Trip data | Routes, departure times, bookings | Matching drivers and passengers |
| Communication data | In-app messages | Customer support and dispute resolution |
| Device data | Device type, OS version, app version | App performance and crash reporting |

---

## 3. Legal basis for processing

- **Contract performance** — processing your booking and account data to deliver the service
- **Legal obligation** — identity verification required to operate a cost-share platform
- **Legitimate interests** — safety features, fraud prevention, platform improvement
- **Consent** — push notifications (you can withdraw at any time in settings)

---

## 4. Location data

Location data is collected **only during active trips** (when you have started a journey). It is:

- Broadcast to your nominated safety contact in real time
- Used to generate the shareable tracking link
- **Not stored permanently** after the trip ends (retained for 30 days for dispute resolution, then deleted)
- Never sold to third parties

You can revoke location permission at any time in your device settings, but this will disable the live journey safety feature.

---

## 5. Identity verification

We use **Stripe Identity** for ID and selfie verification. Stripe processes the document and biometric data on our behalf. The verified status (pass/fail) is stored in our system — the document images are retained by Stripe per their data retention policy.

---

## 6. Sharing your data

We share data with:

- **Stripe** — payments, payouts, and identity verification
- **Google** — Maps and Places APIs (route calculation only; we do not share personal data)
- **Twilio** — SMS delivery for safety notifications (phone number only)
- **Supabase** — our database and authentication provider (data hosted in EU data centres)

We do not sell personal data.

---

## 7. Data retention

| Data type | Retention period |
|-----------|-----------------|
| Account data | Until account deletion + 6 months |
| Trip data | 2 years |
| Location data | 30 days post-trip |
| Payment records | 7 years (legal requirement) |
| Identity verification | Per Stripe policy |

---

## 8. Your rights (GDPR / UK GDPR)

You have the right to:
- **Access** your personal data
- **Correct** inaccurate data
- **Delete** your data (right to erasure)
- **Restrict** processing
- **Portability** — receive your data in machine-readable format
- **Object** to processing based on legitimate interests
- **Withdraw consent** at any time

To exercise any right, email privacy@htwa-app.com. We will respond within 30 days.

To complain, contact:
- **ROI:** Data Protection Commission — [dataprotection.ie](https://www.dataprotection.ie)
- **NI/UK:** Information Commissioner's Office — [ico.org.uk](https://ico.org.uk)

---

## 9. Security

We use industry-standard security measures:
- All data in transit encrypted via TLS 1.3
- Database encrypted at rest (Supabase AES-256)
- Sensitive credentials stored in 1Password, never in source code
- Two-factor authentication on all admin accounts

---

## 10. Children

htwa is not intended for users under 18. We do not knowingly collect data from minors.

---

## 11. Changes to this policy

We will notify users of material changes via in-app notification and by updating the effective date above.
