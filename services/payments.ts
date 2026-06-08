/**
 * services/payments.ts
 *
 * Block 7 — payment-method status + setup entry points.
 *
 * Two methods exist:
 *   - Driver RECEIVING method: Stripe Connect payout destination. Onboarding is
 *     a hosted Stripe flow reached via a link from the `create-connect-account`
 *     Edge Function.
 *   - Passenger PAYING method: a saved card set up with a SetupIntent from the
 *     `create-setup-intent` Edge Function, then the Stripe SDK's setup sheet.
 *
 * ⚠️ Both Edge Functions are NOT deployed yet (manual step — needs the Stripe
 *    Connect platform account + `supabase functions deploy`). Until then these
 *    helpers return `{ ok: false, reason: 'unavailable' }` so the UI can show a
 *    clear "setup not available yet" state instead of throwing. No keys are
 *    hardcoded — the client uses EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY (via
 *    StripeProvider) and all secrets stay server-side in the Edge Functions.
 */

import { supabase } from '../lib/supabase';
import type { PaymentAccountRow } from '../types/database';

export type PaymentAccount = Pick<
  PaymentAccountRow,
  'connect_status' | 'has_payment_method' | 'payment_method_brand' | 'payment_method_last4'
>;

const DEFAULT_ACCOUNT: PaymentAccount = {
  connect_status: 'none',
  has_payment_method: false,
  payment_method_brand: null,
  payment_method_last4: null,
};

/** Load the user's payment account, falling back to a safe default. */
export async function getPaymentAccount(userId: string): Promise<PaymentAccount> {
  const { data } = await supabase
    .from('payment_accounts')
    .select('connect_status, has_payment_method, payment_method_brand, payment_method_last4')
    .eq('user_id', userId)
    .maybeSingle();
  return data ?? DEFAULT_ACCOUNT;
}

export type SetupResult =
  | { ok: true; url: string }
  | { ok: false; reason: 'unavailable' };

export type SetupIntentResult =
  | { ok: true; clientSecret: string }
  | { ok: false; reason: 'unavailable' };

/** Begin (or resume) Stripe Connect onboarding; returns a hosted onboarding URL. */
export async function startConnectOnboarding(userId: string): Promise<SetupResult> {
  try {
    const { data, error } = await supabase.functions.invoke('create-connect-account', {
      body: { userId },
    });
    if (error || !data?.url) return { ok: false, reason: 'unavailable' };
    return { ok: true, url: data.url as string };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

/** Create a SetupIntent so the Stripe SDK can collect + save a card. */
export async function createSetupIntent(userId: string): Promise<SetupIntentResult> {
  try {
    const { data, error } = await supabase.functions.invoke('create-setup-intent', {
      body: { userId },
    });
    if (error || !data?.clientSecret) return { ok: false, reason: 'unavailable' };
    return { ok: true, clientSecret: data.clientSecret as string };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}
