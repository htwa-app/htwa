/**
 * __tests__/unit/walletPay.test.ts
 * Apple Pay / Google Pay option builders for Stripe's PaymentSheet.
 */
import { MERCHANT_COUNTRY_CODE, applePayParams, googlePayParams, isWalletTestEnvironment } from '../../utils/walletPay';

describe('walletPay', () => {
  it('Apple Pay only needs the merchant country (merchant ID comes from the config plugin)', () => {
    expect(applePayParams()).toEqual({ merchantCountryCode: MERCHANT_COUNTRY_CODE });
  });

  it('Google Pay carries the booking currency and the country', () => {
    expect(googlePayParams('EUR')).toMatchObject({ merchantCountryCode: 'IE', currencyCode: 'EUR' });
    expect(googlePayParams('GBP').currencyCode).toBe('GBP');
  });

  it('test environment is on in dev builds and for pk_test_ keys', () => {
    expect(isWalletTestEnvironment(undefined)).toBe(true); // __DEV__ is true under Jest
    expect(isWalletTestEnvironment('pk_test_123')).toBe(true);
  });

  it('test environment is off only when BOTH not dev and a live key', () => {
    const g = globalThis as unknown as { __DEV__: boolean };
    const original = g.__DEV__;
    g.__DEV__ = false;
    try {
      expect(isWalletTestEnvironment('pk_live_123')).toBe(false);
      expect(isWalletTestEnvironment('pk_test_123')).toBe(true);
    } finally {
      g.__DEV__ = original;
    }
  });
});
