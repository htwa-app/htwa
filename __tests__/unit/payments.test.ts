/**
 * __tests__/unit/payments.test.ts
 * Block 7 — payment account status + setup entry points.
 */
const mockMaybeSingle = jest.fn();
const mockInvoke = jest.fn();
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => mockMaybeSingle() }) }) }),
    functions: { invoke: (...a: unknown[]) => mockInvoke(...a) },
  },
}));

import { getPaymentAccount, startConnectOnboarding, createSetupIntent } from '../../services/payments';

beforeEach(() => jest.clearAllMocks());

describe('getPaymentAccount', () => {
  it('returns the stored account', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { connect_status: 'active', has_payment_method: true, payment_method_brand: 'visa', payment_method_last4: '4242' }, error: null });
    expect(await getPaymentAccount('u1')).toMatchObject({ connect_status: 'active', has_payment_method: true });
  });
  it('falls back to a safe default when none exists', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await getPaymentAccount('u1')).toEqual({ connect_status: 'none', has_payment_method: false, payment_method_brand: null, payment_method_last4: null });
  });
});

describe('startConnectOnboarding', () => {
  it('returns the onboarding url when the function responds', async () => {
    mockInvoke.mockResolvedValue({ data: { url: 'https://connect.stripe.test/x' }, error: null });
    expect(await startConnectOnboarding('u1')).toEqual({ ok: true, url: 'https://connect.stripe.test/x' });
  });
  it('degrades to unavailable when the function is missing/errors', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { message: 'not found' } });
    expect(await startConnectOnboarding('u1')).toEqual({ ok: false, reason: 'unavailable' });
  });
  it('degrades to unavailable when invoke throws', async () => {
    mockInvoke.mockRejectedValue(new Error('network'));
    expect(await startConnectOnboarding('u1')).toEqual({ ok: false, reason: 'unavailable' });
  });
});

describe('createSetupIntent', () => {
  it('returns the client secret when available', async () => {
    mockInvoke.mockResolvedValue({ data: { clientSecret: 'seti_123_secret' }, error: null });
    expect(await createSetupIntent('u1')).toEqual({ ok: true, clientSecret: 'seti_123_secret' });
  });
  it('degrades to unavailable otherwise', async () => {
    mockInvoke.mockResolvedValue({ data: {}, error: null });
    expect(await createSetupIntent('u1')).toEqual({ ok: false, reason: 'unavailable' });
  });
});
