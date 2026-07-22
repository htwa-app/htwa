/**
 * app/booking-request.tsx
 *
 * Stage 36 — Booking Request flow.
 * Creates a bookings row (status: pending) and decrements seats_available.
 * Handles duplicate booking gracefully.
 * Routes to /booking-success on completion.
 *
 * 2A-c/d: before the booking can proceed the passenger must set the journey's
 * nominated contact and accept the safety waiver. The acceptance row is
 * recorded FIRST — book_ride() itself refuses to book without it
 * ('waiver_required'), so the gate is DB-enforced, not just UI.
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/Button';
import { WaiverAcceptance } from '../components/WaiverAcceptance';
import { NominatedContactCard } from '../components/NominatedContactCard';
import { formatCurrency } from '../utils/currency';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { hasAcceptedWaiver, recordWaiverAcceptance } from '../services/waivers';
import { sendPushToUser } from '../services/notifications';
import type { JourneyContactRow } from '../types/database';

const WAIVER_ALREADY_ACCEPTED_TEXT = '✓ Safety acknowledgment already accepted for this journey.';

export default function BookingRequestScreen(): React.ReactElement {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const params  = useLocalSearchParams<{
    rideId: string; seats: string; pricePerSeat: string; currency: string;
  }>();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [waiverAccepted, setWaiverAccepted] = useState(false);
  const [alreadyAccepted, setAlreadyAccepted] = useState(false);
  const [contact, setContact] = useState<JourneyContactRow | null>(null);

  const seats        = parseInt(params.seats ?? '1', 10);
  const pricePerSeat = parseFloat(params.pricePerSeat ?? '0');
  const currency     = (params.currency ?? 'EUR') as 'EUR' | 'GBP';
  const total        = pricePerSeat * seats;

  // Idempotent re-entry: a prior acceptance for this journey still counts.
  useEffect(() => {
    if (!user || !params.rideId) return;
    void hasAcceptedWaiver(user.id, params.rideId, 'passenger').then((accepted) => {
      if (accepted) { setAlreadyAccepted(true); setWaiverAccepted(true); }
    });
  }, [user, params.rideId]);

  const handleConfirm = async () => {
    if (!user || !params.rideId) return;
    setError(null);
    if (!contact) {
      setError('Add your nominated contact for this journey before booking.');
      return;
    }
    if (!waiverAccepted) {
      setError('You must read and accept the safety acknowledgment to book.');
      return;
    }
    setIsSubmitting(true);
    try {
      // Record the waiver acceptance BEFORE booking — book_ride requires it.
      if (!alreadyAccepted) {
        const waiverRes = await recordWaiverAcceptance({
          userId: user.id, role: 'passenger', rideId: params.rideId,
        });
        if (!waiverRes.ok) { setError(waiverRes.message); return; }
        setAlreadyAccepted(true);
      }
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
          rpcErr.message.includes('not_enough_seats') ? 'Sorry, there aren’t enough seats left on this journey.'
          : rpcErr.message.includes('waiver_required') ? 'You must accept the safety acknowledgment to book.'
          : rpcErr.message.includes('women_only') ? 'This is a women-only journey.'
          : rpcErr.message.includes('already_booked') ? 'You have already requested to join this journey.'
          : rpcErr.message.includes('ride_departed') ? 'This journey has already departed.'
          : rpcErr.message.includes('ride_not_bookable') ? 'This journey can no longer be booked.'
          : rpcErr.message,
        );
        return;
      }

      router.replace(
        `/booking-success?rideId=${params.rideId}&seats=${seats}&total=${total}&currency=${currency}`,
      );

      // Push the driver (backgrounded/killed-app delivery — realtime already
      // covers them if the app is open). Secondary effect, fired after
      // navigation: the booking has already committed, so this is wrapped in
      // its own try/catch and never allowed to block or fail the booking flow.
      try {
        const { data, error: rideErr } = await supabase
          .from('rides')
          .select('driver_id')
          .eq('id', params.rideId)
          .maybeSingle();
        if (!rideErr && data) {
          void sendPushToUser(data.driver_id, 'booking_request', { rideId: params.rideId });
        }
      } catch (e) {
        console.error('[BookingRequest] driver push lookup failed:', e instanceof Error ? e.message : e);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to request booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + Spacing.lg }]} testID="booking-request-screen">
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

      {/* Per-journey nominated contact (2A-c) */}
      {user && params.rideId && (
        <NominatedContactCard
          rideId={params.rideId}
          userId={user.id}
          editable
          onContact={setContact}
          testID="booking-contact-card"
        />
      )}

      {/* Safety acknowledgment (2A-d) */}
      {alreadyAccepted ? (
        <Text style={styles.waiverDoneNote} testID="waiver-already-accepted">
          {WAIVER_ALREADY_ACCEPTED_TEXT}
        </Text>
      ) : (
        <WaiverAcceptance role="passenger" accepted={waiverAccepted} onChange={setWaiverAccepted} />
      )}

      {error && <Text style={styles.errorText} testID="booking-error">{error}</Text>}

      <Button
        title={isSubmitting ? 'Requesting…' : 'Request to join'}
        onPress={handleConfirm}
        disabled={isSubmitting || !waiverAccepted || !contact}
        testID="confirm-button"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  // paddingTop is set inline (insets.top + Spacing.lg) so content clears the status bar/Dynamic Island on every device instead of a fixed value.
  scrollContent: { paddingHorizontal: Spacing.screenPadding, paddingBottom: Spacing.xxxxxl, gap: Spacing.lg },
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
  waiverDoneNote: { ...Typography.bodySmall, color: Colors.primary, textAlign: 'center' },
});
