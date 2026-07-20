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

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { WaiverAcceptance } from '../components/WaiverAcceptance';
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
import { recordWaiverAcceptance } from '../services/waivers';
import { getDefaultContact, setJourneyContact } from '../services/tracking';
import { getDriverVerification } from '../services/driverVerification';

export default function OfferRideConfirmScreen(): React.ReactElement {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const params  = useLocalSearchParams<{
    from: string; to: string; date: string; time: string;
    seats: string; pricePerSeat: string; currency: string;
    distanceKm: string; womenOnly: string; luggageNote: string;
    durationSeconds: string;
    fromLat: string; fromLng: string; toLat: string; toLng: string;
  }>();

  const [isPosting, setIsPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [waiverAccepted, setWaiverAccepted] = useState(false);
  // Round-2 fix #2: posting requires an APPROVED driver verification.
  // null = still checking; the DB trigger is the authoritative wall.
  const [vehicleOk, setVehicleOk] = useState<boolean | null>(null);
  const [vehicleCheckError, setVehicleCheckError] = useState(false);
  // Round-2 audit: every journey REQUIRES a nominated contact (the waiver says
  // so) — collected here pre-post and written right after the insert, instead
  // of the old best-effort seeding that silently skipped drivers without a
  // saved default.
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const contactComplete = contactName.trim().length > 0 && contactPhone.trim().length > 0;

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void getDefaultContact(user.id).then((def) => {
      if (cancelled || !def) return;
      setContactName((prev) => prev || def.name);
      setContactPhone((prev) => prev || def.phone);
    });
    return () => { cancelled = true; };
  }, [user]);

  const checkVehicle = useCallback(async () => {
    if (!user) return;
    setVehicleCheckError(false);
    try {
      // A failed check must block posting WITH a retry — not silently pass or
      // wrongly tell an approved driver to redo verification.
      const res = await getDriverVerification(user.id);
      if (!res.ok) { setVehicleCheckError(true); return; }
      setVehicleOk(res.verification?.status === 'approved');
    } catch {
      setVehicleCheckError(true);
    }
  }, [user]);

  useEffect(() => { void checkVehicle(); }, [checkVehicle]);

  const seats        = parseInt(params.seats ?? '1', 10);
  const pricePerSeat = parseFloat(params.pricePerSeat ?? '0');
  const currency     = (params.currency ?? 'EUR') as 'EUR' | 'GBP';
  const distanceKm   = parseFloat(params.distanceKm ?? '0');
  const womenOnly    = params.womenOnly === 'true';
  const totalCharge  = pricePerSeat * seats;
  const parsedDuration = parseInt(params.durationSeconds ?? '', 10);
  const durationSeconds = Number.isFinite(parsedDuration) && parsedDuration > 0 ? parsedDuration : null;

  // Only present when the driver picked a real Places suggestion (not typed
  // free-text) for that field — otherwise the ride's *_coords columns stay
  // null, same as before this was wired up.
  const parseCoords = (lat: string | undefined, lng: string | undefined): { lat: number; lng: number } | null => {
    const parsedLat = parseFloat(lat ?? '');
    const parsedLng = parseFloat(lng ?? '');
    return Number.isFinite(parsedLat) && Number.isFinite(parsedLng) ? { lat: parsedLat, lng: parsedLng } : null;
  };
  const fromCoords = parseCoords(params.fromLat, params.fromLng);
  const toCoords   = parseCoords(params.toLat, params.toLng);

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

      const { data: posted, error } = await supabase.from('rides').insert({
        driver_id:          user.id,
        from_location:      params.from ?? '',
        to_location:        params.to ?? '',
        from_coords:        fromCoords,
        to_coords:          toCoords,
        // Store the canonical UTC ISO so the persisted TIMESTAMPTZ matches the
        // value used by computeWindowEnd / checkDriverOverlap (departureStr is
        // timezone-less and would drift from the overlap-check logic).
        departure_datetime: departureISO,
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
      }).select('id').single();
      if (error || !posted) {
        // DB triggers: JOURNEY_OVERLAP (concurrent overlap) and
        // driver_not_approved (verification gate — the authoritative wall).
        setPostError(error?.message?.includes('JOURNEY_OVERLAP')
          ? 'This journey overlaps another of your journeys. Choose a different time.'
          : error?.message?.includes('driver_not_approved')
            ? 'Your driver verification isn\'t approved yet — you can post once it is.'
            : error?.message ?? 'Failed to post journey. Please try again.');
        return;
      }

      // The journey is live from here — acknowledgment + contact seeding are
      // recorded against it; failures are logged, not shown as a post failure.
      const waiverRes = await recordWaiverAcceptance({ userId: user.id, role: 'driver', rideId: posted.id });
      if (!waiverRes.ok) console.error('[OfferConfirm] driver waiver record failed:', waiverRes.message);

      // The journey's nominated contact — REQUIRED (validated pre-post) and
      // written against the new ride; changeable on Live Trip before departure.
      const contactRes = await setJourneyContact(posted.id, user.id, {
        name: contactName, phone: contactPhone,
      });
      if (!contactRes.ok) console.error('[OfferConfirm] journey contact write failed:', contactRes.message);

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
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + Spacing.lg }]}
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

      {/* Vehicle completeness gate (2A-a) */}
      {vehicleCheckError && (
        <View style={styles.vehicleGate} testID="vehicle-check-error">
          <Text style={styles.vehicleGateText}>Couldn't check your vehicle details.</Text>
          <TouchableOpacity onPress={checkVehicle} accessibilityRole="button" testID="vehicle-check-retry">
            <Text style={styles.vehicleGateLink}>Try again</Text>
          </TouchableOpacity>
        </View>
      )}
      {vehicleOk === false && !vehicleCheckError && (
        <View style={styles.vehicleGate} testID="vehicle-incomplete">
          <Text style={styles.vehicleGateText}>
            You need an approved driver verification (licence, live selfie, car
            photo and details) before you can post journeys.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/driver-verification')}
            accessibilityRole="button"
            testID="vehicle-complete-link"
          >
            <Text style={styles.vehicleGateLink}>Go to driver verification</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Nominated contact for this journey — required (2A-c) */}
      <View style={styles.contactCard} testID="offer-contact-card">
        <Text style={styles.contactTitle}>Nominated contact for this journey</Text>
        <Text style={styles.contactHint}>
          They'll receive live tracking and safety alerts while you're on the road.
        </Text>
        <TextInput
          style={styles.contactInput}
          placeholder="Contact name"
          placeholderTextColor={Colors.textTertiary}
          value={contactName}
          onChangeText={setContactName}
          testID="offer-contact-name"
        />
        <TextInput
          style={styles.contactInput}
          placeholder="Phone (e.g. +353 87 123 4567)"
          placeholderTextColor={Colors.textTertiary}
          value={contactPhone}
          onChangeText={setContactPhone}
          keyboardType="phone-pad"
          testID="offer-contact-phone"
        />
      </View>

      {/* Driver acknowledgment (2A-d) */}
      <WaiverAcceptance role="driver" accepted={waiverAccepted} onChange={setWaiverAccepted} />

      {postError ? (
        <Text style={styles.errorText} testID="post-error">{postError}</Text>
      ) : null}

      <Button
        title={isPosting ? 'Posting…' : 'Post journey'}
        onPress={handlePost}
        disabled={isPosting || !waiverAccepted || vehicleOk !== true || !contactComplete}
        style={styles.ctaButton}
        testID="post-button"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  scrollContent: {
    // paddingTop is set inline (insets.top + Spacing.lg) so the content clears
    // the status bar/Dynamic Island on every device instead of a fixed value.
    paddingHorizontal: Spacing.screenPadding,
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
  vehicleGate: {
    backgroundColor: Colors.amberLight, borderRadius: BorderRadius.medium,
    padding: Spacing.cardPadding, gap: Spacing.sm,
  },
  vehicleGateText: { ...Typography.bodySmall, color: Colors.textPrimary },
  vehicleGateLink: { ...Typography.bodyMedium, color: Colors.primary },
  contactCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.large,
    borderWidth: 1, borderColor: Colors.border, ...Shadows.card,
    padding: Spacing.cardPadding, gap: Spacing.sm,
  },
  contactTitle: { ...Typography.headingSmall, color: Colors.textPrimary },
  contactHint: { ...Typography.bodySmall, color: Colors.textSecondary },
  contactInput: {
    backgroundColor: Colors.background, borderRadius: BorderRadius.medium,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    ...Typography.bodyMedium, color: Colors.textPrimary,
  },
  ctaButton: {},
});
