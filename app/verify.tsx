import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button } from '../components/Button';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';

// ─── Constants ────────────────────────────────────────────────────────────────

const OTP_LENGTH              = 6;
const RESEND_COOLDOWN_SECONDS = 60;

// ─── Component ────────────────────────────────────────────────────────────────

export default function VerifyScreen() {
  const router = useRouter();
  const { email = '' } = useLocalSearchParams<{ email?: string }>();

  // ── State ───────────────────────────────────────────────────────────────────
  const [digits,       setDigits]       = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [cooldown,     setCooldown]     = useState(0);

  // ── Refs ────────────────────────────────────────────────────────────────────
  const inputRefs   = useRef<(TextInput | null)[]>(Array(OTP_LENGTH).fill(null));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isComplete = digits.every(d => d.length === 1);

  // ── Auto-submit when all 6 digits are entered ───────────────────────────────
  useEffect(() => {
    if (isComplete) {
      // TODO Stage 20: call supabase.auth.verifyOtp({ email, token: digits.join(''), type: 'email' })
      router.push('/id-verify');
    }
    // router is intentionally omitted — useRouter() returns a stable ref in Expo Router
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

  // TODO Stage 20: call supabase.auth.verifyOtp({ email, token: digits.join(''), type: 'email' })
  const handleVerify = () => router.push('/id-verify');

  // TODO Stage 20: call supabase.auth.resend({ email, type: 'signup' })
  const handleResend = () => {
    if (cooldown > 0) return;
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
        onPress={handleVerify}
        style={styles.verifyButton}
      />

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
        onPress={() => router.push('/signup')}
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
