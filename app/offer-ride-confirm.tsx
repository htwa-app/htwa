/**
 * app/offer-ride-confirm.tsx
 *
 * Stage 32 — Offer a Ride Confirmation screen.
 *
 * Shows a summary of the ride offer before posting:
 *   - Route, date/time, seats, price, women-only badge
 *   - Cost breakdown
 *   - Legal note
 *   - "Post ride" button → inserts to rides table → routes to /ride-posted
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { formatCurrency } from '../utils/currency';
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
} from '../constants/theme';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { checkDriverOverlap } from '../services/journeyConflicts';
import { computeWindowEnd } from '../utils/journeyWindow';

export default function OfferRideConfirmScreen(): React.ReactElement {
  const router = useRouter();
  const { user } = useAuth();
  const params  = useLocalSearchParams<{
    from: string; to: string; date: string; time: string;
    seats: string; pricePerSeat: string; currency: string;
    distanceKm: string; womenOnly: string; luggageNote: string;
    durationSeconds: string;
  }>();

  const [isPosting, setIsPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  const seats        = parseInt(params.seats ?? '1', 10);
  const pricePerSeat = parseFloat(params.pricePerSeat ?? '0');
  const currency     = (params.currency ?? 'EUR') as 'EUR' | 'GBP';
  const distanceKm   = parseFloat(params.distanceKm ?? '0');
  const womenOnly    = params.womenOnly === 'true';
  const totalCharge  = pricePerSeat * seats;
  const parsedDuration = parseInt(params.durationSeconds ?? '', 10);
  const durationSeconds = Number.isFinite(parsedDuration) && parsedDuration > 0 ? parsedDuration : null;

  const handlePost = async () => {
    if (!user) return;
    setPostError(null);
    setIsPosting(true);
    try {
      const departureStr = `${params.date}T${params.time}:00`;
      const departureISO = new Date(departureStr).toISOString();
      // window_end = departure + driving duration + 30-min buffer (Change 2).
      const windowEnd = computeWindowEnd(departureISO, durationSeconds);

      // Client-side overlap check for immediate feedback (the DB trigger is the
      // authoritative guard).
      const overlap = await checkDriverOverlap(user.id, departureISO, durationSeconds);
      if (!overlap.ok) { setPostError(overlap.message ?? 'This journey overlaps another of yours.'); return; }

      const { error } = await supabase.from('rides').insert({
        driver_id:          user.id,
        from_location:      params.from ?? '',
        to_location:        params.to ?? '',
        departure_datetime: departureStr,
        seats_total:        seats,
        seats_available:    seats,
        cost_per_seat:      pricePerSeat,
        currency,
        distance_km:        distanceKm || null,
        women_only:         womenOnly,
        luggage_note:       params.luggageNote?.trim() || null,
        estimated_duration_seconds: durationSeconds,
        window_end:         windowEnd,
        status:             'active',
      });
      if (error) {
        // The DB trigger raises 'JOURNEY_OVERLAP: …' if a concurrent overlap slipped past.
        setPostError(error.message?.includes('JOURNEY_OVERLAP')
          ? 'This journey overlaps another of your journeys. Choose a different time.'
          : error.message);
        return;
      }
      router.replace('/ride-posted');
    } catch (e: unknown) {
      setPostError(e instanceof Error ? e.message : 'Failed to post journey. Please try again.');
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      testID="offer-confirm-screen"
    >
      {/* Back */}
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.backButton}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        testID="back-button"
      >
        <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
      </TouchableOpacity>

      <Text style={styles.screenTitle}>Review your offer</Text>

      {/* Route card */}
      <View style={styles.summaryCard}>
        <View style={styles.routeRow}>
          <Ionicons name="location" size={16} color={Colors.primary} />
          <Text style={styles.routeText} testID="confirm-from">{params.from}</Text>
        </View>
        <View style={styles.routeDivider} />
        <View style={styles.routeRow}>
          <Ionicons name="location" size={16} color={Colors.amber} />
          <Text style={styles.routeText} testID="confirm-to">{params.to}</Text>
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.metaText} testID="confirm-datetime">{params.date} at {params.time}</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="people-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.metaText} testID="confirm-seats">{seats} seat{seats !== 1 ? 's' : ''} available</Text>
        </View>

        {womenOnly && (
          <Badge variant="womenOnly" style={styles.badge} testID="women-only-badge" />
        )}
      </View>

      {/* Cost breakdown */}
      <View style={styles.breakdownCard}>
        <Text style={styles.breakdownTitle}>Cost breakdown</Text>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Price per seat</Text>
          <Text style={styles.breakdownValue} testID="confirm-price-per-seat">
            {formatCurrency(pricePerSeat, currency)}
          </Text>
        </View>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>× {seats} passenger{seats !== 1 ? 's' : ''}</Text>
          <Text style={styles.breakdownValue} testID="confirm-total-charge">
            {formatCurrency(totalCharge, currency)}
          </Text>
        </View>
        {distanceKm > 0 && (
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Distance</Text>
            <Text style={styles.breakdownValue}>{distanceKm.toFixed(1)} km</Text>
          </View>
        )}
      </View>

      {/* Legal note */}
      <View style={styles.legalBox}>
        <Ionicons name="shield-checkmark-outline" size={16} color={Colors.primary} />
        <Text style={styles.legalText} testID="legal-note">
          You may only charge up to the cost of the journey. htwa enforces this automatically.
        </Text>
      </View>

      {postError ? (
        <Text style={styles.errorText} testID="post-error">{postError}</Text>
      ) : null}

      <Button
        title={isPosting ? 'Posting…' : 'Post ride'}
        onPress={handlePost}
        disabled={isPosting}
        style={styles.ctaButton}
        testID="post-button"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.xxxl + Spacing.xl,
    paddingBottom: Spacing.xxxxxl,
    gap: Spacing.lg,
  },
  backButton: { alignSelf: 'flex-start', marginBottom: Spacing.sm },
  screenTitle: { ...Typography.headingLarge, color: Colors.textPrimary, marginBottom: Spacing.sm },
  summaryCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.large,
    borderWidth: 1, borderColor: Colors.border, ...Shadows.card, padding: Spacing.cardPadding,
  },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
  routeText: { ...Typography.bodyMedium, color: Colors.textPrimary, flex: 1 },
  routeDivider: { height: 1, backgroundColor: Colors.border, marginLeft: 20 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingTop: Spacing.md },
  metaText: { ...Typography.bodySmall, color: Colors.textSecondary },
  badge: { marginTop: Spacing.md },
  breakdownCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.large,
    borderWidth: 1, borderColor: Colors.border, ...Shadows.card, padding: Spacing.cardPadding,
    gap: Spacing.sm,
  },
  breakdownTitle: { ...Typography.headingSmall, color: Colors.textPrimary, marginBottom: Spacing.xs },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between' },
  breakdownLabel: { ...Typography.bodyMedium, color: Colors.textSecondary },
  breakdownValue: { ...Typography.bodyMedium, color: Colors.textPrimary },
  legalBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.medium,
    padding: Spacing.cardPadding,
  },
  legalText: { ...Typography.bodySmall, color: Colors.textSecondary, flex: 1 },
  errorText: { ...Typography.bodySmall, color: Colors.sos, textAlign: 'center' },
  ctaButton: {},
});
