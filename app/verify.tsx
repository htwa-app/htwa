import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button } from '../components/Button';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';
import { supabase } from '../lib/supabase';
import { resolvePostAuthDestination } from '../utils/authRouting';
import type { HomeLocation, Currency, Gender } from '../types/database';

// ─── Constants ────────────────────────────────────────────────────────────────

const OTP_LENGTH              = 6;
const RESEND_COOLDOWN_SECONDS = 60;
// Allowlist for the cached gender value — anything outside the union is stored as null.
const ALLOWED_GENDERS: Gender[] = ['female', 'male', 'non_binary', 'prefer_not_to_say'];

// Friendly, generic messages — never surface a raw Postgres error (e.g.
// "duplicate key value violates unique constraint users_pkey") to the user.
const ACCOUNT_ERROR_MESSAGE = 'Something went wrong setting up your account. Please try again.';
const STATE_ERROR_MESSAGE   = "We couldn't check your account status. Please try again.";
const NO_ACCOUNT_MESSAGE    = "We couldn't find an account for that email.";

type VerifyMode = 'signup' | 'login';

// ─── Component ────────────────────────────────────────────────────────────────

export default function VerifyScreen() {
  const router = useRouter();
  const { email = '', mode: modeParam } = useLocalSearchParams<{ email?: string; mode?: string }>();
  const mode: VerifyMode = modeParam === 'login' ? 'login' : 'signup';

  // ── State ───────────────────────────────────────────────────────────────────
  const [digits,       setDigits]       = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [cooldown,     setCooldown]     = useState(0);
  const [verifyError,  setVerifyError]  = useState<string | null>(null);
  // Distinct from verifyError: only true for "no account found" in login mode,
  // so the UI can offer a "Sign up instead" link rather than just an error.
  const [noAccount,    setNoAccount]    = useState(false);

  // ── Refs ────────────────────────────────────────────────────────────────────
  const inputRefs      = useRef<(TextInput | null)[]>(Array(OTP_LENGTH).fill(null));
  const intervalRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSubmittingRef = useRef(false);

  const isComplete = digits.every(d => d.length === 1);

  /**
   * Shared by both modes once a public.users row is confirmed to exist:
   * reads the current verification + profile state and routes accordingly,
   * so a user lands in the same place regardless of which flow they came
   * through (mirrors SplashScreen's own precedence: unverified beats a
   * missing profile).
   */
  const routeByCurrentState = async (userId: string): Promise<boolean> => {
    const { data: verifRow, error: verifErr } = await supabase
      .from('verification')
      .select('id_verified, selfie_verified')
      .eq('user_id', userId)
      .maybeSingle();
    if (verifErr) {
      setVerifyError(STATE_ERROR_MESSAGE);
      return false;
    }
    const isVerified = verifRow?.id_verified === true && verifRow?.selfie_verified === true;

    const { data: profileRow, error: profileErr } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();
    if (profileErr) {
      setVerifyError(STATE_ERROR_MESSAGE);
      return false;
    }
    const hasProfile = profileRow !== null;

    router.replace(resolvePostAuthDestination({ isVerified, hasProfile }));
    return true;
  };

  // ── Verify OTP, then write (signup) or read (login) state, then route ────────
  const verifyCode = async () => {
    if (isSubmittingRef.current || !isComplete) return;
    isSubmittingRef.current = true;
    setVerifyError(null);
    setNoAccount(false);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: digits.join(''),
        type:  'email',
      });
      if (error || !data.user) {
        setVerifyError(error?.message ?? 'Verification failed');
        return;
      }
      const userId = data.user.id;

      if (mode === 'login') {
        // Returning user — never create a new account on this path. Confirm
        // one already exists before deciding where to route.
        const { data: userRow, error: userErr } = await supabase
          .from('users')
          .select('id')
          .eq('id', userId)
          .maybeSingle();
        if (userErr) {
          setVerifyError(STATE_ERROR_MESSAGE);
          return;
        }
        if (!userRow) {
          setNoAccount(true);
          setVerifyError(NO_ACCOUNT_MESSAGE);
          return;
        }
        await routeByCurrentState(userId);
        return;
      }

      // ── Signup mode ──────────────────────────────────────────────────────
      // Read user data saved by the signup screen
      const [fullName, phone, homeLocation, currency, gender] = await Promise.all([
        AsyncStorage.getItem('htwa:fullName'),
        AsyncStorage.getItem('htwa:phone'),
        AsyncStorage.getItem('htwa:homeLocation'),
        AsyncStorage.getItem('htwa:currency'),
        AsyncStorage.getItem('htwa:gender'),
      ]);
      // Upsert (not insert) so a retry after an interrupted signup — the same
      // auth user verifying a second time — updates the existing row instead
      // of hitting "duplicate key value violates unique constraint
      // users_pkey". onConflict targets the primary key explicitly.
      const { error: usersError } = await supabase.from('users').upsert({
        id:            userId,
        email,
        phone:         phone         ?? '',
        full_name:     fullName      ?? '',
        // Stored as valid unions by the signup screen; default to ROI/EUR if
        // absent. Use || (not ??) so an empty string also falls back — an empty
        // string would violate the DB check constraint on these columns.
        home_location: (homeLocation || 'ROI') as HomeLocation,
        currency:      (currency || 'EUR') as Currency,
        // Block 5 — gender drives the women-only filter. Validate against the
        // Gender union (don't trust the raw AsyncStorage string); null if invalid.
        gender:        ALLOWED_GENDERS.includes(gender as Gender) ? (gender as Gender) : null,
      }, { onConflict: 'id' });
      if (usersError) {
        setVerifyError(ACCOUNT_ERROR_MESSAGE);
        return;
      }
      // Create the verification row if missing (starts unverified — completed
      // by id-verify.tsx). ignoreDuplicates so a retry can NEVER clobber an
      // already-verified row back to false/false — if it exists, leave it
      // alone entirely; routeByCurrentState below reads whatever is really there.
      const { error: verificationError } = await supabase.from('verification').upsert({
        user_id:         userId,
        id_verified:     false,
        selfie_verified: false,
      }, { onConflict: 'user_id', ignoreDuplicates: true });
      if (verificationError) {
        setVerifyError(ACCOUNT_ERROR_MESSAGE);
        return;
      }
      await routeByCurrentState(userId);
    } catch {
      setVerifyError('Something went wrong. Please try again.');
    } finally {
      isSubmittingRef.current = false;
    }
  };

  // ── Auto-submit when all 6 digits are entered ───────────────────────────────
  useEffect(() => {
    if (isComplete) {
      void verifyCode();
    }
    // verifyCode is defined at component scope and captures stable refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComplete]);

  // ── Clean up interval on unmount ────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleDigitChange = (index: number, value: string) => {
    setVerifyError(null); // clear any previous error when the user retypes
    setNoAccount(false);
    const digit = value.replace(/\D/g, '').slice(-1);
    const next  = [...digits];
    next[index] = digit;
    setDigits(next);
    // Auto-advance to next box on input
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    // Backspace on empty box moves focus to previous box
    if (key === 'Backspace' && digits[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setVerifyError(null);
    setNoAccount(false);
    const { error: resendError } = await supabase.auth.resend({ email, type: 'signup' });
    if (resendError) {
      setVerifyError(resendError.message ?? 'Unable to resend code. Please try again.');
      return;
    }
    // Only start the countdown after a confirmed successful resend
    setCooldown(RESEND_COOLDOWN_SECONDS);
    intervalRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const formatCooldown = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const resendLabel = cooldown > 0
    ? `Resend in ${formatCooldown(cooldown)}`
    : 'Resend code';

  const wrongEmailDestination = mode === 'login' ? '/login-email' : '/signup';

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      bounces={false}
      showsVerticalScrollIndicator={false}
    >

      {/* ── Title ───────────────────────────────────────────────────────────── */}
      <Text style={styles.title}>Check your email</Text>
      <Text style={styles.subtitle}>
        We sent a 6-digit code to {email || 'your email'}
      </Text>

      {/* ── OTP boxes ───────────────────────────────────────────────────────── */}
      <View style={styles.otpRow}>
        {digits.map((digit, index) => (
          <TextInput
            key={index}
            ref={ref => { inputRefs.current[index] = ref; }}
            style={[
              styles.otpBox,
              focusedIndex === index && styles.otpBoxFocused,
            ]}
            value={digit}
            onChangeText={value => handleDigitChange(index, value)}
            onKeyPress={({ nativeEvent: { key } }) => handleKeyPress(index, key)}
            onFocus={() => setFocusedIndex(index)}
            onBlur={() => setFocusedIndex(null)}
            keyboardType="numeric"
            maxLength={1}
            textAlign="center"
            autoComplete="one-time-code"
            testID={`otp-input-${index}`}
            accessibilityLabel={`Digit ${index + 1}`}
          />
        ))}
      </View>

      {/* ── Verify button ───────────────────────────────────────────────────── */}
      <Button
        title="Verify"
        disabled={!isComplete}
        onPress={verifyCode}
        style={styles.verifyButton}
      />

      {/* ── Verify error ────────────────────────────────────────────────────── */}
      {verifyError && (
        <Text style={styles.errorText} testID="verify-error">{verifyError}</Text>
      )}

      {/* ── No account found (login mode) ──────────────────────────────────── */}
      {noAccount && (
        <TouchableOpacity
          onPress={() => router.push('/signup')}
          accessibilityRole="button"
          accessibilityLabel="Sign up instead"
          style={styles.noAccountLink}
        >
          <Text style={styles.noAccountLinkText}>Sign up instead</Text>
        </TouchableOpacity>
      )}

      {/* ── Resend ──────────────────────────────────────────────────────────── */}
      <TouchableOpacity
        onPress={handleResend}
        disabled={cooldown > 0}
        accessibilityRole="button"
        accessibilityLabel={resendLabel}
        accessibilityState={{ disabled: cooldown > 0 }}
        style={styles.resendButton}
      >
        <Text style={[styles.resendText, cooldown > 0 && styles.resendTextCooldown]}>
          {resendLabel}
        </Text>
      </TouchableOpacity>

      {/* ── Wrong email ─────────────────────────────────────────────────────── */}
      <TouchableOpacity
        onPress={() => router.push(wrongEmailDestination)}
        accessibilityRole="button"
        accessibilityLabel="Wrong email? Go back"
        style={styles.backLink}
      >
        <Text style={styles.backLinkText}>Wrong email? Go back</Text>
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

  // Header
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

  // OTP input row
  otpRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xxxl,
  },
  otpBox: {
    width:        Spacing.inputHeight,       // 52 px
    height:       Spacing.inputHeight,       // 52 px
    borderRadius: BorderRadius.medium,       // 12 px
    backgroundColor: Colors.surface,
    borderWidth:  1.5,
    borderColor:  Colors.border,
    fontSize:     Typography.displayMedium.fontSize,    // 24 px
    fontFamily:   Typography.displayMedium.fontFamily,  // Poppins 600
    color:        Colors.textPrimary,
    textAlign:    'center',
  },
  otpBoxFocused: {
    borderColor: Colors.primary,
  },

  // Verify button
  verifyButton: {
    width: '100%',
    marginBottom: Spacing.lg,
  },

  // Resend
  resendButton: {
    marginBottom: Spacing.xxl,
  },
  resendText: {
    ...Typography.bodyMedium,
    color: Colors.primary,
  },
  resendTextCooldown: {
    color: Colors.textTertiary,
  },

  // Inline error below the Verify button
  errorText: {
    ...Typography.bodySmall,
    color: Colors.sos,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },

  // No-account-found link (login mode)
  noAccountLink: {
    marginBottom: Spacing.lg,
  },
  noAccountLinkText: {
    ...Typography.bodyMedium,
    color: Colors.primary,
    textDecorationLine: 'underline',
  },

  // Wrong email link
  backLink: {
    marginTop: Spacing.sm,
  },
  backLinkText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
