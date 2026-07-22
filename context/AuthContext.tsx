/**
 * context/AuthContext.tsx
 *
 * Stage 20 — Auth context and session management.
 *
 * Provides:
 *   user               — Supabase User object or null
 *   session            — Supabase Session object or null
 *   isLoading          — true while the initial session check is in flight
 *   verificationStatus — null (never submitted identity verification),
 *                         'pending', 'approved', or 'rejected'. Routing only
 *                         cares whether it's null; the booking/posting gate
 *                         specifically requires 'approved' (checked at the
 *                         point of that action, not here).
 *
 * On mount, AuthProvider:
 *   1. Calls supabase.auth.getSession() to restore any persisted session
 *   2. Subscribes to onAuthStateChange() to stay in sync with Supabase
 *   3. After a session is found, queries public.verification for status
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { VerificationStatus } from '../types/database';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthContextValue {
  user:                User | null;
  session:             Session | null;
  isLoading:           boolean;
  verificationStatus:  VerificationStatus | null;
  /** True when the last verification-status fetch failed — distinct from a
   *  genuine null (never submitted). Consumers must not route based on
   *  verificationStatus while this is true (see SplashScreen). */
  verificationLoadError: boolean;
  /** Re-fetch verification status from public.verification. Call after submitting/resubmitting. */
  refreshVerification: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,               setUser]               = useState<User | null>(null);
  const [session,            setSession]            = useState<Session | null>(null);
  const [isLoading,          setIsLoading]          = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
  const [verificationLoadError, setVerificationLoadError] = useState(false);

  /**
   * Fetch the verification row's status for the given user (null = no row
   * yet). A query error must NEVER be treated as "never submitted" — that
   * would silently route an already-verified user back through /id-verify
   * on a transient network blip. On error, verificationStatus is left
   * untouched and verificationLoadError is set instead; consumers check
   * that flag before routing on a null status.
   */
  async function fetchVerificationStatus(userId: string): Promise<void> {
    const { data, error } = await supabase
      .from('verification')
      .select('status')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[AuthContext] verification status fetch failed:', error.message);
      setVerificationLoadError(true);
      return;
    }
    setVerificationLoadError(false);
    setVerificationStatus(data?.status ?? null);
  }

  useEffect(() => {
    // ── 1. Restore existing session on mount ─────────────────────────────────
    void supabase.auth.getSession()
      .then(({ data: { session: s } }) => {
        setSession(s);
        setUser(s?.user ?? null);

        if (s?.user) {
          // Fetch verification status, then mark loading complete
          void fetchVerificationStatus(s.user.id).finally(() => setIsLoading(false));
        } else {
          setIsLoading(false);
        }
      })
      .catch(() => {
        // Network/auth failure on startup — treat as logged-out state
        setSession(null);
        setUser(null);
        setIsLoading(false);
      });

    // ── 2. Keep session in sync with Supabase auth events ────────────────────
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        setSession(s);
        setUser(s?.user ?? null);

        if (s?.user) {
          void fetchVerificationStatus(s.user.id);
        } else {
          setVerificationStatus(null);
        }
      },
    );

    return () => subscription.unsubscribe();
  // fetchVerificationStatus is stable (defined at component scope, no deps)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Manually re-fetch verification status for the current user.
   * Call this after writing a verification row (e.g. from id-verify.tsx)
   * so the context updates without waiting for an auth state change event.
   */
  const refreshVerification = useCallback(async (): Promise<void> => {
    if (user) {
      await fetchVerificationStatus(user.id);
    }
  // fetchVerificationStatus is stable (defined at component scope, no deps)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Every consumer re-renders whenever this value changes identity — without
  // memoizing, a fresh object every render would make ALL consumers
  // re-render on every AuthProvider render, not just on an actual state change.
  const value = useMemo(
    () => ({ user, session, isLoading, verificationStatus, verificationLoadError, refreshVerification }),
    [user, session, isLoading, verificationStatus, verificationLoadError, refreshVerification],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
