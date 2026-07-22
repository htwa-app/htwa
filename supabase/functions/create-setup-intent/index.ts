/**
 * supabase/functions/create-setup-intent/index.ts
 *
 * Creates a Stripe SetupIntent so the app can collect and save a card.
 * Gets or creates the Stripe Customer for the calling user (stored in
 * payment_accounts.stripe_customer_id). Identity comes from the JWT.
 *
 * Response: { clientSecret: string }
 */

import { getAuthedUser, json, serviceHeaders, supabaseRestUrl } from '../_shared/auth.ts';

const STRIPE_API = 'https://api.stripe.com/v1';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const svc = serviceHeaders();
  if (!stripeKey || !svc) return json({ error: 'Service not configured' }, 500);

  const user = await getAuthedUser(req);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const stripeHeaders = {
    'Authorization': `Bearer ${stripeKey}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  // 1. Existing customer?
  let customerId: string | null = null;
  const existingRes = await fetch(
    supabaseRestUrl(`/payment_accounts?user_id=eq.${user.id}&select=stripe_customer_id`),
    { headers: svc },
  );
  if (existingRes.ok) {
    const rows = await existingRes.json() as Array<{ stripe_customer_id: string | null }>;
    customerId = rows[0]?.stripe_customer_id ?? null;
  }

  // 2. Create + persist if not.
  if (!customerId) {
    const custRes = await fetch(`${STRIPE_API}/customers`, {
      method: 'POST',
      // Stable per-user key: a retry between the existence check above and
      // this creation call would otherwise create a second, orphaned Stripe
      // Customer once the on_conflict=user_id upsert settles.
      headers: { ...stripeHeaders, 'Idempotency-Key': `stripe-customer-${user.id}` },
      body: new URLSearchParams({
        ...(user.email ? { email: user.email } : {}),
        'metadata[htwa_user_id]': user.id,
      }),
    });
    if (!custRes.ok) {
      console.error('[create-setup-intent] Stripe customer error:', await custRes.text());
      return json({ error: 'Could not create customer' }, 502);
    }
    customerId = ((await custRes.json()) as { id: string }).id;

    const upsertRes = await fetch(supabaseRestUrl('/payment_accounts?on_conflict=user_id'), {
      method: 'POST',
      headers: { ...svc, Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({ user_id: user.id, stripe_customer_id: customerId }),
    });
    if (!upsertRes.ok) {
      console.error('[create-setup-intent] payment_accounts upsert failed:', await upsertRes.text());
      return json({ error: 'Could not save customer' }, 500);
    }
  }

  // 3. SetupIntent for that customer.
  const siRes = await fetch(`${STRIPE_API}/setup_intents`, {
    method: 'POST',
    headers: stripeHeaders,
    body: new URLSearchParams({
      customer: customerId,
      'payment_method_types[]': 'card',
      usage: 'off_session',
    }),
  });
  if (!siRes.ok) {
    console.error('[create-setup-intent] Stripe SetupIntent error:', await siRes.text());
    return json({ error: 'Could not create SetupIntent' }, 502);
  }
  const si = await siRes.json() as { client_secret: string };

  return json({ clientSecret: si.client_secret });
});
