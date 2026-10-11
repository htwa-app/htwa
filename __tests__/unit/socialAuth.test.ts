/**
 * __tests__/unit/socialAuth.test.ts
 *
 * Native Apple / Google sign-in → supabase.auth.signInWithIdToken, with every
 * native module mocked (none of them exist in Jest).
 */
import { Platform } from 'react-native';

const mockAppleAvailable = jest.fn();
const mockAppleSignIn = jest.fn();
jest.mock('expo-apple-authentication', () => ({
  isAvailableAsync: (...a: unknown[]) => mockAppleAvailable(...a),
  signInAsync: (...a: unknown[]) => mockAppleSignIn(...a),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}));

jest.mock('expo-crypto', () => ({
  getRandomBytesAsync: jest.fn(async () => new Uint8Array([1, 2, 3, 255])),
  digestStringAsync: jest.fn(async (_alg: string, raw: string) => `hashed(${raw})`),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));

const mockGoogleConfigure = jest.fn();
const mockGoogleSignIn = jest.fn();
const mockHasPlayServices = jest.fn();
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: (...a: unknown[]) => mockGoogleConfigure(...a),
    signIn: (...a: unknown[]) => mockGoogleSignIn(...a),
    hasPlayServices: (...a: unknown[]) => mockHasPlayServices(...a),
  },
  statusCodes: { SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED', IN_PROGRESS: 'IN_PROGRESS', PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE' },
  isErrorWithCode: (e: unknown) => typeof e === 'object' && e !== null && 'code' in e,
}));

const mockSignInWithIdToken = jest.fn();
const mockTable = jest.fn();
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: { signInWithIdToken: (...a: unknown[]) => mockSignInWithIdToken(...a) },
    from: (table: string) => ({
      select: () => ({ eq: () => ({ maybeSingle: () => mockTable(table) }) }),
    }),
  },
}));

import {
  getDestinationAfterSocialSignIn,
  getSocialAvailability,
  signInWithApple,
  signInWithGoogle,
  _resetGoogleConfigForTests,
} from '../../services/socialAuth';

function setPlatform(os: 'ios' | 'android') {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true, writable: true });
}
const ORIGINAL_OS = Platform.OS;
const ENV_KEYS = ['EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID', 'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID'] as const;
const originalEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  jest.clearAllMocks();
  _resetGoogleConfigForTests();
  ENV_KEYS.forEach((k) => { originalEnv[k] = process.env[k]; delete process.env[k]; });
  setPlatform('ios');
  mockAppleAvailable.mockResolvedValue(true);
  mockHasPlayServices.mockResolvedValue(true);
});
afterEach(() => {
  ENV_KEYS.forEach((k) => { if (originalEnv[k] === undefined) delete process.env[k]; else process.env[k] = originalEnv[k]; });
  setPlatform(ORIGINAL_OS as 'ios' | 'android');
});

describe('getSocialAvailability', () => {
  it('Apple is available on iOS when the OS supports it; unsupported on Android', async () => {
    expect((await getSocialAvailability()).apple).toEqual({ available: true });
    setPlatform('android');
    expect((await getSocialAvailability()).apple).toEqual({ available: false, reason: 'unsupported_platform' });
  });

  it('Apple is unsupported when the OS says it is not available', async () => {
    mockAppleAvailable.mockResolvedValue(false);
    expect((await getSocialAvailability()).apple).toEqual({ available: false, reason: 'unsupported_platform' });
  });

  it('Google is "not_configured" until the client IDs exist (never silently routed elsewhere)', async () => {
    expect((await getSocialAvailability()).google).toEqual({ available: false, reason: 'not_configured' });
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'web.apps.googleusercontent.com';
    // iOS also needs the iOS client ID
    expect((await getSocialAvailability()).google).toEqual({ available: false, reason: 'not_configured' });
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = 'ios.apps.googleusercontent.com';
    expect((await getSocialAvailability()).google).toEqual({ available: true });
  });

  it('Google on Android only needs the web client ID', async () => {
    setPlatform('android');
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'web.apps.googleusercontent.com';
    expect((await getSocialAvailability()).google).toEqual({ available: true });
  });

  it('a throwing Apple availability check degrades to unsupported (logged)', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockAppleAvailable.mockRejectedValue(new Error('native boom'));
    expect((await getSocialAvailability()).apple).toEqual({ available: false, reason: 'unsupported_platform' });
    spy.mockRestore();
  });
});

