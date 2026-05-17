/**
 * context/AuthContext.tsx
 *
 * Stage 20 — Auth context and session management.
 *
 * Provides:
 *   user        — Supabase User object or null
 *   session     — Supabase Session object or null
 *   isLoading   — true while the initial session check is in flight
 *   isVerified  — true when the user has both id_verified and selfie_verified
 *
 * On mount, AuthProvider:
 *   1. Calls supabase.auth.getSession() to restore any persisted session
 *   2. Subscribes to onAuthStateChange() to stay in sync with Supabase
 *   3. After a session is found, queries public.verification for verified status
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthContextValue {
  user:       User | null;
  session:    Session | null;
  isLoading:  boolean;
  isVerified: boolean;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,       setUser]       = useState<User | null>(null);
  const [session,    setSession]    = useState<Session | null>(null);
  const [isLoading,  setIsLoading]  = useState(true);
  const [isVerified, setIsVerified] = useState(false);

  /**
   * Fetch verification row for the given user and update isVerified.
   * Both id_verified AND selfie_verified must be true.
   */
  async function fetchVerificationStatus(userId: string): Promise<void> {
    const { data } = await supabase
      .from('verification')
      .select('id_verified, selfie_verified')
      .eq('user_id', userId)
      .single();

    setIsVerified(
      data !== null &&
      data.id_verified   === true &&
      data.selfie_verified === true,
    );
  }

  useEffect(() => {
    // ── 1. Restore existing session on mount ─────────────────────────────────
    void supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);

      if (s?.user) {
        // Fetch verification status, then mark loading complete
        void fetchVerificationStatus(s.user.id).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    // ── 2. Keep session in sync with Supabase auth events ────────────────────
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        setSession(s);
        setUser(s?.user ?? null);

        if (s?.user) {
          void fetchVerificationStatus(s.user.id);
        } else {
          setIsVerified(false);
        }
      },
    );

    return () => subscription.unsubscribe();
  // fetchVerificationStatus is stable (defined at component scope, no deps)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, isLoading, isVerified }}>
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
