/**
 * supabase/functions/create-payment-intent/index.ts
 *
 * Stage 41 — Create Stripe PaymentIntent with application fee.
 *
 * The AMOUNT IS COMPUTED SERVER-SIDE from the booking + ride + pricing_config
 * (mirroring utils/pricingEngine.ts passengerPricing + floorMoney exactly) —
 * the client's amountMinorUnits is only cross-checked and rejected on mismatch.
 * The driver's Connect account comes from payment_accounts, not the client.
 * Identity comes from the caller's JWT.
 *
 * Request body:  { bookingId, rideId, passengerId, amountMinorUnits, currency, driverStripeAccountId }
 *   (rideId / passengerId / currency / driverStripeAccountId are cross-checked)
 * Response:      { clientSecret: string, paymentIntentId: string }
 *
 * Platform fee: 10% of total (application_fee_amount on the PaymentIntent).
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { getAuthedUser, json, serviceHeaders, supabaseRestUrl } from '../_shared/auth.ts';

const STRIPE_API = 'https://api.stripe.com/v1';
/** Platform fee: 10% of total charge */
const PLATFORM_FEE_RATE = 0.10;

/** Mirror of utils/pricingEngine.ts floorMoney — floor to minor unit with float guard. */
function floorMoney(value: number): number {
  return Math.floor((value + 1e-9) * 100) / 100;
}

serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const svc = serviceHeaders();
  if (!stripeKey || !svc) return json({ error: 'Service not configured' }, 500);

  const user = await getAuthedUser(req);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  let body: {
    bookingId?: string; rideId?: string; passengerId?: string;
    amountMinorUnits?: number; currency?: string; driverStripeAccountId?: string;
  };
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const { bookingId, amountMinorUnits, currency } = body;
  if (!bookingId || !amountMinorUnits || !currency) return json({ error: 'Missing required fields' }, 400);
  if (body.passengerId && body.passengerId !== user.id) return json({ error: 'Forbidden' }, 403);

  // 1. Booking + ride, server-side.
  const bookingRes = await fetch(
    supabaseRestUrl(
      `/bookings?id=eq.${bookingId}&select=id,passenger_id,ride_id,seats_booked,status,` +
      `rides(id,driver_id,cost_per_seat,currency)`,
    ),
    { headers: svc },
  );
  if (!bookingRes.ok) {
    console.error('[create-payment-intent] booking lookup failed:', await bookingRes.text());
    return json({ error: 'Could not load booking' }, 500);
  }
  const rows = await bookingRes.json() as Array<{
    id: string; passenger_id: string; ride_id: string; seats_booked: number; status: string;
    rides: { id: string; driver_id: string; cost_per_seat: number | string; currency: string } | null;
  }>;
  const booking = rows[0];
  if (!booking || !booking.rides) return json({ error: 'Booking not found' }, 404);
  if (booking.passenger_id !== user.id) return json({ error: 'Forbidden' }, 403);
  if (body.rideId && body.rideId !== booking.ride_id) return json({ error: 'Booking/ride mismatch' }, 400);
  if (booking.status === 'cancelled' || booking.status === 'declined') {
    return json({ error: 'Booking is no longer active' }, 409);
  }
  if (currency.toUpperCase() !== booking.rides.currency.toUpperCase()) {
    return json({ error: 'Currency mismatch' }, 400);
  }

  // 2. Pricing config (service charge + booking fee) — DB is the source of truth.
  const configRes = await fetch(supabaseRestUrl('/pricing_config?select=key,value'), { headers: svc });
  if (!configRes.ok) {
    console.error('[create-payment-intent] pricing_config fetch failed:', await configRes.text());
    return json({ error: 'Pricing unavailable' }, 500);
  }
  const config = new Map(
    ((await configRes.json()) as Array<{ key: string; value: number | string }>).map((c) => [c.key, Number(c.value)]),
  );
  const serviceChargeRate = config.get('service_charge_rate');
  const bookingFee = config.get('booking_fee');
  if (!Number.isFinite(serviceChargeRate) || !Number.isFinite(bookingFee)) {
    return json({ error: 'Pricing unavailable' }, 500);
  }

  // 3. Server-computed amount (mirrors pricingEngine.passengerPricing).
  const driverSeatPrice = Number(booking.rides.cost_per_seat);
  const passengerSeatPrice = floorMoney(
    driverSeatPrice + floorMoney(driverSeatPrice * (serviceChargeRate as number)) + (bookingFee as number),
  );
  const expectedMinorUnits = Math.round(passengerSeatPrice * booking.seats_booked * 100);
  if (expectedMinorUnits !== amountMinorUnits) {
    console.error(`[create-payment-intent] amount mismatch: client ${amountMinorUnits}, server ${expectedMinorUnits}`);
    return json({ error: 'Amount mismatch — please refresh and try again' }, 409);
  }

  // 4. Driver's Connect account from payment_accounts (never from the client).
  const acctRes = await fetch(
    supabaseRestUrl(`/payment_accounts?user_id=eq.${booking.rides.driver_id}&select=stripe_connect_account_id`),
    { headers: svc },
  );
  if (!acctRes.ok) {
    console.error('[create-payment-intent] payment_accounts fetch failed:', await acctRes.text());
    return json({ error: 'Could not load driver payment account' }, 500);
  }
  const acctRows = await acctRes.json() as Array<{ stripe_connect_account_id: string | null }>;
  const destination = acctRows[0]?.stripe_connect_account_id;
  if (!destination) return json({ error: 'Driver has no payment account yet' }, 409);

  const applicationFee = Math.round(expectedMinorUnits * PLATFORM_FEE_RATE);

  // 5. Create the PaymentIntent.
  const piRes = await fetch(`${STRIPE_API}/payment_intents`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      amount: String(expectedMinorUnits),
      currency: currency.toLowerCase(),
      'payment_method_types[]': 'card',
      'transfer_data[destination]': destination,
      application_fee_amount: String(applicationFee),
      'metadata[booking_id]': booking.id,
      'metadata[ride_id]': booking.ride_id,
      'metadata[passenger_id]': user.id,
    }),
  });
  if (!piRes.ok) {
    console.error('[create-payment-intent] Stripe error:', await piRes.text());
    return json({ error: 'Could not create payment' }, 502);
  }
  const pi = await piRes.json() as { id: string; client_secret: string };

  // 6. Record the PaymentIntent on the booking so refunds can find it without
  //    a Stripe search. The PI exists either way — a failed write is logged.
  const patchRes = await fetch(supabaseRestUrl(`/bookings?id=eq.${booking.id}`), {
    method: 'PATCH',
    headers: svc,
    body: JSON.stringify({ payment_intent_id: pi.id }),
  });
  if (!patchRes.ok) console.error('[create-payment-intent] payment_intent_id write failed:', await patchRes.text());

  return json({ clientSecret: pi.client_secret, paymentIntentId: pi.id });
});
