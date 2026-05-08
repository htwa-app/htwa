/**
 * lib/supabase.ts
 *
 * Supabase client singleton.
 *
 * - Uses EXPO_PUBLIC_* env vars (safe to bundle; these are the anon/public keys).
 * - AsyncStorage keeps the session alive across app restarts.
 * - detectSessionInUrl: false — required for React Native (no browser URL to parse).
 * - react-native-url-polyfill/auto is imported as a side effect to patch the
 *   global URL constructor before Supabase's internals use it.
 *
 * Replace Stage 16 note: real sign-in flows (Google, Apple, email, mobile OTP)
 * will all call supabase.auth.* methods and rely on this singleton.
 */

import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = process.env.EXPO_PUBLIC_SUPABASE_URL  ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (__DEV__ && !supabaseUrl) {
  console.warn('[supabase] EXPO_PUBLIC_SUPABASE_URL is not set — check .env.local');
}
if (__DEV__ && !supabaseAnonKey) {
  console.warn('[supabase] EXPO_PUBLIC_SUPABASE_ANON_KEY is not set — check .env.local');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage:            AsyncStorage,
    autoRefreshToken:   true,
    persistSession:     true,
    detectSessionInUrl: false,
  },
});
