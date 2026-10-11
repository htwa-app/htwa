/**
 * services/socialAuth.ts
 *
 * Native "Sign in with Apple" and "Sign in with Google", both exchanged for a
 * Supabase session with supabase.auth.signInWithIdToken (NOT the browser/OAuth
 * redirect flow). Versions this was written against (APIs verified in each
 * package's own type declarations):
 *   expo-apple-authentication 8.0.8   — signInAsync({ requestedScopes, nonce }), isAvailableAsync()
 *   expo-crypto 15.0.9                — getRandomBytesAsync, digestStringAsync (nonce)
 *   @react-native-google-signin/google-signin 16.1.5 — configure, signIn() → { type: 'success' | 'cancelled' }
 *
 * Credentials arrive tomorrow, so everything here degrades cleanly:
 *   - Google needs EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (+ EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID on iOS).
 *     Missing → { available: false, reason: 'not_configured' }, never a silent route elsewhere.
 *   - If Supabase rejects the provider as not enabled yet, that surfaces as
 *     { status: 'unavailable', reason: 'provider_disabled' } rather than a scary error.
 *   - A cancelled sign-in is { status: 'cancelled' } — callers show nothing.
 *
 * CLAUDE.md §12: every call is try/catch'd, a query error is never read as "no
 * account", and raw provider/Postgres errors are logged, not shown to the user.
 */

import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { GoogleSignin, statusCodes, isErrorWithCode } from '@react-native-google-signin/google-signin';
import { supabase } from '../lib/supabase';
import { resolvePostAuthDestination, type PostAuthDestination } from '../utils/authRouting';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SocialProvider = 'apple' | 'google';

export type SocialAvailability =
  | { available: true }
  | { available: false; reason: 'not_configured' | 'unsupported_platform' };

export type SocialSignInResult =
  | { status: 'ok'; userId: string; displayName: string | null; email: string | null }
  | { status: 'cancelled' }
  | { status: 'unavailable'; reason: 'not_configured' | 'unsupported_platform' | 'provider_disabled' }
  | { status: 'error'; message: string };

/** Where to send a user straight after a successful social sign-in. */
export type SocialDestination = PostAuthDestination | '/complete-account';

// ─── Config ───────────────────────────────────────────────────────────────────

// EXPO_PUBLIC_* values are inlined at bundle time only for LITERAL
// `process.env.EXPO_PUBLIC_X` accesses, so these must not be destructured/indexed.
function googleWebClientId(): string | undefined {
  return process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || undefined;
}
function googleIosClientId(): string | undefined {
  return process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined;
}

const SIGN_IN_FAILED = (provider: SocialProvider): string =>
  `We couldn't sign you in with ${provider === 'apple' ? 'Apple' : 'Google'}. Please try again.`;

/** Supabase says this when the provider hasn't been switched on in Auth → Providers. */
function isProviderDisabledError(message: string | undefined): boolean {
  const m = (message ?? '').toLowerCase();
  return m.includes('provider is not enabled') || m.includes('unsupported provider') || m.includes('provider_disabled');
}

// ─── Availability ─────────────────────────────────────────────────────────────

export async function getSocialAvailability(): Promise<Record<SocialProvider, SocialAvailability>> {
  let apple: SocialAvailability = { available: false, reason: 'unsupported_platform' };
  if (Platform.OS === 'ios') {
    try {
      apple = (await AppleAuthentication.isAvailableAsync())
        ? { available: true }
        : { available: false, reason: 'unsupported_platform' };
    } catch (e) {
      console.error('[SocialAuth] Apple availability check failed:', e instanceof Error ? e.message : e);
    }
  }

  const web = googleWebClientId();
  const ios = googleIosClientId();
  const google: SocialAvailability =
    web && (Platform.OS !== 'ios' || ios)
      ? { available: true }
      : { available: false, reason: 'not_configured' };

  return { apple, google };
}

// ─── Apple ────────────────────────────────────────────────────────────────────

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function appleDisplayName(full: AppleAuthentication.AppleAuthenticationFullName | null): string | null {
  if (!full) return null;
  const name = [full.givenName, full.familyName].filter(Boolean).join(' ').trim();
  return name.length > 0 ? name : null;
}

export async function signInWithApple(): Promise<SocialSignInResult> {
  try {
    if (Platform.OS !== 'ios' || !(await AppleAuthentication.isAvailableAsync())) {
      return { status: 'unavailable', reason: 'unsupported_platform' };
    }

    // Replay protection: Apple gets the SHA-256 of a random nonce, Supabase gets
    // the raw nonce and checks it against the hash inside the identity token.
    const rawNonce = toHex(await Crypto.getRandomBytesAsync(32));
    const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
    if (!credential.identityToken) {
      console.error('[SocialAuth] Apple returned no identity token');
      return { status: 'error', message: SIGN_IN_FAILED('apple') };
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
      nonce: rawNonce,
    });
    if (error || !data.user) {
      console.error('[SocialAuth] Apple → Supabase failed:', error?.message);
      if (isProviderDisabledError(error?.message)) return { status: 'unavailable', reason: 'provider_disabled' };
      return { status: 'error', message: SIGN_IN_FAILED('apple') };
    }
    return {
      status: 'ok',
      userId: data.user.id,
      // Apple only ever supplies the name on the FIRST authorisation for this app.
      displayName: appleDisplayName(credential.fullName),
      email: data.user.email ?? credential.email ?? null,
    };
  } catch (e) {
    if ((e as { code?: string } | null)?.code === 'ERR_REQUEST_CANCELED') return { status: 'cancelled' };
    console.error('[SocialAuth] Apple sign-in threw:', e instanceof Error ? e.message : e);
    return { status: 'error', message: SIGN_IN_FAILED('apple') };
  }
}

