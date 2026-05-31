/**
 * app/settings.tsx
 *
 * Settings screen (SCREENS.md #23) — accessed via the cog on the Profile tab.
 * Placeholder until its own phase: notification prefs, women-only mode toggle,
 * currency display, privacy, account deletion all land later. Kept as a real
 * route so the Profile cog navigates somewhere coherent rather than a 404.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '../constants/theme';

export default function SettingsScreen(): React.ReactElement {
  const router = useRouter();
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
});
