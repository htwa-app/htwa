/**
 * app/profile-setup.tsx
 *
 * Profile setup screen stub — Stage 19.
 * Shown after ID verification is complete.
 *
 * TODO Stage 19: implement profile photo upload, display name confirmation,
 * and car details entry; then route to /(tabs).
 */

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { Colors, Typography, Spacing } from '../constants/theme';

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfileSetupScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Set up your profile</Text>
        <Text style={styles.subtitle}>Coming in Stage 19.</Text>
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
});
