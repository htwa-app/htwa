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
      // Check for duplicate booking
      const { data: existing } = await supabase
        .from('bookings')
        .select('id, status')
        .eq('ride_id', params.rideId)
        .eq('passenger_id', user.id)
        .single();

      if (existing) {
        if (existing.status !== 'cancelled') {
          setError('You have already requested to join this ride.');
          return;
        }
      }

      // Insert booking
      const { error: bookErr } = await supabase.from('bookings').insert({
        ride_id:      params.rideId,
        passenger_id: user.id,
        seats_booked: seats,
        status:       'pending',
      });
      if (bookErr) { setError(bookErr.message); return; }

      // Decrement seats_available using RPC-style update
      const { error: updateErr } = await supabase.rpc('decrement_seats', {
        p_ride_id: params.rideId,
        p_seats:   seats,
      });
      // RPC may not exist yet — fall back to a direct update
      if (updateErr) {
        const { data: rideData } = await supabase
          .from('rides').select('seats_available').eq('id', params.rideId).single();
        if (rideData) {
          const newAvail = Math.max(0, rideData.seats_available - seats);
          await supabase.from('rides').update({
            seats_available: newAvail,
            status: newAvail === 0 ? 'full' : 'active',
          }).eq('id', params.rideId);
        }
      }

      router.replace(`/booking-success?rideId=${params.rideId}&seats=${seats}&total=${total}&currency=${currency}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to request booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent} testID="booking-request-screen">
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="back-button" accessibilityRole="button">
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