// ─── Google ───────────────────────────────────────────────────────────────────

let googleConfigured = false;
function configureGoogle(webClientId: string, iosClientId: string | undefined): void {
  if (googleConfigured) return;
  GoogleSignin.configure({ webClientId, ...(iosClientId ? { iosClientId } : {}) });
  googleConfigured = true;
}

/** Test seam: forget that configure() already ran. */
export function _resetGoogleConfigForTests(): void {
  googleConfigured = false;
}

export async function signInWithGoogle(): Promise<SocialSignInResult> {
  const webClientId = googleWebClientId();
  const iosClientId = googleIosClientId();
  if (!webClientId || (Platform.OS === 'ios' && !iosClientId)) {
    return { status: 'unavailable', reason: 'not_configured' };
  }

  try {
    configureGoogle(webClientId, iosClientId);
    if (Platform.OS === 'android') await GoogleSignin.hasPlayServices();

    const response = await GoogleSignin.signIn();
    if (response.type === 'cancelled') return { status: 'cancelled' };

    const { idToken, user } = response.data;
    if (!idToken) {
      console.error('[SocialAuth] Google returned no idToken (check webClientId)');
      return { status: 'error', message: SIGN_IN_FAILED('google') };
    }

    // No nonce: this library can't supply one for Google, so the Supabase Google
    // provider must have "Skip nonce checks" enabled (see BLOCKERS-FOR-JORDAN.md).
    const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
    if (error || !data.user) {
      console.error('[SocialAuth] Google → Supabase failed:', error?.message);
      if (isProviderDisabledError(error?.message)) return { status: 'unavailable', reason: 'provider_disabled' };
      return { status: 'error', message: SIGN_IN_FAILED('google') };
    }
    return {
      status: 'ok',
      userId: data.user.id,
      displayName: user.name ?? ([user.givenName, user.familyName].filter(Boolean).join(' ') || null),
      email: data.user.email ?? user.email ?? null,
    };
  } catch (e) {
    if (isErrorWithCode(e)) {
      // A second tap while one is in flight is not a failure either.
      if (e.code === statusCodes.SIGN_IN_CANCELLED || e.code === statusCodes.IN_PROGRESS) return { status: 'cancelled' };
      if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return { status: 'error', message: 'Google Play services are needed for Google sign-in on this device.' };
      }
    }
    console.error('[SocialAuth] Google sign-in threw:', e instanceof Error ? e.message : e);
    return { status: 'error', message: SIGN_IN_FAILED('google') };
  }
}

// ─── Routing after a social sign-in ───────────────────────────────────────────

/**
 * Where a user goes right after a successful social sign-in, so a social user
 * is treated exactly like an email user:
 *   - no public.users row yet (first ever sign-in)  → /complete-account
 *     (name/phone/home location/gender — the fields email signup collects)
 *   - otherwise the shared precedence in utils/authRouting:
 *     never submitted ID verification → /id-verify, then missing profile →
 *     /profile-setup, else /(tabs).
 * Any failed read is { ok: false } — never "no account"/"not verified".
 */
export async function getDestinationAfterSocialSignIn(
  userId: string,
): Promise<{ ok: true; destination: SocialDestination } | { ok: false }> {
  try {
    const [userRes, verifRes, profileRes] = await Promise.all([
      supabase.from('users').select('id').eq('id', userId).maybeSingle(),
      supabase.from('verification').select('status').eq('user_id', userId).maybeSingle(),
      supabase.from('profiles').select('user_id').eq('user_id', userId).maybeSingle(),
    ]);
    if (userRes.error || verifRes.error || profileRes.error) {
      console.error(
        '[SocialAuth] post-sign-in state lookup failed:',
        userRes.error?.message ?? verifRes.error?.message ?? profileRes.error?.message,
      );
      return { ok: false };
    }
    if (!userRes.data) return { ok: true, destination: '/complete-account' };
    return {
      ok: true,
      destination: resolvePostAuthDestination({
        verificationStatus: verifRes.data?.status ?? null,
        hasProfile: profileRes.data !== null,
      }),
    };
  } catch (e) {
    console.error('[SocialAuth] post-sign-in state lookup threw:', e instanceof Error ? e.message : e);
    return { ok: false };
  }
}
