/**
 * supabase/functions/create-connect-account/index.ts
 *
 * Stage 40 — Stripe Connect Express onboarding Edge Function.
 *
 * Called when a driver posts their first journey and has no Connect account.
 * Identity comes from the caller's JWT — the client sends only `{ userId }`
 * (validated against the token, never trusted on its own).
 *
 * Reuses an existing Connect account from payment_accounts if one exists,
 * otherwise creates one, persists it, and returns a fresh onboarding link.
 *
 * Response: { url: string, accountId: string }
 */

import { getAuthedUser, json, serviceHeaders, supabaseRestUrl } from '../_shared/auth.ts';

const STRIPE_API = 'https://api.stripe.com/v1';
// Stripe account links require http(s) URLs — custom schemes like htwa:// are
// rejected (url_invalid). These pages on the owned domain bounce back into the
// app (or simply tell the driver to return to it).
const RETURN_URL  = 'https://htwa-app.com/stripe/return';
const REFRESH_URL = 'https://htwa-app.com/stripe/refresh';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const svc = serviceHeaders();
  if (!stripeKey || !svc) return json({ error: 'Service not configured' }, 500);

  const user = await getAuthedUser(req);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  let body: { userId?: string };
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  if (body.userId && body.userId !== user.id) return json({ error: 'Forbidden' }, 403);

  const stripeHeaders = {
    'Authorization': `Bearer ${stripeKey}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  // 1. Reuse an existing Connect account if one was already created.
  let accountId: string | null = null;
  const existingRes = await fetch(
    supabaseRestUrl(`/payment_accounts?user_id=eq.${user.id}&select=stripe_connect_account_id`),
    { headers: svc },
  );
  if (existingRes.ok) {
    const rows = await existingRes.json() as Array<{ stripe_connect_account_id: string | null }>;
    accountId = rows[0]?.stripe_connect_account_id ?? null;
  }

  // 2. Create the Express account if needed.
  if (!accountId) {
    const accountRes = await fetch(`${STRIPE_API}/accounts`, {
      method: 'POST',
      // A stable per-user key so a retried/duplicate request replays the
      // first result instead of creating a second, orphaned Express account
      // (payment_accounts is only written AFTER this call succeeds).
      headers: { ...stripeHeaders, 'Idempotency-Key': `connect-account-${user.id}` },
      body: new URLSearchParams({
        type: 'express',
        ...(user.email ? { email: user.email } : {}),
        'capabilities[transfers][requested]': 'true',
        'metadata[htwa_user_id]': user.id,
      }),
    });
    if (!accountRes.ok) {
      console.error('[create-connect-account] Stripe account error:', await accountRes.text());
      return json({ error: 'Could not create payment account' }, 502);
    }
    accountId = ((await accountRes.json()) as { id: string }).id;

    // Persist immediately so an interrupted onboarding can resume with the same account.
    const upsertRes = await fetch(supabaseRestUrl('/payment_accounts?on_conflict=user_id'), {
      method: 'POST',
      headers: { ...svc, Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({
        user_id: user.id,
        stripe_connect_account_id: accountId,
        connect_status: 'pending',
      }),
    });
    if (!upsertRes.ok) {
      console.error('[create-connect-account] payment_accounts upsert failed:', await upsertRes.text());
      return json({ error: 'Could not save payment account' }, 500);
    }
  }

  // 3. Fresh onboarding link (links are single-use and short-lived).
  const linkRes = await fetch(`${STRIPE_API}/account_links`, {
    method: 'POST',
    headers: stripeHeaders,
    body: new URLSearchParams({
      account: accountId,
      refresh_url: REFRESH_URL,
      return_url: RETURN_URL,
      type: 'account_onboarding',
    }),
  });
  if (!linkRes.ok) {
    console.error('[create-connect-account] Stripe link error:', await linkRes.text());
    return json({ error: 'Could not create onboarding link' }, 502);
  }
  const link = await linkRes.json() as { url: string };

  return json({ url: link.url, accountId });
});