describe('signInWithApple', () => {
  const credential = { identityToken: 'apple.jwt', fullName: { givenName: 'Aoife', familyName: 'Kelly' }, email: 'relay@privaterelay.appleid.com' };

  it('sends Apple the HASHED nonce and Supabase the RAW nonce, then returns the user', async () => {
    mockAppleSignIn.mockResolvedValue(credential);
    mockSignInWithIdToken.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@x.ie' } }, error: null });
    const res = await signInWithApple();
    expect(res).toEqual({ status: 'ok', userId: 'u1', displayName: 'Aoife Kelly', email: 'a@x.ie' });
    const raw = mockSignInWithIdToken.mock.calls[0][0].nonce;
    expect(raw).toBe('010203ff');
    expect(mockAppleSignIn.mock.calls[0][0].nonce).toBe(`hashed(${raw})`);
    expect(mockSignInWithIdToken).toHaveBeenCalledWith({ provider: 'apple', token: 'apple.jwt', nonce: '010203ff' });
  });

  it('displayName is null when Apple supplies no name (every sign-in after the first)', async () => {
    mockAppleSignIn.mockResolvedValue({ ...credential, fullName: null });
    mockSignInWithIdToken.mockResolvedValue({ data: { user: { id: 'u1', email: null } }, error: null });
    const res = await signInWithApple();
    expect(res).toMatchObject({ status: 'ok', displayName: null, email: 'relay@privaterelay.appleid.com' });
  });

  it('a cancelled sign-in is quiet', async () => {
    mockAppleSignIn.mockRejectedValue(Object.assign(new Error('canceled'), { code: 'ERR_REQUEST_CANCELED' }));
    expect(await signInWithApple()).toEqual({ status: 'cancelled' });
    expect(mockSignInWithIdToken).not.toHaveBeenCalled();
  });

  it('Android is unavailable, without touching the native module', async () => {
    setPlatform('android');
    expect(await signInWithApple()).toEqual({ status: 'unavailable', reason: 'unsupported_platform' });
    expect(mockAppleSignIn).not.toHaveBeenCalled();
  });

  it('no identity token → friendly error', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockAppleSignIn.mockResolvedValue({ ...credential, identityToken: null });
    const res = await signInWithApple();
    expect(res.status).toBe('error');
    expect(mockSignInWithIdToken).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('Supabase rejecting the token → generic error (raw message only logged)', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockAppleSignIn.mockResolvedValue(credential);
    mockSignInWithIdToken.mockResolvedValue({ data: { user: null }, error: { message: 'Nonces mismatch' } });
    const res = await signInWithApple();
    expect(res).toEqual({ status: 'error', message: "We couldn't sign you in with Apple. Please try again." });
    expect(JSON.stringify(res)).not.toContain('Nonces');
    spy.mockRestore();
  });

  it('provider not enabled in Supabase yet → unavailable, not an error', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockAppleSignIn.mockResolvedValue(credential);
    mockSignInWithIdToken.mockResolvedValue({ data: { user: null }, error: { message: 'Unsupported provider: provider is not enabled' } });
    expect(await signInWithApple()).toEqual({ status: 'unavailable', reason: 'provider_disabled' });
    spy.mockRestore();
  });

  it('an unexpected throw is a friendly error', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockAppleSignIn.mockRejectedValue(new Error('weird'));
    expect((await signInWithApple()).status).toBe('error');
    spy.mockRestore();
  });
});

