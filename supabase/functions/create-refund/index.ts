/**
 * supabase/functions/create-refund/index.ts
 *
 * Refunds the payment for a booking. Caller must be the booking's passenger
 * or the journey's driver (verified server-side via service role — the JWT
 * is the identity source).
 *
 * Request body:
 *   { bookingId: string, reason?: 'driver_cancelled' | 'passenger_cancelled' | 'driver_mismatch' }
 *
 * All refunds are FULL refunds of the booking's PaymentIntent, with the
 * transfer reversed and the application fee refunded. WHETHER a refund is
 * due (24h window etc.) is decided by the calling code path — this function
 * only executes it. reason='driver_mismatch' additionally flags the driver's
 * account for review (account_flags).
 *
 * Response: { refundId: string, status: string }
 */

import { getAuthedUser, json, serviceHeaders, supabaseRestUrl } from '../_shared/auth.ts';

const STRIPE_API = 'https://api.stripe.com/v1';
const REASONS = ['driver_cancelled', 'passenger_cancelled', 'driver_mismatch'] as const;
type RefundReason = typeof REASONS[number];

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const svc = serviceHeaders();
  if (!stripeKey || !svc) return json({ error: 'Service not configured' }, 500);

  const user = await getAuthedUser(req);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  let body: { bookingId?: string; reason?: string };
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const { bookingId } = body;
  if (!bookingId) return json({ error: 'Missing bookingId' }, 400);
  const reason: RefundReason | null =
    body.reason && (REASONS as readonly string[]).includes(body.reason) ? body.reason as RefundReason : null;

  // 1. Load the booking + ride, verify the caller is a party to it.
  const bookingRes = await fetch(
    supabaseRestUrl(`/bookings?id=eq.${encodeURIComponent(bookingId)}&select=id,passenger_id,ride_id,payment_intent_id,rides(driver_id)`),
    { headers: svc },
  );
  if (!bookingRes.ok) {
    console.error('[create-refund] booking lookup failed:', await bookingRes.text());
    return json({ error: 'Could not load booking' }, 500);
  }
  const rows = await bookingRes.json() as Array<{
    id: string; passenger_id: string; ride_id: string;
    payment_intent_id: string | null;
    rides: { driver_id: string } | null;
  }>;
  const booking = rows[0];
  if (!booking) return json({ error: 'Booking not found' }, 404);
  const driverId = booking.rides?.driver_id ?? null;
  if (user.id !== booking.passenger_id && user.id !== driverId) {
    return json({ error: 'Forbidden' }, 403);
  }

  const stripeHeaders = {
    'Authorization': `Bearer ${stripeKey}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  // 2. Find the PaymentIntent — stored id first, metadata search as fallback.
  let paymentIntentId = booking.payment_intent_id;
  if (!paymentIntentId) {
    const query = encodeURIComponent(`metadata['booking_id']:'${bookingId}' AND status:'succeeded'`);
    const searchRes = await fetch(`${STRIPE_API}/payment_intents/search?query=${query}&limit=1`, {
      headers: stripeHeaders,
    });
    if (searchRes.ok) {
      const found = await searchRes.json() as { data: Array<{ id: string }> };
      paymentIntentId = found.data[0]?.id ?? null;
    }
  }
  if (!paymentIntentId) return json({ error: 'No payment found for this booking' }, 404);

  // 3. Full refund: reverse the driver transfer and refund the platform fee.
  // Idempotency-Key keyed on the PaymentIntent so a retried request replays
  // Stripe's first result instead of attempting a second refund.
  const refundRes = await fetch(`${STRIPE_API}/refunds`, {
    method: 'POST',
    headers: { ...stripeHeaders, 'Idempotency-Key': `refund-${paymentIntentId}` },
    body: new URLSearchParams({
      payment_intent: paymentIntentId,
      reverse_transfer: 'true',
      refund_application_fee: 'true',
      'metadata[booking_id]': bookingId,
      ...(reason ? { 'metadata[htwa_reason]': reason } : {}),
    }),
  });
  if (!refundRes.ok) {
    const errText = await refundRes.text();
    // Already-refunded is a success from the caller's perspective (idempotent
    // retry) — parse Stripe's structured error code rather than matching
    // response wording, which isn't a documented/stable contract.
    let errCode: string | undefined;
    try { errCode = (JSON.parse(errText) as { error?: { code?: string } }).error?.code; } catch { /* non-JSON body */ }
    if (errCode === 'charge_already_refunded') return json({ refundId: 'already_refunded', status: 'succeeded' });
    console.error('[create-refund] Stripe refund error:', errText);
    return json({ error: 'Refund failed' }, 502);
  }
  const refund = await refundRes.json() as { id: string; status: string };

  // 4. Driver-mismatch: flag the driver's account for review. The refund has
  //    already committed — a flag failure is logged, not surfaced as failure.
  if (reason === 'driver_mismatch' && driverId) {
    const flagRes = await fetch(supabaseRestUrl('/account_flags'), {
      method: 'POST',
      headers: svc,
      body: JSON.stringify({
        user_id: driverId,
        flag_type: 'driver_mismatch_report',
        detail: `Booking ${bookingId}: passenger reported driver/vehicle did not match verified details`,
        raised_by: user.id,
      }),
    });
    if (!flagRes.ok) console.error('[create-refund] account flag insert failed:', await flagRes.text());
  }

  return json({ refundId: refund.id, status: refund.status });
});
