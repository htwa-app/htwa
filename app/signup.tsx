import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';
import type { HomeLocation, Currency } from '../types/database';

// ─── Component ────────────────────────────────────────────────────────────────

export default function SignupScreen() {
  const router = useRouter();

  // ── Form state ──────────────────────────────────────────────────────────────
  const [fullName,     setFullName]     = useState('');
  const [email,        setEmail]        = useState('');
  const [phone,        setPhone]        = useState('');
  const [university,   setUniversity]   = useState('');
  const [homeLocation, setHomeLocation] = useState<HomeLocation | null>(null);
  // currency is derived from homeLocation — stored so it can be read by later screens
  const [currency, setCurrency]         = useState<Currency | null>(null); // eslint-disable-line @typescript-eslint/no-unused-vars

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleSelectLocation = (location: HomeLocation) => {
    setHomeLocation(location);
    setCurrency(location === 'ROI' ? 'EUR' : 'GBP');
  };

  // ── Validation ────────────────────────────────────────────────────────────────
  const isValid = useMemo(() => {
    const phoneDigits = phone.replace(/\D/g, '');
    return (
      fullName.trim().length > 0 &&
      email.includes('@') &&
      email.includes('.') &&
      phoneDigits.length >= 9 &&
      university.trim().length > 0 &&
      homeLocation !== null
    );
  }, [fullName, email, phone, university, homeLocation]);

  // TODO Stage 20: call supabase.auth.signUp({ email, password, phone }) then pass email to /verify
  const handleContinue = () => router.push('/verify');

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      bounces={false}
      showsVerticalScrollIndicator={false}
    >

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <Text style={styles.title}>Create your account</Text>
      <Text style={styles.subtitle}>Tell us a bit about yourself.</Text>

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

      {/* ── Continue button ────────────────────────────────────────────────── */}
      <Button
        title="Continue"
        disabled={!isValid}
        onPress={handleContinue}
        style={styles.continueButton}
      />

    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.xxxxxl,
    paddingBottom: Spacing.xxxxxl,
  },

  // Header
  title: {
    ...Typography.displayMedium,
    color: Colors.textPrimary,
  },
  subtitle: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },

  // Form
  form: {
    marginTop: Spacing.xxl,
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
  pill: {
    height: Spacing.buttonHeightSmall,
    paddingHorizontal: Spacing.xxl,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pillText: {
    ...Typography.buttonSmall,
    color: Colors.textPrimary,
  },
  pillTextSelected: {
    color: Colors.surface,
  },
  locationHint: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
  },

  // Continue button
  continueButton: {
    marginTop: Spacing.xxxl,
    width: '100%',
  },
});
