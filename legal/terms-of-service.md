
# htwa Terms of Service

**Last updated:** 19 July 2026 (PLACEHOLDER — PENDING ADVISER REVIEW)  
**Effective date:** To be confirmed on launch

---

## 1. About htwa

htwa is a cost-sharing rideshare platform for Ireland and Northern Ireland. It connects drivers and passengers who are travelling the same route and wish to share the cost of the journey.

**htwa is not a taxi service, private hire service, or transport operator.** We are a technology platform that facilitates cost-sharing between private individuals. Drivers on htwa are private individuals sharing the cost of their own journey — they are not professional drivers and must never profit from a trip.

By using htwa, you agree to these Terms of Service. If you do not agree, do not use the platform.

---

## 2. Eligibility

To use htwa you must:
- Be 18 years of age or older
- Hold a valid email address associated with an Irish or Northern Irish university or college, OR be verified as a resident of the Republic of Ireland or Northern Ireland
- Complete mandatory identity verification (photo ID, date of birth, and live selfie) before booking or posting a journey — see §5
- Agree to these Terms and our Community Safety Pledge

If you are a driver, you must additionally:
- Hold a full, valid driving licence for the vehicle you are driving
- Have valid motor insurance covering social, domestic and pleasure use (at minimum)
- Ensure your vehicle is roadworthy and has a valid NCT (ROI) or MOT (NI)

---

## 3. The Cost-Sharing Model

This is the most important section. Please read it carefully.

**3.1 Drivers may only charge passengers their share of the actual cost of the journey.** Cost is calculated using:
- **Republic of Ireland drivers:** Revenue.ie civil service mileage rates for the full journey
- **Northern Ireland drivers:** HMRC Approved Mileage Allowance Payment (AMAP) rates for the full journey

The applicable rate is determined by the driver's home jurisdiction regardless of where the journey crosses borders.

**3.2 Drivers may never profit from a journey.** The platform enforces a hard cap on the price per seat. The total amount collected from all passengers may not exceed the calculated cost of the journey. htwa will not process payments that exceed this cap.

**3.3 This cost-sharing model is what makes htwa legal.** Charging passengers more than the cost of the journey, or operating as a for-profit transport service, would require licensing under the Small Public Service Vehicles (SPSV) Regulations (ROI) or equivalent NI licensing law. Drivers who attempt to circumvent this will be permanently banned.

**3.4 htwa takes a small platform fee** from each transaction to cover operating costs. This fee is deducted from the driver's payout and is displayed clearly before any booking is confirmed.

---

## 4. User Obligations

### All Users
- Provide accurate information during registration and verification
- Behave respectfully toward other users at all times
- Not use the platform for any unlawful purpose
- Not share your account with anyone else
- Report any safety concerns or policy violations to hello@htwa-app.com

### Drivers
- Only offer rides in vehicles you are legally permitted to drive
- Ensure your insurance covers carpooling/cost-sharing arrangements (check with your insurer — most standard policies cover social, domestic and pleasure use which includes cost-sharing)
- Arrive on time at the agreed pickup location
- Drive safely and in accordance with Irish/UK road traffic law
- Not accept cash payments outside the htwa platform
- Not charge more than the htwa-calculated cost cap
- Not carry more passengers than your vehicle's legal capacity

### Passengers
- Be at the agreed pickup location on time
- Treat the driver's vehicle with respect
- Pay through the htwa platform — not in cash
- Not request stops or detours not agreed in advance

---

## 5. Verification

Every user — passenger or driver — must submit identity verification: a government-issued photo ID (passport, driving licence, or national ID card), date of birth, and a live-captured selfie. This is mandatory and non-negotiable, and applies equally to all users, not only drivers. You must be 18 or older — a date of birth indicating otherwise is rejected automatically and cannot be submitted. Submissions are manually reviewed, including cross-checking your stated date of birth against your photo ID. <!-- ADVISER NOTE: age eligibility is now enforced both client-side (app/id-verify.tsx) and at the database layer (CHECK constraint, migration 20260719210001) against the user's self-reported date of birth; the ID-document cross-check itself remains a manual step during review, not automated OCR — ADVISER-BRIEFING.md item 11. -->

While your submission is under review, you can browse and search for journeys. **Booking a seat or posting a journey requires your verification to be approved.**

Your verified status is displayed as a green "Verified" tick on your profile once approved. Users who are not approved cannot offer or book journeys.

### 5.1 Driver identity and vehicle disclosure

Drivers must upload a verified photo of themselves and register their vehicle's make, model, colour and registration number before offering journeys. When a passenger books a journey, htwa shows them the driver's verified photo, full name and gender, and the registered vehicle details, so the passenger can confirm at pickup that the person and vehicle match. By offering journeys on htwa, drivers consent to this disclosure to their booked passengers.

Drivers must keep these details accurate and current. Driving a vehicle other than the one registered for the journey, or allowing any other person to drive a journey booked under your identity, is a serious breach of these Terms and will result in permanent removal from the platform.

---

## 6. Payments

All payments are processed through Stripe. By using htwa you agree to Stripe's terms of service (stripe.com/legal).

- Passenger payment is captured at the time of booking
- Payment is released to the driver after the journey is marked complete
- htwa's platform fee is deducted automatically before the driver's payout
- Receipts are available in the app

**Cancellations:**
- Driver cancels: full refund to all passengers, no platform fee charged
- Passenger cancels more than 24 hours before departure: full refund
- Passenger cancels 24 hours or less before departure: no refund (the driver has reserved the seat and priced the journey around it)
- No-show by passenger: no refund
- Passenger declines to start a journey because the driver or vehicle does not match the verified details shown in the app (see §7A): full refund

