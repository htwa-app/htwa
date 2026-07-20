/**
 * app/ride/[id].tsx
 *
 * Stage 35 — Ride Detail screen.
 * Shows full ride info and allows booking request.
 *
 * Booked state (2A-b/e): once the viewer has a live booking on this journey,
 * the booking card is replaced by their booking status, the "Verify your
 * driver" disclosure panel, a chat link, and cancellation — including the
 * "driver/vehicle did not match verified details" reason, which refunds in
 * full regardless of the 24h window and flags the driver for review.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { PriceBreakdown } from '../../components/PriceBreakdown';
import { DriverVerifyPanel } from '../../components/DriverVerifyPanel';
import { JourneyMap } from '../../components/JourneyMap';
import { passengerPricing, type PricingRates } from '../../utils/pricingEngine';
import { fetchPricingRates } from '../../services/pricingRates';
import { cancelBookingAsPassenger } from '../../services/bookings';
import { formatCurrency } from '../../utils/currency';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RideDetail {
  id: string;
  from_location: string; to_location: string;
  from_coords: { lat: number; lng: number } | null;
  to_coords: { lat: number; lng: number } | null;
  departure_datetime: string;
  seats_available: number; seats_total: number;
  cost_per_seat: number; currency: 'EUR' | 'GBP';
  distance_km: number | null;
  women_only: boolean;
  luggage_note: string | null;
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
  const [rates,     setRates]     = useState<PricingRates | null>(null);
  const [seatsWant, setSeatsWant] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [myBooking, setMyBooking] = useState<{
    id: string; status: string; seats_booked: number; payment_intent_id: string | null;
  } | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);

  const fetchRide = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      // Rates come from the DB (sole source of truth). A failed fetch is a HARD
      // failure — fail loud, never price from a hardcoded fallback.
      let loadedRates: PricingRates;
      try {
        loadedRates = await fetchPricingRates();
      } catch {
        setError('Pricing unavailable, please try again.');
        return;
      }
      setRates(loadedRates);

      const { data, error: dbErr } = await supabase
        .from('rides')
        .select('*')
        .eq('id', id)
        .single();

      if (dbErr || !data) { setError('Ride not found.'); return; }

      // Embedded FK relations aren't expressed in the typed schema, so fetch the
      // driver's name, profile and verification with explicit queries. A failed
      // query here must NOT silently render as "unverified"/"no vehicle" — that
      // would misrepresent a safety-relevant badge, so throw and let the outer
      // catch surface a retryable error instead of a wrong default.
      const { data: driverData, error: driverErr } = await supabase
        .from('users').select('full_name').eq('id', data.driver_id).maybeSingle();
      if (driverErr) throw driverErr;

      const { data: profileData, error: profileErr } = await supabase
        .from('profiles').select('university, vehicle_details')
        .eq('user_id', data.driver_id).maybeSingle();
      if (profileErr) throw profileErr;
      const vehicleRaw = (profileData?.vehicle_details as Record<string, unknown> | null) ?? null;

      const { data: vData, error: vErr } = await supabase
        .from('verification').select('status')
        .eq('user_id', data.driver_id).maybeSingle();
      if (vErr) throw vErr;
      const isVerified = vData?.status === 'approved';

      // The viewer's own booking on this journey (drives the booked-state UI).
      if (user) {
        const { data: bookingData, error: bookingErr } = await supabase
          .from('bookings')
          .select('id, status, seats_booked, payment_intent_id')
          .eq('ride_id', data.id)
          .eq('passenger_id', user.id)
          .in('status', ['pending', 'confirmed'])
          .maybeSingle();
        if (bookingErr) throw bookingErr;
        setMyBooking(bookingData ?? null);
      }

      setRide({
        id: data.id,
        from_location: data.from_location,
        to_location: data.to_location,
        from_coords: data.from_coords ?? null,
        to_coords: data.to_coords ?? null,
        departure_datetime: data.departure_datetime,
        seats_available: data.seats_available,
        seats_total: data.seats_total,
        cost_per_seat: data.cost_per_seat,
        currency: data.currency,
        distance_km: data.distance_km,
        women_only: data.women_only,
        luggage_note: data.luggage_note ?? null,
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
  }, [id, user]);

  useEffect(() => { void fetchRide(); }, [fetchRide]);

  if (isLoading) return <View style={styles.center} testID="ride-detail-loading"><ActivityIndicator size="large" color={Colors.primary} /></View>;
  if (error || !ride || !rates) return (
    <View style={styles.center} testID="ride-detail-error">
      <Text style={styles.errorText}>{error ?? 'Not found'}</Text>
      <TouchableOpacity onPress={fetchRide} style={styles.retryBtn} accessibilityRole="button">
        <Text style={styles.retryText}>Try again</Text>
      </TouchableOpacity>
    </View>
  );

  const initials = ride.driver.full_name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
  const depTime  = new Date(ride.departure_datetime).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' });
  const depDate  = new Date(ride.departure_datetime).toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long' });
  // cost_per_seat is the driver's cost-share (base fare). The passenger pays
  // passengerSeatPrice (base fare + service charge + booking fee) per seat.
  const { passengerSeatPrice } = passengerPricing(rates, ride.cost_per_seat);
  const totalCost = passengerSeatPrice * seatsWant;
  const isOwnRide = user?.id === ride.driver_id;

  const handleBook = () => {
    router.push(`/booking-request?rideId=${ride.id}&seats=${seatsWant}&pricePerSeat=${passengerSeatPrice}&currency=${ride.currency}`);
  };

  const runCancellation = async (reason: 'standard' | 'driver_mismatch') => {
    if (!user || !myBooking) return;
    setIsCancelling(true);
    setCancelMessage(null);
    try {
      const res = await cancelBookingAsPassenger(myBooking.id, user.id, ride.departure_datetime, reason);
      setCancelMessage(res.message);
      if (res.success) setMyBooking(null);
    } catch {
      setCancelMessage('Cancellation failed. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCancelBooking = () => {
    Alert.alert(
      'Cancel booking',
      'Why are you cancelling?',
      [
        { text: 'Keep my booking', style: 'cancel' },
        {
          text: "Driver/vehicle didn't match verified details",
          style: 'destructive',
          onPress: () => void runCancellation('driver_mismatch'),
        },
        {
          text: 'Other reason',
          onPress: () => void runCancellation('standard'),
        },
      ],
    );
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
        {(ride.from_coords || ride.to_coords) && (
          <JourneyMap
            from={ride.from_coords}
            to={ride.to_coords}
            stubText="Route preview"
            style={styles.routeMap}
            testID="ride-route-map"
          />
        )}
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

      {/* Luggage / bags (Block 8) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Luggage</Text>
        {ride.luggage_note ? (
          <Text style={styles.vehicleText} testID="ride-luggage-note">{ride.luggage_note}</Text>
        ) : (
          <Text style={styles.metaText} testID="ride-luggage-none">No luggage note added.</Text>
        )}
        <Text style={styles.metaText}>Need to bring something specific? Message the driver in chat after booking.</Text>
      </View>

      {/* Booked state: status, driver disclosure, chat, cancellation (2A) */}
      {myBooking && (
        <View style={styles.bookedSection} testID="booked-section">
          <View style={styles.bookedStatusRow}>
            <Ionicons
              name={myBooking.status === 'confirmed' ? 'checkmark-circle' : 'time-outline'}
              size={18}
              color={myBooking.status === 'confirmed' ? Colors.primary : Colors.amber}
            />
            <Text style={styles.bookedStatusText} testID="booking-status">
              {myBooking.status === 'confirmed'
                ? 'Your booking is confirmed'
                : 'Your request is waiting for the driver'}
            </Text>
          </View>

          <DriverVerifyPanel rideId={ride.id} testID="ride-driver-verify" />

          {/* Payment: due once the driver confirms; PaymentIntent id present
              means the payment sheet was already started (retry allowed). */}
          {myBooking.status === 'confirmed' && (
            <Button
              title={`Pay ${formatCurrency(passengerSeatPrice * myBooking.seats_booked, ride.currency)}`}
              onPress={() => router.push(
                `/payment?bookingId=${myBooking.id}&rideId=${ride.id}&amount=${passengerSeatPrice * myBooking.seats_booked}&currency=${ride.currency}`,
              )}
              testID="pay-button"
            />
          )}

          <Button
            title="Message driver"
            variant="secondary"
            onPress={() => router.push(`/chat/${myBooking.id}`)}
            testID="chat-button"
          />
          <TouchableOpacity
            onPress={handleCancelBooking}
            disabled={isCancelling}
            accessibilityRole="button"
            testID="cancel-booking-button"
          >
            <Text style={styles.cancelText}>{isCancelling ? 'Cancelling…' : 'Cancel booking'}</Text>
          </TouchableOpacity>
        </View>
      )}
      {cancelMessage && <Text style={styles.cancelMessage} testID="cancel-message">{cancelMessage}</Text>}

      {/* Seat selector + booking */}
      {!isOwnRide && !myBooking && ride.seats_available > 0 && (
        <View style={styles.bookingCard}>
          <PriceBreakdown driverSeatPrice={ride.cost_per_seat} currency={ride.currency} rates={rates} testID="ride-price-breakdown" />
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

      {ride.seats_available === 0 && !isOwnRide && !myBooking && (
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
  routeMap: { height: 160, borderRadius: BorderRadius.large, marginTop: Spacing.sm, overflow: 'hidden' },
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
  bookedSection: { gap: Spacing.md },
  bookedStatusRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.medium,
    padding: Spacing.cardPadding,
  },
  bookedStatusText: { ...Typography.bodyMedium, color: Colors.textPrimary, flex: 1 },
  cancelText: { ...Typography.bodyMedium, color: Colors.sos, textAlign: 'center' },
  cancelMessage: { ...Typography.bodySmall, color: Colors.textSecondary, textAlign: 'center' },
  retryBtn: { marginTop: Spacing.md, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md },
  retryText: { ...Typography.buttonSmall, color: Colors.primary },
  ownRideNote: { backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.medium, padding: Spacing.cardPadding, alignItems: 'center' },
  ownRideText: { ...Typography.bodyMedium, color: Colors.primary },
  fullNote: { backgroundColor: Colors.amberLight, borderRadius: BorderRadius.medium, padding: Spacing.cardPadding, alignItems: 'center' },
  fullText: { ...Typography.bodyMedium, color: Colors.amber },
});
