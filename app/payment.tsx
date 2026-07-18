/**
 * app/payment.tsx
 *
 * Stage 41 — Payment screen.
 * Triggers the Stripe Payment Sheet for a booking.
 *
 * Flow:
 *   1. Call Supabase Edge Function to create a PaymentIntent (with 10% platform fee)
 *   2. Init the Stripe Payment Sheet
 *   3. Present the Payment Sheet
 *   4. On success → route to /payment-confirmation
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useStripe } from '@stripe/stripe-react-native';
import { Button } from '../components/Button';
import { formatCurrency } from '../utils/currency';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// ─── Spec-local constant ──────────────────────────────────────────────────────

/** Platform fee rate displayed to user */
const PLATFORM_FEE_DISPLAY = '10%';

export default function PaymentScreen(): React.ReactElement {
  const router = useRouter();
  const { user } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const params  = useLocalSearchParams<{
    bookingId: string; rideId: string;
    amount: string; currency: string;
    driverStripeAccountId: string;
  }>();

  const [isInitialising, setIsInitialising] = useState(false);
  const [isReady,        setIsReady]        = useState(false);
  const [isProcessing,   setIsProcessing]   = useState(false);
  const [error,          setError]          = useState<string | null>(null);

  const amount      = parseFloat(params.amount ?? '0');
  const currency    = (params.currency ?? 'EUR') as 'EUR' | 'GBP';
  const platformFee = Math.round(amount * 0.1 * 100) / 100;
  const stripeCode  = currency === 'EUR' ? 'eur' : 'gbp';

  useEffect(() => {
    void initSheet();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initSheet = async () => {
    if (!user || !params.bookingId || !params.rideId) {
      setError('Missing booking details. Please try again.');
      return;
    }
    setIsInitialising(true);
    setError(null);
    try {
      const amountMinorUnits = Math.round(amount * 100);

      // Call Edge Function to create PaymentIntent
      const { data, error: fnErr } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          bookingId:            params.bookingId,
          rideId:               params.rideId,
          passengerId:          user.id,
          amountMinorUnits,
          currency:             stripeCode,
          driverStripeAccountId: params.driverStripeAccountId,
        },
      });
      if (fnErr || !data?.clientSecret) {
        setError('Could not initialise payment. Please try again.');
        return;
      }

      const { error: sheetErr } = await initPaymentSheet({
        paymentIntentClientSecret: data.clientSecret,
        merchantDisplayName:       'htwa',
        allowsDelayedPaymentMethods: false,
      });
      if (sheetErr) { setError(sheetErr.message); return; }
      setIsReady(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Payment setup failed.');
    } finally {
      setIsInitialising(false);
    }
  };

  const handlePay = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const { error: presentErr } = await presentPaymentSheet();
      if (presentErr) {
        if (presentErr.code !== 'Canceled') setError(presentErr.message);
        return;
      }
      router.replace(
        `/payment-confirmation?bookingId=${params.bookingId}&amount=${amount}&currency=${currency}`,
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Payment failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.screen} testID="payment-screen">
      <Text style={styles.title}>Payment</Text>

      <View style={styles.breakdownCard}>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Journey cost</Text>
          <Text style={styles.breakdownValue} testID="ride-cost">
            {formatCurrency(amount - platformFee, currency)}
          </Text>
        </View>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Platform fee ({PLATFORM_FEE_DISPLAY})</Text>
          <Text style={styles.breakdownValue} testID="platform-fee">
            {formatCurrency(platformFee, currency)}
          </Text>
        </View>
        <View style={[styles.breakdownRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue} testID="payment-total">
            {formatCurrency(amount, currency)}
          </Text>
        </View>
      </View>

      {isInitialising && (
        <ActivityIndicator size="large" color={Colors.primary} testID="payment-loading" />
      )}

      {error && (
        <Text style={styles.errorText} testID="payment-error">{error}</Text>
      )}

      {isReady && !isInitialising && (
        <Button
          title={isProcessing ? 'Processing…' : `Pay ${formatCurrency(amount, currency)}`}
          onPress={handlePay}
          disabled={isProcessing}
          style={styles.payButton}
          testID="pay-button"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1, backgroundColor: Colors.background,
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.xxxl + Spacing.xl,
    gap: Spacing.lg,
  },
  title: { ...Typography.headingLarge, color: Colors.textPrimary },
  breakdownCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.large,
    borderWidth: 1, borderColor: Colors.border, ...Shadows.card,
    padding: Spacing.cardPadding, gap: Spacing.sm,
  },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between' },
  breakdownLabel: { ...Typography.bodyMedium, color: Colors.textSecondary },
  breakdownValue: { ...Typography.bodyMedium, color: Colors.textPrimary },
  totalRow: {
    paddingTop: Spacing.sm, borderTopWidth: 1,
    borderTopColor: Colors.border, marginTop: Spacing.sm,
  },
  totalLabel: { ...Typography.headingSmall, color: Colors.textPrimary },
  totalValue: { ...Typography.headingSmall, color: Colors.primary },
  errorText: { ...Typography.bodySmall, color: Colors.sos, textAlign: 'center' },
  payButton: {},
});