describe('signInWithGoogle', () => {
  const configured = () => {
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'web.apps.googleusercontent.com';
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = 'ios.apps.googleusercontent.com';
  };
  const success = { type: 'success', data: { idToken: 'google.jwt', user: { name: 'Cian Murphy', givenName: 'Cian', familyName: 'Murphy', email: 'c@x.ie' } } };

  it('without client IDs it is unavailable and never touches the native module', async () => {
    expect(await signInWithGoogle()).toEqual({ status: 'unavailable', reason: 'not_configured' });
    expect(mockGoogleConfigure).not.toHaveBeenCalled();
    expect(mockGoogleSignIn).not.toHaveBeenCalled();
  });

  it('configures with both IDs, signs in, and exchanges the idToken', async () => {
    configured();
    mockGoogleSignIn.mockResolvedValue(success);
    mockSignInWithIdToken.mockResolvedValue({ data: { user: { id: 'u2', email: 'c@x.ie' } }, error: null });
    const res = await signInWithGoogle();
    expect(res).toEqual({ status: 'ok', userId: 'u2', displayName: 'Cian Murphy', email: 'c@x.ie' });
    expect(mockGoogleConfigure).toHaveBeenCalledWith({ webClientId: 'web.apps.googleusercontent.com', iosClientId: 'ios.apps.googleusercontent.com' });
    expect(mockSignInWithIdToken).toHaveBeenCalledWith({ provider: 'google', token: 'google.jwt' });
  });

  it('configures only once across calls', async () => {
    configured();
    mockGoogleSignIn.mockResolvedValue({ type: 'cancelled', data: null });
    await signInWithGoogle(); await signInWithGoogle();
    expect(mockGoogleConfigure).toHaveBeenCalledTimes(1);
  });

  it('a cancelled response is quiet', async () => {
    configured();
    mockGoogleSignIn.mockResolvedValue({ type: 'cancelled', data: null });
    expect(await signInWithGoogle()).toEqual({ status: 'cancelled' });
    expect(mockSignInWithIdToken).not.toHaveBeenCalled();
  });

  it('a thrown SIGN_IN_CANCELLED / IN_PROGRESS is quiet too', async () => {
    configured();
    mockGoogleSignIn.mockRejectedValueOnce({ code: 'SIGN_IN_CANCELLED' });
    expect(await signInWithGoogle()).toEqual({ status: 'cancelled' });
    mockGoogleSignIn.mockRejectedValueOnce({ code: 'IN_PROGRESS' });
    expect(await signInWithGoogle()).toEqual({ status: 'cancelled' });
  });

  it('Android checks Play services and explains when they are missing', async () => {
    setPlatform('android');
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'web.apps.googleusercontent.com';
    mockHasPlayServices.mockRejectedValue({ code: 'PLAY_SERVICES_NOT_AVAILABLE' });
    const res = await signInWithGoogle();
    expect(res.status).toBe('error');
    expect(res).toMatchObject({ message: expect.stringContaining('Google Play services') });
    expect(mockGoogleConfigure).toHaveBeenCalledWith({ webClientId: 'web.apps.googleusercontent.com' });
  });

  it('no idToken (misconfigured webClientId) → friendly error, no Supabase call', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    configured();
    mockGoogleSignIn.mockResolvedValue({ type: 'success', data: { idToken: null, user: {} } });
    expect((await signInWithGoogle()).status).toBe('error');
    expect(mockSignInWithIdToken).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('Supabase provider disabled → unavailable', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    configured();
    mockGoogleSignIn.mockResolvedValue(success);
    mockSignInWithIdToken.mockResolvedValue({ data: { user: null }, error: { message: 'Provider is not enabled' } });
    expect(await signInWithGoogle()).toEqual({ status: 'unavailable', reason: 'provider_disabled' });
    spy.mockRestore();
  });

  it('Supabase rejecting the token → generic error', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    configured();
    mockGoogleSignIn.mockResolvedValue(success);
    mockSignInWithIdToken.mockResolvedValue({ data: { user: null }, error: { message: 'Invalid audience' } });
    expect(await signInWithGoogle()).toEqual({ status: 'error', message: "We couldn't sign you in with Google. Please try again." });
    spy.mockRestore();
  });
});

describe('getDestinationAfterSocialSignIn', () => {
  const tables = (over: Record<string, { data: unknown; error?: { message: string } | null }>) =>
    mockTable.mockImplementation(async (t: string) => ({ error: null, ...(over[t] ?? { data: null }) }));

  it('no public.users row (first ever sign-in) → /complete-account', async () => {
    tables({});
    expect(await getDestinationAfterSocialSignIn('u1')).toEqual({ ok: true, destination: '/complete-account' });
  });

  it('account exists but never submitted ID verification → /id-verify (social users are not exempt)', async () => {
    tables({ users: { data: { id: 'u1' } } });
    expect(await getDestinationAfterSocialSignIn('u1')).toEqual({ ok: true, destination: '/id-verify' });
  });

  it('verified-or-pending with no profile → /profile-setup; with a profile → /(tabs)', async () => {
    tables({ users: { data: { id: 'u1' } }, verification: { data: { status: 'pending' } } });
    expect(await getDestinationAfterSocialSignIn('u1')).toEqual({ ok: true, destination: '/profile-setup' });
    tables({ users: { data: { id: 'u1' } }, verification: { data: { status: 'approved' } }, profiles: { data: { user_id: 'u1' } } });
    expect(await getDestinationAfterSocialSignIn('u1')).toEqual({ ok: true, destination: '/(tabs)' });
  });

  it('any failed read is { ok: false } — never read as "no account" or "not verified"', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    tables({ users: { data: null, error: { message: 'db down' } } });
    expect(await getDestinationAfterSocialSignIn('u1')).toEqual({ ok: false });
    tables({ users: { data: { id: 'u1' } }, verification: { data: null, error: { message: 'db down' } } });
    expect(await getDestinationAfterSocialSignIn('u1')).toEqual({ ok: false });
    mockTable.mockRejectedValue(new Error('network'));
    expect(await getDestinationAfterSocialSignIn('u1')).toEqual({ ok: false });
    spy.mockRestore();
  });
});
