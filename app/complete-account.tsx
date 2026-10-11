/**
 * app/complete-account.tsx
 *
 * Shown after a FIRST Sign in with Apple / Google (and to anyone signed in
 * without a public.users row — see AuthContext.accountSetupNeeded). Email signup
 * collects name / phone / home location / gender before the OTP step and writes
 * the public.users row in verify.tsx; a social sign-in arrives with only an auth
 * identity, so this collects the same fields and writes the same row. A new
 * account then continues to mandatory ID verification like everyone else.
 *
 * §12: the upsert's error is shown (generic copy, raw error logged) and the
 * button always resets; a failed "where next" lookup after the row is saved
 * is a retryable error, never a guessed destination.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Colors, FontFamily, Typography, Spacing, BorderRadius } from '../constants/theme';
import { validateAccountSetup } from '../utils/validators';
import { signOutAndClear } from '../utils/signOut';
import { getDestinationAfterSocialSignIn } from '../services/socialAuth';
import type { Currency, HomeLocation } from '../types/database';

const CURRENCY_MAP: Record<HomeLocation, Currency> = { ROI: 'EUR', NI: 'GBP' };
const ACCOUNT_ERROR = 'Something went wrong setting up your account. Please try again.';
const NEXT_STEP_ERROR = "Your account was saved, but we couldn't load the next step. Please try again.";
const NO_EMAIL_ERROR = "We couldn't read an email address from your sign-in. Please sign in with email instead.";

type RegistrationGender = 'female' | 'male';

export default function CompleteAccountScreen(): React.ReactElement | null {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isLoading } = useAuth();
  // Apple supplies a name only the first time; Google always does. Prefill, still editable.
  const { name: prefillName } = useLocalSearchParams<{ name?: string }>();

  const [fullName, setFullName] = useState(typeof prefillName === 'string' ? prefillName : '');
  const [phone, setPhone] = useState('');
  const [homeLocation, setHomeLocation] = useState<HomeLocation | null>(null);
  const [gender, setGender] = useState<RegistrationGender | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Not signed in → this screen has nothing to do.
  useEffect(() => {
    if (!isLoading && !user) router.replace('/login');
  }, [isLoading, user, router]);

  const isValid = useMemo(
    () => validateAccountSetup({ fullName, phone, homeLocation, gender }),
    [fullName, phone, homeLocation, gender],
  );

  const handleContinue = async () => {
    if (!user || !homeLocation || !gender || isSubmitting) return;
    if (!user.email) { setError(NO_EMAIL_ERROR); return; }
    setError(null);
    setIsSubmitting(true);
    try {
      // Upsert (not insert) so a retry after an interrupted attempt updates the
      // row instead of hitting the primary-key constraint — same as verify.tsx.
      const { error: upsertErr } = await supabase.from('users').upsert(
        {
          id: user.id,
          email: user.email,
          phone: phone.trim(),
          full_name: fullName.trim(),
          home_location: homeLocation,
          currency: CURRENCY_MAP[homeLocation],
          gender,
        },
        { onConflict: 'id' },
      );
      if (upsertErr) {
        console.error('[CompleteAccount] users upsert failed:', upsertErr.message);
        setError(ACCOUNT_ERROR);
        return;
      }
      const next = await getDestinationAfterSocialSignIn(user.id);
      if (!next.ok) { setError(NEXT_STEP_ERROR); return; }
      // A brand-new account has no verification row → /id-verify (mandatory for everyone).
      router.replace(next.destination === '/complete-account' ? '/id-verify' : next.destination);
    } catch (e) {
      console.error('[CompleteAccount] threw:', e instanceof Error ? e.message : e);
      setError(ACCOUNT_ERROR);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutAndClear();
    } catch (e) {
      console.error('[CompleteAccount] sign-out failed:', e instanceof Error ? e.message : e);
    }
    router.replace('/login');
  };

  if (isLoading || !user) return null;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + Spacing.lg }]}
      keyboardShouldPersistTaps="handled"
      testID="complete-account-screen"
    >
      <Text style={styles.title}>Finish setting up</Text>
      <Text style={styles.subtitle}>
        A few details so drivers and passengers know who they're travelling with. Next you'll verify your identity —
        that's required for everyone on htwa.
      </Text>

      <View style={styles.form}>
        <Input
          label="Full name"
          placeholder="Your full name"
          value={fullName}
          onChangeText={setFullName}
          autoCapitalize="words"
          wrapperStyle={styles.field}
          testID="ca-full-name"
        />
        <Input
          label="Phone number"
          placeholder="+353 ..."
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          wrapperStyle={styles.field}
          testID="ca-phone"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Home location</Text>
        <View style={styles.pillRow}>
          {(['ROI', 'NI'] as HomeLocation[]).map((loc) => (
            <TouchableOpacity
              key={loc}
              style={[styles.pill, homeLocation === loc && styles.pillSelected]}
              onPress={() => setHomeLocation(loc)}
              accessibilityRole="button"
              accessibilityLabel={loc}
              accessibilityState={{ selected: homeLocation === loc }}
              testID={`ca-location-${loc}`}
            >
              <Text style={[styles.pillText, homeLocation === loc && styles.pillTextSelected]}>{loc}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.hint}>
          {homeLocation === 'ROI'
            ? 'Costs displayed in euros (€)'
            : homeLocation === 'NI'
            ? 'Costs displayed in pounds (£)'
            : 'Sets your currency display'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Gender</Text>
        <View style={styles.pillRow}>
          {([['female', 'Female'], ['male', 'Male']] as Array<[RegistrationGender, string]>).map(([value, label]) => (
            <TouchableOpacity
              key={value}
              style={[styles.pill, gender === value && styles.pillSelected]}
              onPress={() => setGender(value)}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ selected: gender === value }}
              testID={`ca-gender-${value}`}
            >
              <Text style={[styles.pillText, gender === value && styles.pillTextSelected]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.hint}>
          Everyone is free to identify however they wish. For the safety and protection of our users, we record the
          gender shown on your government-issued ID, for consistency and safety. This also enables our women-only
          journeys feature.
        </Text>
      </View>

      <Button
        title={isSubmitting ? 'Saving…' : 'Continue'}
        disabled={!isValid || isSubmitting}
        onPress={handleContinue}
        style={styles.continueButton}
        testID="ca-continue"
      />

      {error && <Text style={styles.errorText} testID="ca-error">{error}</Text>}

      <TouchableOpacity
        onPress={handleSignOut}
        accessibilityRole="button"
        accessibilityLabel="Use a different account"
        style={styles.signOutLink}
        testID="ca-sign-out"
      >
        <Text style={styles.signOutText}>Use a different account</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  // paddingTop is set inline (insets.top + Spacing.lg) so content clears the
  // status bar/Dynamic Island on every device instead of a fixed value.
  container: { paddingHorizontal: Spacing.screenPadding, paddingBottom: Spacing.xxxxxl },
  title: { ...Typography.displayMedium, color: Colors.textPrimary },
  subtitle: { ...Typography.bodyMedium, color: Colors.textSecondary, marginTop: Spacing.sm },
  form: { marginTop: Spacing.xl },
  field: { marginBottom: Spacing.md },
  section: { marginTop: Spacing.md },
  label: { ...Typography.bodySmall, color: Colors.textSecondary, marginBottom: Spacing.xs },
  pillRow: { flexDirection: 'row', gap: Spacing.sm },
  pill: {
    height: Spacing.buttonHeightSmall,
    paddingHorizontal: Spacing.xxl,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillSelected: { backgroundColor: Colors.primary },
  pillText: { ...Typography.buttonSmall, color: Colors.primary },
  pillTextSelected: { color: Colors.surface },
  hint: { ...Typography.bodySmall, color: Colors.textTertiary, marginTop: Spacing.xs },
  continueButton: { marginTop: Spacing.xxxl, width: '100%' },
  errorText: { ...Typography.bodySmall, color: Colors.sos, marginTop: Spacing.sm, textAlign: 'center' },
  signOutLink: { marginTop: Spacing.xl, alignSelf: 'center' },
  signOutText: { ...Typography.bodySmall, color: Colors.primary, fontFamily: FontFamily.medium },
});
