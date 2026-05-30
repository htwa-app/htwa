/**
 * utils/tracking.ts
 *
 * Stage 49 — Journey tracking URL generation.
 *
 * Generates the URL that is sent to the nominated contact.
 * The hosted tracking page is at https://htwa-app.com/track/[tripId]
 *
 * SMS sending via Twilio is stubbed — a TODO comment marks where the
 * Supabase Edge Function call would go.
 */

const TRACKING_BASE_URL = 'https://htwa-app.com/track';

/**
 * Generate a tracking URL for a trip.
 */
export function generateTrackingUrl(tripId: string): string {
  if (!tripId.trim()) throw new Error('tripId must not be empty');
  return `${TRACKING_BASE_URL}/${tripId}`;
}

/**
 * Stub: sends the tracking URL to the nominated contact via SMS.
 * TODO (Phase 8): call Supabase Edge Function `send-tracking-sms`
 * which uses Twilio to deliver the SMS.
 */
export async function sendTrackingLinkToContact(
  _tripId:           string,
  _contactPhone:     string,
  _contactName:      string,
): Promise<void> {
  // TODO: invoke supabase.functions.invoke('send-tracking-sms', { body: { tripId, contactPhone, contactName } })
  // Stub — no-op for now
}
