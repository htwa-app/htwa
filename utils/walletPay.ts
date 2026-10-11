/**
 * utils/walletPay.ts
 *
 * Apple Pay / Google Pay options for Stripe's PaymentSheet
 * (@stripe/stripe-react-native 0.68.0 — `applePay?: ApplePayParams` and
 * `googlePay?: GooglePayParams` both exist on InitPaymentSheetParams; see
 * node_modules/@stripe/stripe-react-native/src/types/PaymentSheet.ts).
 *
 * Both are passed unconditionally to every initPaymentSheet call: the SDK
 * ignores `applePay` on Android and `googlePay` on iOS, and each wallet only
 * ever appears in the sheet when the device + account can actually use it
 * (Apple Pay needs the Apple merchant ID registered + the Apple Pay capability
 * in the provisioning profile; Google Pay needs a Google Pay-capable device).
 * Card entry is unaffected either way.
 *
 * The Apple merchant identifier (`merchant.com.htwa`) lives in app.config.js's
 * @stripe/stripe-react-native plugin entry — the native entitlement is added
 * from there at prebuild time, not here.
 */

import type { Currency } from '../types/database';

/**
 * Two-letter ISO 3166 country of the htwa Stripe platform account. Apple Pay and
 * Google Pay both require this to match the country the Stripe account was
 * created in — confirm against the Stripe dashboard (Settings → Business).
 */
export const MERCHANT_COUNTRY_CODE = 'IE';

/** True in dev builds and whenever the publishable key is a Stripe TEST key. */
export function isWalletTestEnvironment(
  publishableKey: string | undefined = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY,
): boolean {
  return __DEV__ || (publishableKey ?? '').startsWith('pk_test_');
}

export function applePayParams(): { merchantCountryCode: string } {
  return { merchantCountryCode: MERCHANT_COUNTRY_CODE };
}

export function googlePayParams(currency: Currency): {
  merchantCountryCode: string;
  currencyCode: string;
  testEnv: boolean;
} {
  return {
    merchantCountryCode: MERCHANT_COUNTRY_CODE,
    currencyCode: currency,
    // Google Pay's test environment until Google grants production access.
    testEnv: isWalletTestEnvironment(),
  };
}
