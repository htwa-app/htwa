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
import { Database } from '../types/database';

const missing: string[] = [];
if (!process.env.EXPO_PUBLIC_SUPABASE_URL)      missing.push('EXPO_PUBLIC_SUPABASE_URL');
if (!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) missing.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');
if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missing.join(', ')}. Check .env.local.`
  );
}

const supabaseUrl     = process.env.EXPO_PUBLIC_SUPABASE_URL     as string;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage:            AsyncStorage,
    autoRefreshToken:   true,
    persistSession:     true,
    detectSessionInUrl: false,
  },
});
