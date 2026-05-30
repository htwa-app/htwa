/**
 * supabase/functions/create-connect-account/index.ts
 *
 * Stage 40 — Stripe Connect Express onboarding Edge Function.
 *
 * Called when a driver posts their first ride and has no stripe_account_id.
 * Creates a Stripe Connect Express account and returns an onboarding URL.
 *
 * Requires:
 *   STRIPE_SECRET_KEY  — injected via op run or Supabase secrets
 *   SUPABASE_SECRET_KEY — for server-side Supabase calls
 *
 * Request body:
 *   { userId: string, email: string, returnUrl: string, refreshUrl: string }
 *
 * Response:
 *   { accountId: string, onboardingUrl: string }
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const STRIPE_API = 'https://api.stripe.com/v1';

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

  let body: { userId?: string; email?: string; returnUrl?: string; refreshUrl?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const { userId, email, returnUrl, refreshUrl } = body;
  if (!userId || !email || !returnUrl || !refreshUrl) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  // 1. Create Stripe Connect Express account
  const accountRes = await fetch(`${STRIPE_API}/accounts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${stripeKey}`,
      'Content-Type':  'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      type:                      'express',
      email,
      'capabilities[transfers][requested]': 'true',
      'metadata[htwa_user_id]':  userId,
    }),
  });

  if (!accountRes.ok) {
    const err = await accountRes.text();
    return new Response(JSON.stringify({ error: `Stripe error: ${err}` }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }

  const account = await accountRes.json() as { id: string };
  const accountId = account.id;

  // 2. Create onboarding link
  const linkRes = await fetch(`${STRIPE_API}/account_links`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${stripeKey}`,
      'Content-Type':  'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      account:     accountId,
      refresh_url: refreshUrl,
      return_url:  returnUrl,
      type:        'account_onboarding',
    }),
  });

  if (!linkRes.ok) {
    const err = await linkRes.text();
    return new Response(JSON.stringify({ error: `Stripe link error: ${err}` }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }

  const link = await linkRes.json() as { url: string };

  return new Response(
    JSON.stringify({ accountId, onboardingUrl: link.url }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
});
