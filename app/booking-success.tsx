/**
 * app/booking-success.tsx
 *
 * Stage 37 — Booking Success screen.
 * Includes the "Verify your driver" disclosure panel (2A-b): the passenger
 * sees the driver's verified identity + vehicle from the moment they book.
 */
import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/Button';
import { DriverVerifyPanel } from '../components/DriverVerifyPanel';
import { formatCurrency } from '../utils/currency';
import { Colors, Typography, Spacing } from '../constants/theme';

export default function BookingSuccessScreen(): React.ReactElement {
  const router = useRouter();
  const params  = useLocalSearchParams<{ rideId: string; seats: string; total: string; currency: string }>();
  const total    = parseFloat(params.total ?? '0');
  const currency = (params.currency ?? 'EUR') as 'EUR' | 'GBP';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      testID="booking-success-screen"
    >
      <View style={styles.iconCircle}>
        <Ionicons name="checkmark-circle" size={56} color={Colors.verified} />
      </View>
      <Text style={styles.title}>You're on the list!</Text>
      <Text style={styles.subtitle}>
        Your request has been sent to the driver. You'll hear back soon.
      </Text>
      <Text style={styles.total} testID="success-total">
        {formatCurrency(total, currency)} to be collected at confirmation
      </Text>

      {params.rideId && (
        <View style={styles.panelWrap}>
          <DriverVerifyPanel rideId={params.rideId} testID="success-driver-verify" />
        </View>
      )}

      <Button title="View trip" onPress={() => router.replace('/(tabs)/live-trip')} style={styles.btn} testID="view-trip-button" />
      <Button title="Back to search" variant="secondary" onPress={() => router.replace('/(tabs)')} style={styles.btn} testID="back-to-search-button" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  container: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.screenPadding, paddingVertical: Spacing.xxxl, gap: Spacing.lg, flexGrow: 1 },
  iconCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  title: { ...Typography.displayMedium, color: Colors.textPrimary, textAlign: 'center' },
  subtitle: { ...Typography.bodyLarge, color: Colors.textSecondary, textAlign: 'center' },
  total: { ...Typography.bodyMedium, color: Colors.primary, textAlign: 'center' },
  panelWrap: { width: '100%' },
  btn: { width: '100%' },
});
