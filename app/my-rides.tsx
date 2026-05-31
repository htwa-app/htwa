/**
 * app/my-rides.tsx
 *
 * Stage 38 — My Rides screen.
 * Shows the user's upcoming and past rides as both driver and passenger.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '../utils/currency';
import { Colors, FontFamily, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// ─── Spec-local constants ─────────────────────────────────────────────────────
// Booking/ride status badge colours. DESIGN-SPEC §1 has no palette entry for a
// "success green" or "amber-dark" text, so the confirmed/pending shades are
// declared here as named constants rather than bare hex inline.
const STATUS_CONFIRMED_BG   = '#E8F8EE'; // pale success green
const STATUS_CONFIRMED_TEXT = '#1A7A3C'; // deep success green
const STATUS_WARN_TEXT      = '#8B5A00'; // amber-dark — pending / full

/** Status badge colours by status string. */
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active:    { bg: Colors.primaryLight, text: Colors.primary },
  confirmed: { bg: STATUS_CONFIRMED_BG, text: STATUS_CONFIRMED_TEXT },
  pending:   { bg: Colors.amberLight,   text: STATUS_WARN_TEXT },
  cancelled: { bg: Colors.border,       text: Colors.textSecondary },
  full:      { bg: Colors.amberLight,   text: STATUS_WARN_TEXT },
  completed: { bg: Colors.primaryLight, text: Colors.primary },
  declined:  { bg: Colors.sosLight,     text: Colors.sos },
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface RideItem {
  id:                 string;
  from_location:      string;
  to_location:        string;
  departure_datetime: string;
  cost_per_seat:      number;
  currency:           'EUR' | 'GBP';
  status:             string;
  role:               'driver' | 'passenger';
  bookingStatus?:     string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MyRidesScreen(): React.ReactElement {
  const router = useRouter();
  const { user } = useAuth();

  const [rides,     setRides]     = useState<RideItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const fetchRides = useCallback(async () => {
    if (!user) { setIsLoading(false); return; }
    setIsLoading(true);
    setError(null);
    try {
      // Rides as driver
      const { data: driverRides } = await supabase
        .from('rides')
        .select('id, from_location, to_location, departure_datetime, cost_per_seat, currency, status')
        .eq('driver_id', user.id)
        .order('departure_datetime', { ascending: false });

      // Bookings as passenger
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, status, ride:rides(id, from_location, to_location, departure_datetime, cost_per_seat, currency, status)')
        .eq('passenger_id', user.id)
        .order('created_at', { ascending: false });

      const driverItems: RideItem[] = (driverRides ?? []).map((r: Record<string, unknown>) => ({
        id:                 r.id as string,
        from_location:      r.from_location as string,
        to_location:        r.to_location as string,
        departure_datetime: r.departure_datetime as string,
        cost_per_seat:      r.cost_per_seat as number,
        currency:           r.currency as 'EUR' | 'GBP',
        status:             r.status as string,
        role:               'driver',
      }));

      const passengerItems: RideItem[] = (bookings ?? []).map((b: Record<string, unknown>) => {
        const rideData = b.ride as Record<string, unknown> | null;
        return {
          id:                 (rideData?.id as string | undefined) ?? (b.id as string),
          from_location:      (rideData?.from_location as string | undefined) ?? '',
          to_location:        (rideData?.to_location as string | undefined) ?? '',
          departure_datetime: (rideData?.departure_datetime as string | undefined) ?? '',
          cost_per_seat:      (rideData?.cost_per_seat as number | undefined) ?? 0,
          currency:           (rideData?.currency as 'EUR' | 'GBP' | undefined) ?? 'EUR',
          status:             (rideData?.status as string | undefined) ?? 'active',
          role:               'passenger',
          bookingStatus:      b.status as string,
        };
      });

      const allRides = [...driverItems, ...passengerItems].sort(
        (a, b) => new Date(b.departure_datetime).getTime() - new Date(a.departure_datetime).getTime(),
      );
      setRides(allRides);
    } catch { setError('Could not load your rides.'); }
    finally  { setIsLoading(false); }
  }, [user]);

  useEffect(() => { void fetchRides(); }, [fetchRides]);

  const now = new Date();
  const upcoming = rides.filter((r) => new Date(r.departure_datetime) >= now);
  const past     = rides.filter((r) => new Date(r.departure_datetime) <  now);

  if (isLoading) return <View style={styles.center} testID="my-rides-loading"><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent} testID="my-rides-screen">
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" testID="back-button" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>My rides</Text>
        <View style={{ width: 24 }} />
      </View>

      {error && <Text style={styles.errorText} testID="rides-error">{error}</Text>}

      {/* Upcoming */}
      <Text style={styles.sectionLabel}>Upcoming</Text>
      {upcoming.length === 0 ? (
        <Text style={styles.emptyText} testID="upcoming-empty">No upcoming rides</Text>
      ) : (
        upcoming.map((ride) => <RideCard key={`${ride.role}-${ride.id}`} ride={ride} onPress={() => router.push(`/ride/${ride.id}`)} />)
      )}

      {/* Past */}
      <Text style={styles.sectionLabel}>Past</Text>
      {past.length === 0 ? (
        <Text style={styles.emptyText} testID="past-empty">No past rides</Text>
      ) : (
        past.map((ride) => <RideCard key={`${ride.role}-${ride.id}`} ride={ride} onPress={() => router.push(`/ride/${ride.id}`)} />)
      )}
    </ScrollView>
  );
}

