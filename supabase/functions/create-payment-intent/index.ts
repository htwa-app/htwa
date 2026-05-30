/**
 * supabase/functions/create-payment-intent/index.ts
 *
 * Stage 41 — Create Stripe PaymentIntent with application fee.
 *
 * Request body:
 *   { bookingId, rideId, passengerId, amountMinorUnits, currency, driverStripeAccountId }
 *
 * Response:
 *   { clientSecret: string, paymentIntentId: string }
 *
 * Platform fee: 10% of total (application_fee_amount on the PaymentIntent).
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const STRIPE_API    = 'https://api.stripe.com/v1';
/** Platform fee: 10% of total charge */
const PLATFORM_FEE_RATE = 0.10;

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' },
    });
  }

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeKey) {
    return new Response(JSON.stringify({ error: 'Stripe key not configured' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: {
    bookingId?: string;
    rideId?: string;
    passengerId?: string;
    amountMinorUnits?: number;
    currency?: string;
    driverStripeAccountId?: string;
  };
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } }); }

  const { bookingId, rideId, passengerId, amountMinorUnits, currency, driverStripeAccountId } = body;

  if (!bookingId || !rideId || !passengerId || !amountMinorUnits || !currency || !driverStripeAccountId) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const applicationFee = Math.round(amountMinorUnits * PLATFORM_FEE_RATE);

  const params = new URLSearchParams({
    amount:                     String(amountMinorUnits),
    currency:                   currency.toLowerCase(),
    'payment_method_types[]':   'card',
    'transfer_data[destination]': driverStripeAccountId,
    application_fee_amount:     String(applicationFee),
    'metadata[booking_id]':     bookingId,
    'metadata[ride_id]':        rideId,
    'metadata[passenger_id]':   passengerId,
  });

  const res = await fetch(`${STRIPE_API}/payment_intents`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  if (!res.ok) {
    const err = await res.text();
    return new Response(JSON.stringify({ error: `Stripe error: ${err}` }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }

  const pi = await res.json() as { id: string; client_secret: string };
  return new Response(
    JSON.stringify({ clientSecret: pi.client_secret, paymentIntentId: pi.id }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
});
