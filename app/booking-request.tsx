/**
 * app/booking-request.tsx
 *
 * Stage 36 — Booking Request flow.
 * Creates a bookings row (status: pending) and decrements seats_available.
 * Handles duplicate booking gracefully.
 * Routes to /booking-success on completion.
 */

import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/Button';
import { formatCurrency } from '../utils/currency';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function BookingRequestScreen(): React.ReactElement {
  const router = useRouter();
  const { user } = useAuth();
  const params  = useLocalSearchParams<{
    rideId: string; seats: string; pricePerSeat: string; currency: string;
  }>();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  const seats        = parseInt(params.seats ?? '1', 10);
  const pricePerSeat = parseFloat(params.pricePerSeat ?? '0');
  const currency     = (params.currency ?? 'EUR') as 'EUR' | 'GBP';
  const total        = pricePerSeat * seats;

  const handleConfirm = async () => {
    if (!user || !params.rideId) return;
    setError(null);
    setIsSubmitting(true);
    try {
      // Guard against re-submitting an already-active booking (a fresh book_ride
      // call would decrement seats again). A cancelled booking is fine to revive —
      // the RPC's ON CONFLICT path re-activates it.
      const { data: existing, error: lookupErr } = await supabase
        .from('bookings')
        .select('id, status')
        .eq('ride_id', params.rideId)
        .eq('passenger_id', user.id)
        .maybeSingle();
      if (lookupErr) { setError(lookupErr.message); return; }
      if (existing && existing.status !== 'cancelled') {
        setError('You have already requested to join this ride.');
        return;
      }

      // Atomic, server-side: locks the ride row, checks availability, upserts the
      // booking (pending), decrements seats, and flips the ride to 'full' when empty.
      const { error: rpcErr } = await supabase.rpc('book_ride', {
        p_ride_id:      params.rideId,
        p_passenger_id: user.id,
        p_seats:        seats,
      });
      if (rpcErr) {
        setError(
          rpcErr.message.includes('not_enough_seats')
            ? 'Sorry, there aren’t enough seats left on this ride.'
            : rpcErr.message,
        );
        return;
      }

      router.replace(
        `/booking-success?rideId=${params.rideId}&seats=${seats}&total=${total}&currency=${currency}`,
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to request booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent} testID="booking-request-screen">
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back" testID="back-button" accessibilityRole="button">
        <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
      </TouchableOpacity>
      <Text style={styles.title}>Confirm booking</Text>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Seats</Text>
          <Text style={styles.summaryValue} testID="confirm-seats">{seats}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Price per seat</Text>
          <Text style={styles.summaryValue}>{formatCurrency(pricePerSeat, currency)}</Text>
        </View>
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue} testID="confirm-total">{formatCurrency(total, currency)}</Text>
        </View>
      </View>

      {error && <Text style={styles.errorText} testID="booking-error">{error}</Text>}

      <Button
        title={isSubmitting ? 'Requesting…' : 'Request to join'}
        onPress={handleConfirm}
        disabled={isSubmitting}
        testID="confirm-button"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingHorizontal: Spacing.screenPadding, paddingTop: Spacing.xxxl + Spacing.xl, paddingBottom: Spacing.xxxxxl, gap: Spacing.lg },
  backBtn: { alignSelf: 'flex-start' },
  title: { ...Typography.headingLarge, color: Colors.textPrimary },
  summaryCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.large, borderWidth: 1, borderColor: Colors.border, ...Shadows.card, padding: Spacing.cardPadding, gap: Spacing.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { ...Typography.bodyMedium, color: Colors.textSecondary },
  summaryValue: { ...Typography.bodyMedium, color: Colors.textPrimary },
  totalRow: { paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border, marginTop: Spacing.sm },
  totalLabel: { ...Typography.headingSmall, color: Colors.textPrimary },
  totalValue: { ...Typography.headingSmall, color: Colors.primary },
  errorText: { ...Typography.bodySmall, color: Colors.sos, textAlign: 'center' },
});
