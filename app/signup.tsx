import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Colors, FontFamily, Typography, Spacing, BorderRadius } from '../constants/theme';
import { validateSignupForm } from '../utils/validators';
import type { HomeLocation, Currency } from '../types/database';

// ─── Brand constants ──────────────────────────────────────────────────────────
const BRAND_NAME    = 'htwa';
const BRAND_DOT     = '.';
const BRAND_TAGLINE = 'heading that way anyway.';

// ─── Location → currency mapping ──────────────────────────────────────────────
const CURRENCY_MAP: Record<HomeLocation, Currency> = {
  ROI: 'EUR',
  NI:  'GBP',
};

// ─── AsyncStorage keys ────────────────────────────────────────────────────────
const STORAGE_FULL_NAME     = 'htwa:fullName';
const STORAGE_PHONE         = 'htwa:phone';
const STORAGE_HOME_LOCATION = 'htwa:homeLocation';
const STORAGE_CURRENCY      = 'htwa:currency';
const STORAGE_GENDER        = 'htwa:gender';

// Block 5 — registration captures exactly TWO gender options. This drives the
// women-only journeys filter (women-only mode works both ways).
type RegistrationGender = 'female' | 'male';

// ─── Component ────────────────────────────────────────────────────────────────

export default function SignupScreen() {
  const router = useRouter();

  // ── Form state ──────────────────────────────────────────────────────────────
  const [fullName,     setFullName]     = useState('');
  const [email,        setEmail]        = useState('');
  const [phone,        setPhone]        = useState('');
  const [university,   setUniversity]   = useState('');
  const [homeLocation, setHomeLocation] = useState<HomeLocation | null>(null);
  const [gender,       setGender]       = useState<RegistrationGender | null>(null);
  // currency is derived from homeLocation — persisted to AsyncStorage on continue
  const [currency, setCurrency]         = useState<Currency | null>(null);

  // ── Async state ─────────────────────────────────────────────────────────────
  const [signupError,  setSignupError]  = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleSelectLocation = (location: HomeLocation) => {
    setHomeLocation(location);
    setCurrency(CURRENCY_MAP[location]);
  };

  // ── Validation ────────────────────────────────────────────────────────────────
  const isValid = useMemo(
    () => validateSignupForm({ fullName, email, phone, university, homeLocation }) && gender !== null,
    [fullName, email, phone, university, homeLocation, gender],
  );

  const handleContinue = async () => {
    setSignupError(null);
    setIsSubmitting(true);
    try {
      // signInWithOtp sends a 6-digit code (not a magic link) when the
      // Supabase "Magic Link" email template uses {{ .Token }}.
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { data: { full_name: fullName, phone } },
      });
      if (error) {
        setSignupError(error.message);
        return;
      }
      // Persist user data for the verify step — await so values are guaranteed
      // to be readable by app/verify.tsx before the OTP entry screen mounts.
      await Promise.all([
        AsyncStorage.setItem(STORAGE_FULL_NAME,     fullName),
        AsyncStorage.setItem(STORAGE_PHONE,         phone),
        AsyncStorage.setItem(STORAGE_HOME_LOCATION, homeLocation ?? ''),
        AsyncStorage.setItem(STORAGE_CURRENCY,      currency      ?? ''),
        AsyncStorage.setItem(STORAGE_GENDER,        gender        ?? ''),
      ]);
      router.push({ pathname: '/verify', params: { email } });
    } catch (e: unknown) {
      setSignupError(e instanceof Error ? e.message : 'Unable to continue. Please try again.');
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
      <Text style={styles.title}>Create your account</Text>

      {/* ── Form fields ────────────────────────────────────────────────────── */}
      <View style={styles.form}>

        <Input
          label="Full name"
          placeholder="Your full name"
          value={fullName}
          onChangeText={setFullName}
          autoCapitalize="words"
          wrapperStyle={styles.field}
        />

        <Input
          label="Email"
          placeholder="you@university.ie"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          wrapperStyle={styles.field}
        />

        <Input
          label="Phone number"
          placeholder="+353 ..."
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          wrapperStyle={styles.field}
        />

        <Input
          label="University"
          placeholder="e.g. UCD, TCD, QUB"
          value={university}
          onChangeText={setUniversity}
          autoCapitalize="words"
          wrapperStyle={styles.field}
        />

      </View>

      {/* ── Home location ──────────────────────────────────────────────────── */}
      <View style={styles.locationSection}>
        <Text style={styles.locationLabel}>Home location</Text>

        <View style={styles.pillRow}>

          <TouchableOpacity
            style={[styles.pill, homeLocation === 'ROI' && styles.pillSelected]}
            onPress={() => handleSelectLocation('ROI')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="ROI"
            accessibilityState={{ selected: homeLocation === 'ROI' }}
          >
            <Text style={[styles.pillText, homeLocation === 'ROI' && styles.pillTextSelected]}>
              ROI
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pill, homeLocation === 'NI' && styles.pillSelected]}
            onPress={() => handleSelectLocation('NI')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="NI"
            accessibilityState={{ selected: homeLocation === 'NI' }}
          >
            <Text style={[styles.pillText, homeLocation === 'NI' && styles.pillTextSelected]}>
              NI
            </Text>
          </TouchableOpacity>

        </View>

        <Text style={styles.locationHint}>
          {homeLocation === 'ROI'
            ? 'Costs displayed in euros (€)'
            : homeLocation === 'NI'
            ? 'Costs displayed in pounds (£)'
            : 'Sets your currency display'}
        </Text>
      </View>

      {/* ── Gender (Block 5) ───────────────────────────────────────────────── */}
      <View style={styles.locationSection}>
        <Text style={styles.locationLabel}>Gender</Text>
        <View style={styles.pillRow}>
          <TouchableOpacity
            style={[styles.pill, gender === 'female' && styles.pillSelected]}
            onPress={() => setGender('female')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Female"
            accessibilityState={{ selected: gender === 'female' }}
            testID="gender-female"
          >
            <Text style={[styles.pillText, gender === 'female' && styles.pillTextSelected]}>
              Female
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pill, gender === 'male' && styles.pillSelected]}
            onPress={() => setGender('male')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Male"
            accessibilityState={{ selected: gender === 'male' }}
            testID="gender-male"
          >
            <Text style={[styles.pillText, gender === 'male' && styles.pillTextSelected]}>
              Male
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.locationHint} testID="gender-disclaimer">
          Everyone is free to identify however they wish. For the safety and protection of our
          users, we record the gender shown on your government-issued ID, for consistency and
          safety. This also enables our women-only journeys feature.
        </Text>
      </View>

      {/* ── Continue button ────────────────────────────────────────────────── */}
      <Button
        title="Continue"
        disabled={!isValid || isSubmitting}
        onPress={handleContinue}
        style={styles.continueButton}
      />

      {/* ── Signup error ───────────────────────────────────────────────────── */}
      {signupError && (
        <Text style={styles.errorText}>{signupError}</Text>
      )}

      {/* ── Returning user ─────────────────────────────────────────────────── */}
      <TouchableOpacity
        onPress={() => router.push('/login-email')}
        accessibilityRole="button"
        accessibilityLabel="Already have an account? Log in"
        style={styles.loginLink}
      >
        <Text style={styles.loginLinkText}>
          Already have an account? <Text style={styles.loginLinkTextBold}>Log in</Text>
        </Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.xxxxxl + Spacing.xxxl, // 80px — extra breathing room
    paddingBottom: Spacing.xxxxxl,
  },

  // Logo + tagline block — centred above the form
  logoBlock: {
    alignSelf: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },

  // Logo mark — 72×72 teal rounded square (matches login screen)
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: 72 * 0.22, // 22% of size per DESIGN-SPEC
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

  // Tagline — all lowercase, period not question mark
  tagline: {
    marginTop: Spacing.md,
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
  },

  // Title
  title: {
    ...Typography.displayMedium,
    color: Colors.textPrimary,
  },

  // Form
  form: {
    marginTop: Spacing.xl,
  },
  field: {
    marginBottom: Spacing.md,
  },

  // Home location
  locationSection: {
    marginTop: Spacing.md,
  },
  locationLabel: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  pillRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },

  // Inactive pill — primaryLight background, primary text, pill shape
  pill: {
    height: Spacing.buttonHeightSmall,
    paddingHorizontal: Spacing.xxl,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Active pill — primary background, white text
  pillSelected: {
    backgroundColor: Colors.primary,
  },
  pillText: {
    ...Typography.buttonSmall,
    color: Colors.primary,
  },
  pillTextSelected: {
    color: Colors.surface,
  },

  locationHint: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
  },

  // Continue button — BorderRadius.full applied inside Button component
  continueButton: {
    marginTop: Spacing.xxxl,
    width: '100%',
  },

  // Inline error below the Continue button
  errorText: {
    ...Typography.bodySmall,
    color: Colors.sos,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },

  // Returning-user link
  loginLink: {
    marginTop: Spacing.xl,
    alignSelf: 'center',
  },
  loginLinkText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  loginLinkTextBold: {
    color: Colors.primary,
    fontFamily: FontFamily.medium,
  },
});
