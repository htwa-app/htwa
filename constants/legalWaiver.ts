/**
 * constants/legalWaiver.ts
 *
 * In-app text of the Journey Verification & Safety Responsibility
 * Acknowledgment (2A-d). legal/verification-responsibility-waiver.md is the
 * LEGAL SOURCE OF TRUTH — the strings here must match it verbatim.
 * __tests__/unit/legalWaiver.test.ts enforces that: it fails the suite if this
 * file and the markdown drift apart. Update the markdown first, then mirror it
 * here (and bump WAIVER_VERSION when the adviser signs off a new version).
 */

/** Recorded in waiver_acceptances.document_version with every acceptance. */
export const WAIVER_VERSION = 'v1-placeholder-2026-07';

export const PASSENGER_WAIVER_TITLE = 'htwa Journey Verification & Safety Responsibility Acknowledgment';

export const PASSENGER_WAIVER_SECTIONS: Array<{ heading: string; body: string }> = [
  {
    heading: '1. It is your responsibility to verify your driver before getting in.',
    body: "Before the journey begins, htwa shows you the driver's verified identity: their photo, full name and gender, and their vehicle's make, model, colour and registration number. You are responsible for checking that the person and vehicle that arrive match these details exactly. If the driver or vehicle does not match — different person, different car, different registration — do not get in. Cancel the journey in the app and report it to us immediately. You will receive a full refund for any journey you decline to start because the driver or vehicle did not match the verified details.",
  },
  {
    heading: '2. You must nominate a contact who is actually available.',
    body: "Every journey requires a nominated contact — a person who can follow your live journey and receive safety alerts (including Silent SOS and route-deviation alerts) while your journey is taking place. By confirming this booking you confirm that: your nominated contact for this journey knows they are your nominated contact; they are able to receive and act on alerts at the time the journey takes place; and their contact details are current and correct. Your nominated contact defaults to the contact you used for your last journey. You can change it for any individual journey before departure. A nominated contact who is asleep, unreachable, or unaware they were nominated cannot help you — choosing an available contact is part of travelling safely.",
  },
  {
    heading: "3. htwa's safety tools support your judgment — they do not replace it.",
    body: "Live tracking, route-deviation alerts and Silent SOS are support tools. They do not make htwa responsible for your safety, and they are not a substitute for your own checks and decisions. If something feels wrong at any point — before or during a journey — trust your judgment, remove yourself from the situation, and use the SOS feature or contact emergency services (999 in ROI, 999/112 in NI).",
  },
];

export const PASSENGER_WAIVER_CHECKBOX =
  'I have read and understand the above. I accept that verifying my driver and vehicle before travelling, and nominating an available contact, are my responsibility.';

export const DRIVER_WAIVER_SECTIONS: Array<{ heading: string; body: string }> = [
  {
    heading: '1. Your identity and vehicle details will be shown to passengers.',
    body: "Passengers who book your journey will be shown your verified photo, full name and gender, and your vehicle's make, model, colour and registration number, so they can confirm they are getting into the right car with the right person. By posting a journey you consent to this information being shared with your booked passengers.",
  },
  {
    heading: '2. Your details must be accurate and current.',
    body: 'You must keep your vehicle details (including registration) up to date. Driving a different vehicle from the one shown to passengers, or allowing another person to drive a journey booked under your identity, is a serious breach of the Terms of Service and will result in permanent removal from htwa.',
  },
];

export const DRIVER_WAIVER_CHECKBOX =
  'I confirm my identity and vehicle details are accurate, and I consent to them being shown to my booked passengers.';
