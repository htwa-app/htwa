/**
 * app/ride-posted.tsx
 *
 * Stage 32b — Ride Posted Confirmation screen.
 * Shown after a driver successfully posts a ride.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/Button';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';

export default function RidePostedScreen(): React.ReactElement {
  const router = useRouter();
  return (
    <View style={styles.container} testID="ride-posted-screen">
      <View style={styles.iconCircle}>
        <Ionicons name="checkmark-circle" size={56} color={Colors.verified} />
      </View>
      <Text style={styles.title}>Ride posted!</Text>
      <Text style={styles.subtitle}>
        Your ride is now live. Passengers can request to join.
      </Text>
      <Button
        title="View my rides"
        onPress={() => router.replace('/my-rides')}
        style={styles.button}
        testID="view-rides-button"
      />
      <Button
        title="Back to search"
        variant="secondary"
        onPress={() => router.replace('/(tabs)')}
        style={styles.button}
        testID="back-to-search-button"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.screenPadding, gap: Spacing.lg,
  },
  iconCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  title: { ...Typography.displayMedium, color: Colors.textPrimary, textAlign: 'center' },
  subtitle: { ...Typography.bodyLarge, color: Colors.textSecondary, textAlign: 'center' },
  button: { width: '100%' },
});
