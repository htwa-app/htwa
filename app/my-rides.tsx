/**
 * app/my-rides.tsx
 *
 * My Rides / Manage My Rides (SCREENS.md #16) — linked from the Profile screen.
 * Placeholder until Phase 6 (Ride Flows), which builds the full upcoming/past
 * ride management. Kept as a real route so the Profile link resolves coherently.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '../constants/theme';

export default function MyRidesScreen(): React.ReactElement {
  const router = useRouter();
  return (
    <View style={styles.screen} testID="my-rides-screen">
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
        <Text style={styles.title}>My rides</Text>
        <View style={styles.spacer} />
      </View>
      <View style={styles.body}>
        <Ionicons name="car-outline" size={40} color={Colors.textTertiary} />
        <Text style={styles.message}>Your rides will appear here.</Text>
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