<!-- ADVISER NOTE: the ≤24h no-refund term matches the app's implemented behaviour (services/bookings.ts). The previous draft said 50% — confirm the harder line is acceptable under ROI/UK consumer law before launch. -->

**Payment failures:** if a payment or refund fails, we will tell you what happened and what to do next. Contact hello@htwa-app.com if a payment issue is not resolved in the app.

---

## 7. Safety Features

htwa provides safety features including live journey tracking, nominated contact alerts, and Silent SOS. These features are provided as tools to support your safety — they do not make htwa responsible for your safety during a journey.

By using the platform you acknowledge that:
- htwa facilitates connections between private individuals
- htwa does not employ drivers or control how journeys are conducted
- You travel at your own risk and are responsible for your own safety decisions
- You should use the safety features provided and inform your nominated contact of your plans

### 7A. Your verification and nominated-contact responsibilities

This section is presented in-app as the Journey Verification & Safety Responsibility Acknowledgment and must be accepted before each booking.

**7A.1 Verifying your driver is your responsibility.** Before each journey, htwa shows the booking passenger the driver's verified photo, full name and gender, and the vehicle's make, model, colour and registration. You must check that the person and vehicle that arrive match these details before getting in. If they do not match, do not travel: cancel in the app and report it to us. Journeys declined at pickup because the driver or vehicle did not match the verified details are refunded in full.

**7A.2 Your nominated contact must be available.** Every journey requires a nominated contact who can follow your live journey and receive safety alerts (including Silent SOS and route-deviation alerts) while it takes place. By booking or starting a journey you confirm your nominated contact knows they are nominated, is able to receive and act on alerts at the time of the journey, and that their details are current. Your nominated contact defaults to the one used for your last journey and can be changed per journey before departure.

**7A.3 Safety tools support your judgment; they do not replace it.** Live tracking, route-deviation alerts and Silent SOS are support tools and do not transfer responsibility for your safety to htwa. In an emergency always contact 999 (ROI) or 999/112 (NI).

### 7.1 Women-only journeys

htwa offers a women-only mode. A female driver may designate a journey as women-only, and a female passenger may filter for women-only journeys. To protect the integrity of this feature:

- Only members who have recorded their gender as female may offer or join a women-only journey. This is enforced at the platform level, not merely in the app's display.
- Misrepresenting your gender to access a women-only journey is a serious breach of these Terms and will result in immediate removal from htwa and, where appropriate, referral to An Garda Síochána (ROI) or the Police Service of Northern Ireland (NI).
- Women-only journeys are a safety-support feature and, like all htwa features, do not transfer responsibility for your safety to htwa.

---

## 8. Reviews and Ratings

After each journey, both driver and passenger are invited to rate each other. Reviews must be:
- Honest and based on your actual experience
- Not defamatory, abusive, or discriminatory
- Not posted by fake or duplicate accounts

htwa reserves the right to remove reviews that violate these standards.

---

## 8A. In-App Messages and Records

In-app messages between drivers and passengers are retained by htwa for as long as needed for safeguarding, an active dispute, or a legal/regulatory request, and cannot be deleted by users on request while any of those applies. Chats close when a journey completes and remain visible to participants read-only. See the Privacy Policy §7 for the full lawful basis, who can access these records, when they're reviewed, and how to request erasure.

If you delete your account, your directly identifying details are erased or replaced with non-identifying values (see Privacy Policy §7A) — we call this **pseudonymisation**, not anonymisation, because journey, payment and message records that we are legally required to keep, or that form part of a live safeguarding record, remain linked to your (pseudonymised) account rather than being irreversibly disconnected from it. Pseudonymised data of this kind is still personal data under GDPR/UK GDPR and remains subject to the same rights described in the Privacy Policy.

---

## 9. Prohibited Conduct

The following will result in immediate account suspension and possible permanent ban:

- Charging passengers more than the permitted cost cap
- Providing false information during registration or verification
- Harassment, abuse, or discrimination of any kind
- Creating fake reviews or manipulating ratings
- Using the platform for any purpose other than genuine cost-sharing journeys
- Sharing account credentials with another person
- Attempting to make cash payments outside the platform
- Any behaviour that endangers the safety of other users

---

## 10. Liability

**10.1** htwa is a platform, not a transport operator. We are not liable for:
- The conduct of drivers or passengers
- Accidents, injuries or losses that occur during a journey
- Cancellations or no-shows by either party
- The roadworthiness of any vehicle used

**10.2** htwa's total liability to you for any claim shall not exceed the value of the transaction giving rise to that claim.

**10.3** Nothing in these terms limits liability for death, personal injury caused by negligence, fraud, or any other liability that cannot be excluded by law.

---

## 11. Insurance

Drivers are responsible for ensuring their motor insurance policy covers cost-sharing journeys. Most standard private motor insurance policies in Ireland and the UK cover social, domestic and pleasure use, which includes cost-sharing where no profit is made. However, you should confirm this with your insurer before driving on htwa.

htwa does not provide insurance to drivers or passengers.

---

## 12. Governing Law

- For users in the **Republic of Ireland:** these Terms are governed by the laws of Ireland and subject to the exclusive jurisdiction of the Irish courts.
- For users in **Northern Ireland:** these Terms are governed by the laws of Northern Ireland and subject to the exclusive jurisdiction of the courts of Northern Ireland.

Nothing in this clause deprives a consumer of the protection of mandatory consumer-law provisions of their country of residence.

---

## 13. Changes to These Terms

We will give you at least 14 days' notice of any material changes to these Terms via email and in-app notification. Continued use of the platform after that date constitutes acceptance of the updated Terms.

---

## 14. Contact

**Email:** hello@htwa-app.com  
**Instagram:** @htwa.app  
**Website:** htwa-app.com
