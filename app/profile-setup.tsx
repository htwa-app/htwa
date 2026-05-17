/**
 * app/profile-setup.tsx
 *
 * Stage 19 — Nominated contact setup screen.
 * Collects the name and phone number of a trusted contact who will receive
 * a live journey tracking link whenever the user travels.
 *
 * Stage 20C: saves nominated contact to Supabase profiles table.
 * AsyncStorage is kept as a local cache for offline access.
 */

import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import Input from '../components/Input';
import Button from '../components/Button';
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  FontFamily,
} from '../constants/theme';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// ─── Brand constants ──────────────────────────────────────────────────────────

const BRAND_NAME = 'htwa';
const BRAND_DOT  = '.';

// ─── AsyncStorage keys ────────────────────────────────────────────────────────

const STORAGE_CONTACT_NAME  = 'htwa:nominatedContact:name';
const STORAGE_CONTACT_PHONE = 'htwa:nominatedContact:phone';

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [contactName,  setContactName]  = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [saveError,    setSaveError]    = useState<string | null>(null);
  const [isSaving,     setIsSaving]     = useState(false);

  const isValid = useMemo(
    () => contactName.trim().length > 0 && contactPhone.trim().length > 0,
    [contactName, contactPhone],
  );

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!user) {
      setSaveError('Not signed in. Please log in again.');
      return;
    }
    setSaveError(null);
    setIsSaving(true);
    try {
      const { error } = await supabase.from('profiles').upsert({
        user_id:           user.id,
        nominated_contact: { name: contactName.trim(), phone: contactPhone.trim() },
      });
      if (error) {
        setSaveError(error.message);
        return;
      }
      // AsyncStorage kept as local cache — Supabase is source of truth
      void AsyncStorage.setItem(STORAGE_CONTACT_NAME,  contactName.trim());
      void AsyncStorage.setItem(STORAGE_CONTACT_PHONE, contactPhone.trim());
      router.replace('/(tabs)');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    // No Supabase call needed — user can add a contact later from their profile
    router.replace('/(tabs)');
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      bounces={false}
      showsVerticalScrollIndicator={false}
    >

      {/* ── Logo mark ────────────────────────────────────────────────────────── */}
      <View style={styles.logoBlock}>
        <View style={styles.logoMark}>
          <Text style={styles.logoText}>
            {BRAND_NAME}<Text style={styles.logoDot} testID="logo-dot">{BRAND_DOT}</Text>
          </Text>
        </View>
      </View>

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <Text style={styles.title}>Almost there!</Text>
      <Text style={styles.subtitle}>
        Add a trusted contact who will receive your live journey tracking link every time you travel.
      </Text>

      {/* ── Form fields ──────────────────────────────────────────────────────── */}
      <View style={styles.form}>

        <Input
          label="Their name"
          placeholder="e.g. Mam, Dad, Aoife"
          value={contactName}
          onChangeText={setContactName}
          autoCapitalize="words"
          wrapperStyle={styles.field}
        />

        <Input
          label="Their number"
          placeholder="+353 or +44"
          value={contactPhone}
          onChangeText={setContactPhone}
          keyboardType="phone-pad"
          wrapperStyle={styles.field}
        />

      </View>

      {/* ── Info box ─────────────────────────────────────────────────────────── */}
      <View style={styles.infoBox}>
        <Ionicons
          name="information-circle-outline"
          size={20}
          color={Colors.primary}
          style={styles.infoIcon}
        />
        <Text style={styles.infoText}>
          They don't need the htwa app. They'll get a link by text when your journey starts.
        </Text>
      </View>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <Button
        title="Save and continue"
        onPress={handleSave}
        disabled={!isValid || isSaving}
        style={styles.saveButton}
      />

      {/* ── Save error ───────────────────────────────────────────────────────── */}
      {saveError && (
        <Text style={styles.errorText}>{saveError}</Text>
      )}

      {/* ── Skip link ────────────────────────────────────────────────────────── */}
      <TouchableOpacity onPress={handleSkip} accessibilityRole="button">
        <Text style={styles.skipLink}>I'll add this later</Text>
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
    paddingTop: Spacing.xxxxxl + Spacing.xxxl, // 80px — matches signup/login screens
    paddingBottom: Spacing.xxxxxl,
    alignItems: 'center',
  },

  // Logo mark — 72×72 teal rounded square (matches login and signup screens)
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

  // Header
  title: {
    ...Typography.displayMedium,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  subtitle: {
    ...Typography.bodyLarge,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },

  // Form
  form: {
    width: '100%',
  },
  field: {
    marginBottom: Spacing.md,
  },

  // Info box
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.large,
    padding: Spacing.cardPadding,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
    width: '100%',
  },
  infoIcon: {
    marginRight: Spacing.sm,
    marginTop: 1, // optical alignment with first line of text
  },
  infoText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    flex: 1,
  },

  // CTA
  saveButton: {
    width: '100%',
    marginBottom: Spacing.lg,
  },

  // Skip link
  skipLink: {
    ...Typography.bodyMedium,
    color: Colors.primary,
  },

  // Inline error below Save button
  errorText: {
    ...Typography.bodySmall,
    color: Colors.sos,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
});
