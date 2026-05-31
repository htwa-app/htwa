/**
 * app/ride/[id].tsx
 *
 * Stage 35 — Ride Detail screen.
 * Shows full ride info and allows booking request.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { formatCurrency } from '../../utils/currency';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RideDetail {
  id: string;
  from_location: string; to_location: string;
  departure_datetime: string;
  seats_available: number; seats_total: number;
  cost_per_seat: number; currency: 'EUR' | 'GBP';
  distance_km: number | null;
  women_only: boolean;
  driver_id: string;
  driver: { full_name: string; is_verified: boolean; university: string | null };
  vehicle: { make: string; model: string; seats: number; hasAC: boolean; dashcam: boolean } | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RideDetailScreen(): React.ReactElement {
  const router = useRouter();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [ride,      setRide]      = useState<RideDetail | null>(null);
  const [seatsWant, setSeatsWant] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const fetchRide = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: dbErr } = await supabase
        .from('rides')
        .select('*')
        .eq('id', id)
        .single();

      if (dbErr || !data) { setError('Ride not found.'); return; }

      // Embedded FK relations aren't expressed in the typed schema, so fetch the
      // driver's name, profile and verification with explicit queries.
      const { data: driverData } = await supabase
        .from('users').select('full_name').eq('id', data.driver_id).maybeSingle();

      const { data: profileData } = await supabase
        .from('profiles').select('university, vehicle_details')
        .eq('user_id', data.driver_id).maybeSingle();
      const vehicleRaw = (profileData?.vehicle_details as Record<string, unknown> | null) ?? null;

      const { data: vData } = await supabase
        .from('verification').select('id_verified, selfie_verified')
        .eq('user_id', data.driver_id).maybeSingle();
      const isVerified = vData?.id_verified === true && vData?.selfie_verified === true;

      setRide({
        id: data.id,
        from_location: data.from_location,
        to_location: data.to_location,
        departure_datetime: data.departure_datetime,
        seats_available: data.seats_available,
        seats_total: data.seats_total,
        cost_per_seat: data.cost_per_seat,
        currency: data.currency,
        distance_km: data.distance_km,
        women_only: data.women_only,
        driver_id: data.driver_id,
        driver: {
          full_name:   driverData?.full_name ?? 'Driver',
          is_verified: isVerified,
          university:  profileData?.university ?? null,
        },
        vehicle: vehicleRaw ? {
          make:    (vehicleRaw.make as string | undefined) ?? '',
          model:   (vehicleRaw.model as string | undefined) ?? '',
          seats:   (vehicleRaw.seats as number | undefined) ?? 0,
          hasAC:   (vehicleRaw.hasAC as boolean | undefined) ?? false,
          dashcam: (vehicleRaw.dashcam as boolean | undefined) ?? false,
        } : null,
      });
    } catch { setError('Could not load ride details.'); }
    finally  { setIsLoading(false); }
  }, [id]);

  useEffect(() => { void fetchRide(); }, [fetchRide]);

  if (isLoading) return <View style={styles.center} testID="ride-detail-loading"><ActivityIndicator size="large" color={Colors.primary} /></View>;
  if (error || !ride) return <View style={styles.center} testID="ride-detail-error"><Text style={styles.errorText}>{error ?? 'Not found'}</Text></View>;

  const initials = ride.driver.full_name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
  const depTime  = new Date(ride.departure_datetime).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' });
  const depDate  = new Date(ride.departure_datetime).toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long' });
  const totalCost = ride.cost_per_seat * seatsWant;
  const isOwnRide = user?.id === ride.driver_id;

  const handleBook = () => {
    router.push(`/booking-request?rideId=${ride.id}&seats=${seatsWant}&pricePerSeat=${ride.cost_per_seat}&currency=${ride.currency}`);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent} testID="ride-detail-screen">
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back" testID="back-button">
        <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
      </TouchableOpacity>

      {/* Driver card */}
      <View style={styles.card}>
        <View style={styles.driverRow}>
          <TouchableOpacity onPress={() => router.push(`/user-profile/${ride.driver_id}`)} testID="driver-profile-link">
            <Avatar initials={initials} size={56} color="primary" />
          </TouchableOpacity>
          <View style={styles.driverInfo}>
            <Text style={styles.driverName} testID="driver-name">{ride.driver.full_name}</Text>
            {ride.driver.university && <Text style={styles.driverUni}>{ride.driver.university}</Text>}
            <View style={styles.badgeRow}>
              {ride.driver.is_verified && <Badge variant="verified" testID="driver-verified" />}
              {ride.women_only && <Badge variant="womenOnly" testID="ride-women-only" />}
            </View>
          </View>
        </View>
      </View>

      {/* Route */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Route</Text>
        <View style={styles.routeRow}>
          <Ionicons name="location" size={14} color={Colors.primary} />
          <Text style={styles.routeText} testID="ride-from">{ride.from_location}</Text>
        </View>
        <View style={styles.routeRow}>
          <Ionicons name="location" size={14} color={Colors.amber} />
          <Text style={styles.routeText} testID="ride-to">{ride.to_location}</Text>
        </View>
        <Text style={styles.dateText} testID="ride-datetime">{depDate} · {depTime}</Text>
        {ride.distance_km && <Text style={styles.metaText}>{ride.distance_km.toFixed(1)} km</Text>}
      </View>

      {/* Vehicle */}
      {ride.vehicle && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Vehicle</Text>
          <Text style={styles.vehicleText} testID="vehicle-info">
            {ride.vehicle.make} {ride.vehicle.model}
          </Text>
          <View style={styles.vehicleChips}>
            {ride.vehicle.hasAC && <View style={styles.chip}><Text style={styles.chipText}>A/C</Text></View>}
            {ride.vehicle.dashcam && <View style={styles.chip}><Text style={styles.chipText}>Dashcam</Text></View>}
            <View style={styles.chip}><Text style={styles.chipText}>{ride.vehicle.seats} seats</Text></View>
          </View>
        </View>
      )}

      {/* Seat selector + booking */}
      {!isOwnRide && ride.seats_available > 0 && (
        <View style={styles.bookingCard}>
          <View style={styles.seatRow}>
            <Text style={styles.seatLabel}>Seats needed</Text>
            <View style={styles.stepper}>
              <TouchableOpacity onPress={() => setSeatsWant((s) => Math.max(1, s - 1))} testID="seats-dec" accessibilityRole="button" accessibilityLabel="Decrease seats">
                <Ionicons name="remove-circle-outline" size={28} color={Colors.primary} />
              </TouchableOpacity>
              <Text style={styles.seatCount} testID="seats-wanted">{seatsWant}</Text>
              <TouchableOpacity onPress={() => setSeatsWant((s) => Math.min(ride.seats_available, s + 1))} testID="seats-inc" accessibilityRole="button" accessibilityLabel="Increase seats">
                <Ionicons name="add-circle-outline" size={28} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue} testID="booking-total">{formatCurrency(totalCost, ride.currency)}</Text>
          </View>
          <Button title="Request to join" onPress={handleBook} style={styles.bookBtn} testID="book-button" />
        </View>
      )}

      {isOwnRide && (
        <View style={styles.ownRideNote} testID="own-ride-note">
          <Text style={styles.ownRideText}>This is your ride.</Text>
        </View>
      )}

      {ride.seats_available === 0 && !isOwnRide && (
        <View style={styles.fullNote} testID="ride-full-note">
          <Text style={styles.fullText}>This ride is full.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingHorizontal: Spacing.screenPadding, paddingTop: Spacing.xxxl + Spacing.xl, paddingBottom: Spacing.xxxxxl, gap: Spacing.md },
  center: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  backBtn: { alignSelf: 'flex-start' },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.large, borderWidth: 1, borderColor: Colors.border, ...Shadows.card, padding: Spacing.cardPadding, gap: Spacing.sm },
  cardTitle: { ...Typography.headingSmall, color: Colors.textPrimary },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  driverInfo: { flex: 1, gap: Spacing.xs },
  driverName: { ...Typography.headingMedium, color: Colors.textPrimary },
  driverUni: { ...Typography.bodySmall, color: Colors.textSecondary },
  badgeRow: { flexDirection: 'row', gap: Spacing.xs },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  routeText: { ...Typography.bodyMedium, color: Colors.textPrimary, flex: 1 },
  dateText: { ...Typography.bodyMedium, color: Colors.textSecondary },
  metaText: { ...Typography.bodySmall, color: Colors.textTertiary },
  vehicleText: { ...Typography.bodyMedium, color: Colors.textPrimary },
  vehicleChips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
  chipText: { ...Typography.label, color: Colors.primary },
  bookingCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.large, borderWidth: 1, borderColor: Colors.border, ...Shadows.card, padding: Spacing.cardPadding, gap: Spacing.md },
  seatRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  seatLabel: { ...Typography.bodyMedium, color: Colors.textPrimary },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  seatCount: { ...Typography.headingMedium, color: Colors.textPrimary, minWidth: 24, textAlign: 'center' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { ...Typography.bodyMedium, color: Colors.textSecondary },
  totalValue: { ...Typography.headingMedium, color: Colors.primary },
  bookBtn: {},
  errorText: { ...Typography.bodyMedium, color: Colors.textSecondary },
  ownRideNote: { backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.medium, padding: Spacing.cardPadding, alignItems: 'center' },
  ownRideText: { ...Typography.bodyMedium, color: Colors.primary },
  fullNote: { backgroundColor: Colors.amberLight, borderRadius: BorderRadius.medium, padding: Spacing.cardPadding, alignItems: 'center' },
  fullText: { ...Typography.bodyMedium, color: Colors.amber },
});
