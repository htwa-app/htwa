/**
 * supabase/functions/get-transactions/index.ts
 *
 * Returns the calling user's payment history from Stripe (test mode included).
 * Identity comes from the JWT — the body userId, if sent, must match.
 *
 * Payments are found by PaymentIntent metadata (passenger_id), refunds by
 * listing refunds on each found PaymentIntent.
 *
 * Driver view: journeys the caller DROVE that were paid are found through the
 * DB (bookings.payment_intent_id on the caller's rides — recorded by
 * create-payment-intent, so this works for every PaymentIntent, not just newer
 * ones carrying driver metadata) and each PaymentIntent is retrieved from
 * Stripe. The payout shown is what the driver actually receives under the
 * destination-charge model: charge amount minus the platform application fee.
 * Fully refunded charges are skipped (the transfer is reversed on refund).
 *
 * Response: { transactions: Array<{ id, type, amount, currency, description, date }>, partial?: true }
 *   - type: 'payment' | 'refund' | 'payout'   (amounts in major units, e.g. 12.50)
 *   - partial: true when any individual Stripe lookup failed — the list is then
 *     incomplete and the client must say so rather than present it as complete.
 *   - A failure of the main lookups (Stripe search, the DB driver query) is an
 *     HTTP 502, never a 200 with an empty list.
 */

import { getAuthedUser, json, serviceHeaders, supabaseRestUrl } from '../_shared/auth.ts';

const STRIPE_API = 'https://api.stripe.com/v1';

interface Tx {
  id: string;
  type: 'payment' | 'refund' | 'payout';
  amount: number;
  currency: string;
  description: string;
  date: string;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeKey) return json({ error: 'Service not configured' }, 500);

  const user = await getAuthedUser(req);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  let body: { userId?: string };
  try { body = await req.json(); } catch { body = {}; }
  if (body.userId && body.userId !== user.id) return json({ error: 'Forbidden' }, 403);

  const stripeHeaders = { 'Authorization': `Bearer ${stripeKey}` };
  const query = encodeURIComponent(`metadata['passenger_id']:'${user.id}'`);

  // Stripe's Search API paginates via has_more/next_page (a cursor token),
  // not starting_after (that's the List API) — loop until exhausted so a
  // user with >100 PaymentIntents (2 pages) doesn't silently lose history.
  type PI = { id: string; amount: number; currency: string; status: string; created: number };
  const allPis: PI[] = [];
  let nextPage: string | null = null;
  do {
    const pageParam = nextPage ? `&page=${encodeURIComponent(nextPage)}` : '';
    const searchRes = await fetch(
      `${STRIPE_API}/payment_intents/search?query=${query}&limit=100${pageParam}`,
      { headers: stripeHeaders },
    );
    if (!searchRes.ok) {
      console.error('[get-transactions] Stripe search error:', await searchRes.text());
      return json({ error: 'Could not load transactions' }, 502);
    }
    const found = await searchRes.json() as { data: PI[]; has_more: boolean; next_page: string | null };
    allPis.push(...found.data);
    nextPage = found.has_more ? found.next_page : null;
  } while (nextPage);

  const succeeded = allPis.filter((pi) => pi.status === 'succeeded');

  // One refunds-list call per PaymentIntent, run in parallel — allSettled so
  // a single failed lookup only drops that PI's refunds, not the whole response.
  const refundResults = await Promise.allSettled(
    succeeded.map((pi) => fetch(`${STRIPE_API}/refunds?payment_intent=${pi.id}&limit=10`, { headers: stripeHeaders })),
  );

  const transactions: Tx[] = [];
  let partial = false;
  for (let i = 0; i < succeeded.length; i++) {
    const pi = succeeded[i];
    transactions.push({
      id: pi.id,
      type: 'payment',
      amount: pi.amount / 100,
      currency: pi.currency.toUpperCase(),
      description: 'Journey payment',
      date: new Date(pi.created * 1000).toISOString(),
    });

    const result = refundResults[i];
    if (result.status === 'rejected') {
      console.error('[get-transactions] refunds list request failed for', pi.id, result.reason);
      partial = true;
      continue;
    }
    const refundsRes = result.value;
    if (!refundsRes.ok) {
      console.error('[get-transactions] refunds list error for', pi.id, await refundsRes.text());
      partial = true;
      continue;
    }
    const refunds = await refundsRes.json() as {
      data: Array<{ id: string; amount: number; currency: string; status: string; created: number }>;
    };
    for (const r of refunds.data) {
      if (r.status !== 'succeeded' && r.status !== 'pending') continue;
      transactions.push({
        id: r.id,
        type: 'refund',
        amount: r.amount / 100,
        currency: r.currency.toUpperCase(),
        description: 'Journey refund',
        date: new Date(r.created * 1000).toISOString(),
      });
    }
  }

  // ── Driver view: payouts for journeys the caller drove ──────────────────────
  const svc = serviceHeaders();
  if (!svc) return json({ error: 'Service not configured' }, 500);
  const drivenRes = await fetch(
    supabaseRestUrl(
      `/bookings?select=id,payment_intent_id,rides!inner(driver_id)` +
      `&rides.driver_id=eq.${encodeURIComponent(user.id)}&payment_intent_id=not.is.null`,
    ),
    { headers: svc },
  );
  if (!drivenRes.ok) {
    console.error('[get-transactions] driver bookings lookup failed:', await drivenRes.text());
    return json({ error: 'Could not load transactions' }, 502);
  }
  const driven = await drivenRes.json() as Array<{ payment_intent_id: string }>;
  const driverPiIds = [...new Set(driven.map((b) => b.payment_intent_id))];

  type DriverPI = {
    id: string; amount: number; currency: string; status: string; created: number;
    application_fee_amount: number | null;
    latest_charge: { amount: number; amount_refunded: number } | null;
  };
  const driverPiResults = await Promise.allSettled(
    driverPiIds.map((id) =>
      fetch(`${STRIPE_API}/payment_intents/${encodeURIComponent(id)}?expand[]=latest_charge`, { headers: stripeHeaders }),
    ),
  );
  for (let i = 0; i < driverPiIds.length; i++) {
    const result = driverPiResults[i];
    if (result.status === 'rejected' || !result.value.ok) {
      console.error('[get-transactions] driver PaymentIntent lookup failed for', driverPiIds[i]);
      partial = true;
      continue;
    }
    const pi = await result.value.json() as DriverPI;
    if (pi.status !== 'succeeded') continue;
    if (pi.latest_charge && pi.latest_charge.amount_refunded >= pi.latest_charge.amount) continue; // fully refunded → transfer reversed
    transactions.push({
      id: `payout_${pi.id}`,
      type: 'payout',
      amount: (pi.amount - (pi.application_fee_amount ?? 0)) / 100,
      currency: pi.currency.toUpperCase(),
      description: 'Journey payout',
      date: new Date(pi.created * 1000).toISOString(),
    });
  }

  transactions.sort((a, b) => (a.date < b.date ? 1 : -1));
  return json(partial ? { transactions, partial: true } : { transactions });
});
