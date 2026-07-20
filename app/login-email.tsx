/**
 * app/login-email.tsx
 *
 * Returning-user sign-in — email entry step. Reached from login.tsx's
 * "Continue with email" button and signup.tsx's "Already have an account?
 * Log in" link.
 *
 * Deliberately does NOT create a new account: signInWithOtp is called with
 * shouldCreateUser: false, so an email with no existing auth.users record
 * fails here (before any OTP is even sent) with a friendly prompt to sign up
 * instead, rather than sending a code and only discovering the problem later.
 *
 * On success, routes to the shared /verify OTP-entry screen with
 * mode: 'login' so it knows not to write a new public.users row and instead
 * routes based on the user's existing verification/profile state.
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Colors, FontFamily, Typography, Spacing } from '../constants/theme';
import { validateEmail } from '../utils/validators';

const BRAND_NAME    = 'htwa';
const BRAND_DOT     = '.';
const BRAND_TAGLINE = 'heading that way anyway.';

/** Errors here mean "no account for this email" more often than not — never
 * show the raw Supabase Auth message, which can be misleadingly technical. */
const NO_ACCOUNT_MESSAGE = "We couldn't find an account for that email.";

export default function LoginEmailScreen(): React.ReactElement {
  const router = useRouter();

  const [email,        setEmail]        = useState('');
  const [loginError,   setLoginError]   = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValid = validateEmail(email);

  const handleContinue = async () => {
    setLoginError(null);
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });
      if (error) {
        setLoginError(NO_ACCOUNT_MESSAGE);
        return;
      }
      router.push({ pathname: '/verify', params: { email, mode: 'login' } });
    } catch {
      setLoginError('Unable to continue. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      bounces={false}
      showsVerticalScrollIndicator={false}
    >

      {/* ── Logo mark + tagline — centred block ────────────────────────────── */}
      <View style={styles.logoBlock}>
        <View style={styles.logoMark}>
          <Text style={styles.logoText}>
            {BRAND_NAME}<Text style={styles.logoDot} testID="logo-dot">{BRAND_DOT}</Text>
          </Text>
        </View>
        <Text style={styles.tagline}>{BRAND_TAGLINE}</Text>
      </View>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <Text style={styles.title}>Log in</Text>
      <Text style={styles.subtitle}>Enter the email you signed up with.</Text>

      {/* ── Form ───────────────────────────────────────────────────────────── */}
      <Input
        label="Email"
        placeholder="you@university.ie"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        wrapperStyle={styles.field}
        testID="login-email-input"
      />

      <Button
        title="Continue"
        disabled={!isValid || isSubmitting}
        onPress={handleContinue}
        style={styles.continueButton}
      />

      {/* ── Login error ────────────────────────────────────────────────────── */}
      {loginError && (
        <View style={styles.errorBlock}>
          <Text style={styles.errorText} testID="login-email-error">{loginError}</Text>
          <TouchableOpacity
            onPress={() => router.push('/signup')}
            accessibilityRole="button"
            accessibilityLabel="Sign up instead"
          >
            <Text style={styles.errorLink}>Sign up instead</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Back to other sign-in options ──────────────────────────────────── */}
      <TouchableOpacity
        onPress={() => router.push('/login')}
        accessibilityRole="button"
        accessibilityLabel="Back to sign-in options"
        style={styles.backLink}
      >
        <Text style={styles.backLinkText}>Back to sign-in options</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: Spacing.xxxxxl,
  },

  logoBlock: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: 72 * 0.22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 26,
    fontFamily: FontFamily.bold,
    color: Colors.surface,
    letterSpacing: -1,
  },
  logoDot: {
    color: Colors.amber,
  },
  tagline: {
    marginTop: Spacing.md,
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
  },

  title: {
    ...Typography.displayMedium,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.bodyLarge,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xxxl,
  },

  field: {
    width: '100%',
    marginBottom: Spacing.md,
  },
  continueButton: {
    width: '100%',
    marginTop: Spacing.md,
  },

  errorBlock: {
    marginTop: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  errorText: {
    ...Typography.bodySmall,
    color: Colors.sos,
    textAlign: 'center',
  },
  errorLink: {
    ...Typography.bodySmall,
    color: Colors.primary,
    textDecorationLine: 'underline',
  },

  backLink: {
    marginTop: Spacing.xxl,
  },
  backLinkText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
