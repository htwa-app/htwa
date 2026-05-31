/**
 * app/payment-confirmation.tsx
 *
 * Stage 44 — Payment Confirmation screen.
 * Shows receipt after successful payment.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/Button';
import { formatCurrency } from '../utils/currency';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';

/** Platform fee rate — 10% */
const PLATFORM_FEE_RATE = 0.10;

export default function PaymentConfirmationScreen(): React.ReactElement {
  const router = useRouter();
  const params  = useLocalSearchParams<{ bookingId: string; amount: string; currency: string }>();
  const amount      = parseFloat(params.amount ?? '0');
  const currency    = (params.currency ?? 'EUR') as 'EUR' | 'GBP';
  const platformFee = Math.round(amount * PLATFORM_FEE_RATE * 100) / 100;
  const rideCost    = Math.round((amount - platformFee) * 100) / 100;

  return (
    <View style={styles.screen} testID="payment-confirmation-screen">
      <View style={styles.iconCircle}>
        <Ionicons name="checkmark-circle" size={56} color={Colors.verified} />
      </View>
      <Text style={styles.title}>Payment confirmed!</Text>
      <Text style={styles.subtitle}>Your booking is confirmed. Have a safe journey.</Text>

      <View style={styles.receiptCard}>
        <Text style={styles.receiptTitle}>Receipt</Text>
        <View style={styles.receiptRow}>
          <Text style={styles.receiptLabel}>Ride cost</Text>
          <Text style={styles.receiptValue} testID="receipt-ride-cost">
            {formatCurrency(rideCost, currency)}
          </Text>
        </View>
        <View style={styles.receiptRow}>
          <Text style={styles.receiptLabel}>Platform fee (10%)</Text>
          <Text style={styles.receiptValue} testID="receipt-platform-fee">
            {formatCurrency(platformFee, currency)}
          </Text>
        </View>
        <View style={[styles.receiptRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total paid</Text>
          <Text style={styles.totalValue} testID="receipt-total">
            {formatCurrency(amount, currency)}
          </Text>
        </View>
      </View>

      <Button
        title="View trip"
        onPress={() => router.replace('/(tabs)/live-trip')}
        style={styles.btn}
        testID="view-trip-button"
      />
      <Button
        title="Back to search"
        variant="secondary"
        onPress={() => router.replace('/(tabs)')}
        style={styles.btn}
        testID="back-button"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1, backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.screenPadding, gap: Spacing.lg,
  },
  iconCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  title: { ...Typography.displayMedium, color: Colors.textPrimary, textAlign: 'center' },
  subtitle: { ...Typography.bodyLarge, color: Colors.textSecondary, textAlign: 'center' },
  receiptCard: {
    width: '100%', backgroundColor: Colors.surface, borderRadius: BorderRadius.large,
    borderWidth: 1, borderColor: Colors.border, ...Shadows.card,
    padding: Spacing.cardPadding, gap: Spacing.sm,
  },
  receiptTitle: { ...Typography.headingSmall, color: Colors.textPrimary, marginBottom: Spacing.xs },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between' },
  receiptLabel: { ...Typography.bodyMedium, color: Colors.textSecondary },
  receiptValue: { ...Typography.bodyMedium, color: Colors.textPrimary },
  totalRow: { paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border, marginTop: Spacing.sm },
  totalLabel: { ...Typography.headingSmall, color: Colors.textPrimary },
  totalValue: { ...Typography.headingSmall, color: Colors.primary },
  btn: { width: '100%' },
});
