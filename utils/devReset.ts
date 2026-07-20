/**
 * utils/devReset.ts
 *
 * DEV-ONLY helper to make the auth/onboarding flow repeatable during testing.
 *
 * In production the Supabase session correctly persists across rebuilds, so
 * there's no way to re-run signup/onboarding from scratch. This signs the user
 * out and wipes all app-cached session + onboarding state so the next launch
 * behaves like a fresh install.
 *
 * Safety: guarded by __DEV__ so it is a HARD no-op in production builds (belt &
 * suspenders — the UI that calls it is also __DEV__-gated). It THROWS on failure
 * (rather than swallowing) so the caller can surface a half-cleared state instead
 * of silently leaving the app in a broken in-between state.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

/** AsyncStorage key prefixes to wipe: our onboarding cache + Supabase auth token. */
const RESET_KEY_PREFIXES = ['htwa:', 'sb-'];

export async function devResetAndSignOut(): Promise<void> {
  // Hard no-op outside development — there is zero chance this runs in prod.
  if (!__DEV__) return;

  // 1. Sign out of Supabase (this clears the persisted sb-*-auth-token).
  const { error } = await supabase.auth.signOut();
  if (error) throw error;

  // 2. Clear our own onboarding/profile cache + any residual auth-token keys, so
  //    the next launch starts genuinely fresh.
  const keys = await AsyncStorage.getAllKeys();
  const toRemove = keys.filter((k) => RESET_KEY_PREFIXES.some((p) => k.startsWith(p)));
  if (toRemove.length > 0) await AsyncStorage.multiRemove(toRemove);
}
