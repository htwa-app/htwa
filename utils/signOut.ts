/**
 * utils/signOut.ts
 *
 * PRODUCTION sign-out (round-2 fix #3) — used by Settings for all users (the
 * __DEV__-only reset in utils/devReset.ts remains a separate, dev-only tool).
 *
 * Account switching must leave no residue from the previous user, so this:
 *  1. tears down every live Realtime channel (notifications, chat, tracking),
 *  2. signs out of Supabase (clears the persisted sb-* auth token),
 *  3. wipes the app's own cached state (htwa:* AsyncStorage keys — profile
 *     cache etc.) plus any residual auth-token keys.
 *
 * Throws on sign-out failure so the caller can surface it rather than leaving
 * a half-signed-out state.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

/** AsyncStorage key prefixes wiped on sign-out: app cache + Supabase tokens. */
export const SIGN_OUT_KEY_PREFIXES = ['htwa:', 'sb-'];

/**
 * Wipe cached app state from the previous account. Extracted from
 * signOutAndClear so callers where supabase.auth.signOut() is EXPECTED to
 * fail (e.g. after the account was already deleted server-side) can still
 * guarantee this step runs, instead of losing it inside a swallowed
 * catch — leaving cache residue for account switching is the actual harm.
 */
export async function clearLocalAppState(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const toRemove = keys.filter((k) => SIGN_OUT_KEY_PREFIXES.some((p) => k.startsWith(p)));
  if (toRemove.length > 0) await AsyncStorage.multiRemove(toRemove);
}

export async function signOutAndClear(): Promise<void> {
  // 1. Realtime teardown FIRST — a signed-out client must not keep receiving
  //    (or later mix in) the previous user's events.
  try {
    await supabase.removeAllChannels();
  } catch (e) {
    // Channel teardown failing must not block the sign-out itself.
    console.error('[SignOut] channel teardown failed:', e instanceof Error ? e.message : e);
  }

  // 2. Supabase sign-out (clears the persisted session).
  const { error } = await supabase.auth.signOut();
  if (error) throw error;

  // 3. Cached app state from the previous account.
  await clearLocalAppState();
}
