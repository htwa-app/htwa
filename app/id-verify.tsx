/**
 * app/id-verify.tsx
 *
 * ID + selfie verification screen — Stage 18.
 * Launches the Stripe Identity verification sheet.
 *
 * Success  → /profile-setup
 * Cancel   → dismissible info message (no navigation; sheet closes)
 * Error    → dismissible error message in Colors.sos
 *
 * TODO Stage 20: obtain a real verificationSessionId + ephemeralKeySecret
 * from your Supabase Edge Function before calling presentIdentityVerificationSheet.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useStripe } from '@stripe/stripe-react-native';
import Button from '../components/Button';
import { Colors, Typography, Spacing } from '../constants/theme';

// ─── Component ────────────────────────────────────────────────────────────────

export default function IdVerifyScreen() {
  const router  = useRouter();
  const { presentIdentityVerificationSheet } = useStripe();

  const [message, setMessage]     = useState<string | null>(null);
  const [isError, setIsError]     = useState(false);
  const [loading, setLoading]     = useState(false);

  // ─── Handler ────────────────────────────────────────────────────────────────

  const verifyIdentity = async () => {
    setLoading(true);
    setMessage(null);

    try {
      // TODO Stage 20: fetch verificationSessionId + ephemeralKeySecret from
      // a Supabase Edge Function that calls the Stripe Identity API server-side.
      const verificationSessionId = '';
      const ephemeralKeySecret    = '';

      const { error } = await presentIdentityVerificationSheet({
        verificationSessionId,
        ephemeralKeySecret,
      });

      if (!error) {
        // Verification completed — proceed to profile setup.
        router.push('/profile-setup');
        return;
      }

      if (error.code === 'Canceled') {
        setIsError(false);
        setMessage('Verification is required to use htwa.');
      } else {
        setIsError(true);
        setMessage(error.message ?? 'Something went wrong. Please try again.');
      }
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
});
