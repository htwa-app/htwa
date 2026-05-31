/**
 * app/(tabs)/live-trip.tsx
 *
 * Stage 48 — Live Trip screen (tab 3). Per DESIGN-SPEC §9.4 and SCREENS.md #18.
 *
 * Shows:
 *   - Map with route polyline and live driver dot (when trip active)
 *   - "LIVE" badge top-right
 *   - Bottom sheet: driver info, sharing panel (lavender), Silent SOS
 *   - Idle message "You don't have an active journey right now" when no trip in progress
 *
 * Stubs react-native-maps until it's installed in Phase 8.
 * react-native-maps is not yet in package.json so we guard with a try/catch
 * and render a placeholder map view instead.
 *
 * Spec-local constants:
 *   LIVE_BADGE_BG     — teal pill (Colors.primary with opacity)
 *   SHARING_BG        — lavender background for sharing panel
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/Button';
import {
  Colors, Typography, Spacing, BorderRadius, Shadows, FontFamily,
} from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

// ─── Spec-local constants ─────────────────────────────────────────────────────

const LIVE_BADGE_BG  = Colors.primary;
const SHARING_BG     = Colors.lavenderLight;
/** Tracking URL base — real hosted page TBD */
const TRACKING_BASE  = 'https://htwa-app.com/track';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActiveTrip {
  id:            string;
  from_location: string;
  to_location:   string;
  role:          'driver' | 'passenger';
  driverName:    string;
  trackingUrl:   string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LiveTripScreen(): React.ReactElement {
  const { user } = useAuth();
  const [activeTrip, setActiveTrip] = useState<ActiveTrip | null>(null);
  const [sosPressed,  setSosPressed]  = useState(false);

  const fetchActiveTrip = useCallback(async () => {
    if (!user) return;

    // Check if user is a driver with an active/in-progress ride
    const { data: driverRide, error: driverErr } = await supabase
      .from('rides')
      .select('id, from_location, to_location')
      .eq('driver_id', user.id)
      .eq('status', 'active')
      .order('departure_datetime', { ascending: true })
      .limit(1)
      .single();
    if (driverErr && driverErr.code !== 'PGRST116') {
      console.error('[LiveTrip] driver ride fetch error:', driverErr.message);
    }

    if (driverRide) {
      setActiveTrip({
        id:            driverRide.id,
        from_location: driverRide.from_location,
        to_location:   driverRide.to_location,
        role:          'driver',
        driverName:    'You (driver)',
        trackingUrl:   `${TRACKING_BASE}/${driverRide.id}`,
      });
      return;
    }

    // Check if user is a passenger with a confirmed booking
    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select('id, ride_id')
      .eq('passenger_id', user.id)
      .eq('status', 'confirmed')
      .limit(1)
      .maybeSingle();
    if (bookingErr && bookingErr.code !== 'PGRST116') {
      console.error('[LiveTrip] booking fetch error:', bookingErr.message);
    }

    if (booking) {
      // Fetch the ride and driver name explicitly — embedded FK relations aren't
      // expressed in the typed schema.
      const { data: ride } = await supabase
        .from('rides')
        .select('id, from_location, to_location, driver_id')
        .eq('id', booking.ride_id)
        .maybeSingle();
      let driverName = 'Driver';
      if (ride?.driver_id) {
        const { data: driver } = await supabase
          .from('users').select('full_name').eq('id', ride.driver_id).maybeSingle();
        driverName = driver?.full_name ?? 'Driver';
      }
      const rideId = ride?.id ?? booking.id;
      setActiveTrip({
        id:            rideId,
        from_location: ride?.from_location ?? '',
        to_location:   ride?.to_location ?? '',
        role:          'passenger',
        driverName,
        trackingUrl:   `${TRACKING_BASE}/${rideId}`,
      });
      return;
    }

    setActiveTrip(null);
  }, [user]);

  useEffect(() => { void fetchActiveTrip(); }, [fetchActiveTrip]);

  const handleSOS = () => {
    // Silent SOS — in Phase 8 this sends to nominated contact
    // For now flag it locally; no UI changes visible to driver
    setSosPressed(true);
    // TODO (Stage 51): send silent alert to nominated contact with live location
  };

  const handleShareLink = () => {
    if (!activeTrip) return;
    void Linking.openURL(activeTrip.trackingUrl);
  };

  // ── Idle state ────────────────────────────────────────────────────────────

  if (!activeTrip) {
    return (
      <View style={styles.screen} testID="live-trip-screen">
        <View style={styles.idleContainer} testID="idle-state">
          <Ionicons name="car-outline" size={56} color={Colors.textTertiary} />
          <Text style={styles.idleTitle}>No active journey</Text>
          <Text style={styles.idleSubtitle}>
            You don't have an active journey right now.
            {'\n'}Your trip details will appear here when you're on the road.
          </Text>
        </View>
      </View>
    );
  }

  // ── Active trip ───────────────────────────────────────────────────────────

  return (
    <View style={styles.screen} testID="live-trip-screen">

      {/* Map placeholder */}
      <View style={styles.mapPlaceholder} testID="map-placeholder">
        <Ionicons name="map-outline" size={48} color={Colors.textTertiary} />
        <Text style={styles.mapPlaceholderText}>Live map</Text>

        {/* LIVE badge */}
        <View style={styles.liveBadge} testID="live-badge">
          <View style={styles.liveDot} />
          <Text style={styles.liveBadgeText}>LIVE</Text>
        </View>
      </View>

      {/* Bottom sheet */}
      <ScrollView
        style={styles.bottomSheet}
        contentContainerStyle={styles.bottomSheetContent}
        testID="trip-bottom-sheet"
      >
        {/* Route summary */}
        <View style={styles.routeCard}>
          <Text style={styles.routeTitle} testID="trip-from">{activeTrip.from_location}</Text>
          <Ionicons name="arrow-forward" size={16} color={Colors.textTertiary} />
          <Text style={styles.routeTitle} testID="trip-to">{activeTrip.to_location}</Text>
        </View>

        {/* Driver info */}
        <View style={styles.infoRow}>
          <Ionicons name="person-circle-outline" size={20} color={Colors.primary} />
          <Text style={styles.driverLabel} testID="trip-driver">{activeTrip.driverName}</Text>
        </View>

        {/* Sharing panel */}
        <View style={[styles.sharingPanel]} testID="sharing-panel">
          <Text style={styles.sharingTitle}>Sharing my journey live 🔒</Text>
          <Text style={styles.sharingSubtitle}>
            Your nominated contact receives live updates.
          </Text>
          <TouchableOpacity
            style={styles.trackingLinkRow}
            onPress={handleShareLink}
            accessibilityRole="button"
            accessibilityLabel="Open tracking link"
            testID="tracking-link"
          >
            <Ionicons name="link-outline" size={16} color={Colors.primary} />
            <Text style={styles.trackingUrl} numberOfLines={1}>{activeTrip.trackingUrl}</Text>
          </TouchableOpacity>
        </View>

        {/* Action row */}
        <View style={styles.actionRow}>
          <Button
            title="Message driver"
            variant="secondary"
            onPress={() => {}}
            style={styles.messageBtn}
            testID="message-driver-button"
          />
          <TouchableOpacity
            style={[styles.sosButton, sosPressed && styles.sosButtonPressed]}
            onPress={handleSOS}
            accessibilityRole="button"
            accessibilityLabel="Silent SOS"
            testID="sos-button"
          >
            <Text style={styles.sosText}>Silent SOS</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.checkInNote}>
          Your contact will be notified when your journey completes.
        </Text>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },

  idleContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.screenPadding, gap: Spacing.md,
  },
  idleTitle: { ...Typography.headingLarge, color: Colors.textPrimary, textAlign: 'center' },
  idleSubtitle: { ...Typography.bodyMedium, color: Colors.textSecondary, textAlign: 'center' },

  mapPlaceholder: {
    flex: 1, backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  mapPlaceholderText: { ...Typography.bodySmall, color: Colors.textTertiary, marginTop: Spacing.sm },

  liveBadge: {
    position: 'absolute', top: Spacing.lg, right: Spacing.lg,
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: LIVE_BADGE_BG, borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.surface },
  liveBadgeText: { fontSize: 12, fontFamily: FontFamily.semiBold, color: Colors.surface },

  bottomSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius:  BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: 380,
  },
  bottomSheetContent: {
    padding: Spacing.xxl, gap: Spacing.md,
  },

  routeCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
  },
  routeTitle: { ...Typography.headingSmall, color: Colors.textPrimary },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  driverLabel: { ...Typography.bodyMedium, color: Colors.textPrimary },

  sharingPanel: {
    backgroundColor: SHARING_BG, borderRadius: BorderRadius.large,
    padding: Spacing.cardPadding, gap: Spacing.sm,
  },
  sharingTitle: { ...Typography.headingSmall, color: Colors.textPrimary },
  sharingSubtitle: { ...Typography.bodySmall, color: Colors.textSecondary },
  trackingLinkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  trackingUrl: { ...Typography.bodySmall, color: Colors.primary, flex: 1 },

  actionRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  messageBtn: { flex: 1 },
  sosButton: {
    backgroundColor: Colors.sos, borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  sosButtonPressed: { opacity: 0.7 },
  sosText: { fontSize: 13, fontFamily: FontFamily.semiBold, color: Colors.surface },

  checkInNote: { ...Typography.bodySmall, color: Colors.textTertiary, textAlign: 'center' },
});
