/**
 * app/settings.tsx
 *
 * Settings screen (SCREENS.md #23) — accessed via the cog on the Profile tab.
 * Placeholder until its own phase: notification prefs, women-only mode toggle,
 * currency display, privacy, account deletion all land later. Kept as a real
 * route so the Profile cog navigates somewhere coherent rather than a 404.
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';
import { devResetAndSignOut } from '../utils/devReset';

export default function SettingsScreen(): React.ReactElement {
  const router = useRouter();
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // DEV-ONLY: sign out + wipe cached session/onboarding state, then return to the
  // first auth screen so the next launch behaves like a fresh install. Gated on
  // __DEV__ so it NEVER renders in production builds.
  const handleDevReset = async (): Promise<void> => {
    setResetError(null);
    setResetting(true);
    try {
      await devResetAndSignOut();
      router.replace('/login');
    } catch (e) {
      // Surface the failure rather than leaving a half-cleared state.
      setResetError(e instanceof Error ? e.message : 'Reset failed. Please try again.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <View style={styles.screen} testID="settings-screen">
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          testID="back-button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.spacer} />
      </View>
      <View style={styles.body}>
        <Ionicons name="settings-outline" size={40} color={Colors.textTertiary} />
        <Text style={styles.message}>Settings are coming soon.</Text>
      </View>

      {__DEV__ && (
        <View style={styles.devSection} testID="dev-tools">
          <Text style={styles.devLabel}>Developer tools</Text>
          <TouchableOpacity
            style={[styles.devButton, resetting && styles.devButtonDisabled]}
            onPress={handleDevReset}
            disabled={resetting}
            accessibilityRole="button"
            accessibilityLabel="Reset and sign out (dev)"
            testID="dev-reset-button"
          >
            <Ionicons name="refresh-outline" size={18} color={Colors.sos} />
            <Text style={styles.devButtonText}>
              {resetting ? 'Resetting…' : 'Reset / Sign out (dev)'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.devHint}>
            Signs out and clears cached onboarding state so the next launch starts fresh.
          </Text>
          {resetError ? (
            <Text style={styles.devError} testID="dev-reset-error">{resetError}</Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.xxxl + Spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  title: {
    ...Typography.headingLarge,
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  spacer: { width: 24 },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingBottom: Spacing.xxxxxl,
  },
  message: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
  },
  devSection: {
    gap: Spacing.sm,
    paddingBottom: Spacing.xxxl,
  },
  devLabel: {
    ...Typography.label,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
  },
  devButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.sos,
    borderRadius: BorderRadius.medium,
    paddingVertical: Spacing.md,
  },
  devButtonDisabled: { opacity: 0.6 },
  devButtonText: {
    ...Typography.bodyMedium,
    color: Colors.sos,
  },
  devHint: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
  },
  devError: {
    ...Typography.bodySmall,
    color: Colors.sos,
  },
});
