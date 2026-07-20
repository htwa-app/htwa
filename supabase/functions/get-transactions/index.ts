/**
 * supabase/functions/get-transactions/index.ts
 *
 * Returns the calling user's payment history from Stripe (test mode included).
 * Identity comes from the JWT — the body userId, if sent, must match.
 *
 * Payments are found by PaymentIntent metadata (passenger_id), refunds by
 * listing refunds on each found PaymentIntent.
 *
 * Response: { transactions: Array<{ id, type, amount, currency, description, date }> }
 *   - type: 'payment' | 'refund'   (amounts in major units, e.g. 12.50)
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { getAuthedUser, json } from '../_shared/auth.ts';

const STRIPE_API = 'https://api.stripe.com/v1';

interface Tx {
  id: string;
  type: 'payment' | 'refund';
  amount: number;
  currency: string;
  description: string;
  date: string;
}

serve(async (req: Request) => {
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
  const searchRes = await fetch(`${STRIPE_API}/payment_intents/search?query=${query}&limit=50`, {
    headers: stripeHeaders,
  });
  if (!searchRes.ok) {
    console.error('[get-transactions] Stripe search error:', await searchRes.text());
    return json({ error: 'Could not load transactions' }, 502);
  }
  const found = await searchRes.json() as {
    data: Array<{ id: string; amount: number; currency: string; status: string; created: number }>;
  };

  const transactions: Tx[] = [];
  for (const pi of found.data) {
    if (pi.status !== 'succeeded') continue;
    const currency = pi.currency.toUpperCase();
    transactions.push({
      id: pi.id,
      type: 'payment',
      amount: pi.amount / 100,
      currency,
      description: 'Journey payment',
      date: new Date(pi.created * 1000).toISOString(),
    });

    const refundsRes = await fetch(`${STRIPE_API}/refunds?payment_intent=${pi.id}&limit=10`, {
      headers: stripeHeaders,
    });
    if (!refundsRes.ok) {
      console.error('[get-transactions] refunds list error for', pi.id, await refundsRes.text());
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

  transactions.sort((a, b) => (a.date < b.date ? 1 : -1));
  return json({ transactions });
});
