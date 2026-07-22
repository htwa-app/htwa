/**
 * app/id-verify.tsx
 *
 * ID + selfie verification screen.
 *
 * Phase 15: wire real Stripe Identity verification via @stripe/stripe-identity-react-native.
 * For beta: tapping "Start verification" writes the verification row directly and proceeds,
 * so the rest of the onboarding flow (profile setup → tabs) is fully testable end-to-end.
 *
 * The @stripe/stripe-react-native@0.65+ package moved presentIdentityVerificationSheet
 * to a separate @stripe/stripe-identity-react-native package. That integration is
 * deferred to Phase 15 alongside the Supabase Edge Function for session creation.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import Button from '../components/Button';
import { Colors, Typography, Spacing } from '../constants/theme';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { captureVerificationSelfie } from '../services/imagePicker';
import { uploadVerificationSelfie } from '../services/verificationSelfie';

// ─── Component ────────────────────────────────────────────────────────────────

export default function IdVerifyScreen() {
  const router  = useRouter();
  const { user, isLoading: authLoading, refreshVerification } = useAuth();

  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [devFallbackUsed, setDevFallbackUsed] = useState(false);

  // ─── Safety guard — should not happen in normal flow ────────────────────────
  useEffect(() => {
    if (!authLoading && user === null) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  // ─── Handler ────────────────────────────────────────────────────────────────

  const verifyIdentity = async () => {
    // Guard: this should never happen (useEffect redirects to /login), but be safe
    if (!user) {
      setIsError(true);
      setMessage('Not signed in. Please log in again.');
      return;
    }

    setLoading(true);
    setMessage(null);
    setDevFallbackUsed(false);

    try {
      // The selfie is REAL as of the safety-suite build: a live front-camera
      // capture, uploaded to the verification-selfies bucket, shown to booked
      // passengers on the "Verify your driver" panel. (__DEV__ only: falls
      // back to the photo library when the simulator has no camera.)
      const selfie = await captureVerificationSelfie();
      if (!selfie) {
        setIsError(true);
        setMessage('A live selfie is required — it lets your passengers verify it\'s really you. Camera permission and a photo are needed to continue.');
        return;
      }
      setDevFallbackUsed(selfie.source === 'library-dev-fallback');
      const selfieRes = await uploadVerificationSelfie(user.id, selfie.bytes);
      if (!selfieRes.ok) {
        setIsError(true);
        setMessage('Could not save your selfie. Please try again.');
        return;
      }

      // TODO Phase 15: replace this block with real Stripe Identity verification
      // for the ID-document side:
      //   1. Call a Supabase Edge Function to obtain verificationSessionId + ephemeralKeySecret
      //   2. Use @stripe/stripe-identity-react-native to present the verification sheet
      //   3. Only write id_verified below after a successful Stripe result

      // Beta placeholder — id_verified written directly so onboarding can proceed
      const { error: upsertError } = await supabase.from('verification').upsert({
        user_id:         user.id,
        id_verified:     true,
        selfie_verified: true,
        verified_at:     new Date().toISOString(),
      }, { onConflict: 'user_id' });

      if (upsertError) {
        setIsError(true);
        setMessage(upsertError.message ?? 'Something went wrong. Please try again.');
        return;
      }

      void refreshVerification();
      router.replace('/profile-setup');
    } catch (e: unknown) {
      setIsError(true);
      setMessage(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* Header */}
        <Text style={styles.title}>Verify your identity</Text>
        <Text style={styles.subtitle}>
          We need to confirm your identity before you can use htwa.
          This is a one-time step that keeps everyone on the platform safe.
        </Text>

        {/* __DEV__-only: labels the simulator camera fallback clearly. */}
        {devFallbackUsed && (
          <Text testID="dev-fallback-note" style={styles.devFallbackNote}>
            (dev fallback) No camera on this device — selfie picked from your photo library instead.
          </Text>
        )}

        {/* Feedback message */}
        {message !== null && (
          <Text
            testID="id-verify-message"
            style={[styles.message, isError && styles.messageError]}
          >
            {message}
          </Text>
        )}

        {/* CTA */}
        <Button
          title="Start verification"
          onPress={verifyIdentity}
          disabled={loading}
        />

      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl,
    gap: Spacing.lg,
  },
  title: {
    ...Typography.displayMedium,
    color: Colors.textPrimary,
  },
  subtitle: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
  },
  message: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
  },
  messageError: {
    color: Colors.sos,
  },
  devFallbackNote: {
    ...Typography.bodySmall,
    color: Colors.amber,
  },
});