// ─── RideCard sub-component ───────────────────────────────────────────────────

function RideCard({ ride, onPress }: { ride: RideItem; onPress: () => void }) {
  const depDate = new Date(ride.departure_datetime).toLocaleDateString(
    'en-IE', { weekday: 'short', day: 'numeric', month: 'short' },
  );
  const depTime = new Date(ride.departure_datetime).toLocaleTimeString(
    'en-IE', { hour: '2-digit', minute: '2-digit' },
  );
  const displayStatus = ride.role === 'passenger' && ride.bookingStatus
    ? ride.bookingStatus
    : ride.status;
  const colors = STATUS_COLORS[displayStatus] ?? STATUS_COLORS['active'];

  return (
    <TouchableOpacity
      style={styles.rideCard}
      onPress={onPress}
      accessibilityRole="button"
      testID={`ride-item-${ride.id}`}
    >
      <View style={styles.cardTop}>
        <View style={styles.routeCol}>
          <Text style={styles.routeText} numberOfLines={1}>{ride.from_location}</Text>
          <Text style={styles.routeArrow}>→</Text>
          <Text style={styles.routeText} numberOfLines={1}>{ride.to_location}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
          <Text style={[styles.statusText, { color: colors.text }]}>{displayStatus}</Text>
        </View>
      </View>
      <View style={styles.cardMeta}>
        <Text style={styles.metaText}>{depDate} · {depTime}</Text>
        <Text style={styles.roleText}>{ride.role === 'driver' ? 'Driver' : 'Passenger'} · {formatCurrency(ride.cost_per_seat, ride.currency)}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingHorizontal: Spacing.screenPadding, paddingTop: Spacing.xxxl + Spacing.xl, paddingBottom: Spacing.xxxxxl, gap: Spacing.md },
  center: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  screenTitle: { ...Typography.headingLarge, color: Colors.textPrimary, flex: 1, textAlign: 'center' },
  sectionLabel: { ...Typography.headingSmall, color: Colors.textPrimary, marginTop: Spacing.md },
  emptyText: { ...Typography.bodyMedium, color: Colors.textTertiary },
  errorText: { ...Typography.bodySmall, color: Colors.sos },
  rideCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.large, borderWidth: 1, borderColor: Colors.border, ...Shadows.card, padding: Spacing.cardPadding, gap: Spacing.sm },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  routeCol: { flex: 1, gap: 2 },
  routeText: { ...Typography.bodyMedium, color: Colors.textPrimary },
  routeArrow: { ...Typography.bodySmall, color: Colors.textTertiary },
  statusBadge: { borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  statusText: { fontSize: 11, fontFamily: FontFamily.medium },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  metaText: { ...Typography.bodySmall, color: Colors.textTertiary },
  roleText: { ...Typography.bodySmall, color: Colors.textSecondary },
});
