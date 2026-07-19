/**
 * app/booking-requests/[rideId].tsx
 *
 * Driver's booking-acceptance screen (SCREENS.md #17 "Passenger Request",
 * built as a full screen rather than a modal so a driver can review every
 * request on a journey in one place). Reached from a driver's own ride card
 * on My Journeys.
 *
 * Accept -> services/bookings.ts's acceptBooking (via services/chat.ts):
 *   booking status 'pending' -> 'confirmed'. Chat is already 'open' from
 *   booking creation, so accepting is the only gate the chat lifecycle needs.
 * Decline -> services/bookings.ts declineBooking: booking status 'pending' ->
 *   'declined' and the reserved seat is restored (book_ride decremented it at
 *   REQUEST time, not at acceptance).
 *
 * Pricing is the FIXED model: driverSeatPrice (rides.cost_per_seat) is shown
 * to the driver as-is; the passenger's price (driverSeatPrice + 10% service
 * charge + flat booking fee) is shown via the shared PriceBreakdown component
 * so the driver can see exactly what the passenger will pay, with one
 * headline figure and a tappable breakdown — never an editable price.
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
import { acceptBooking } from '../../services/chat';
import { cancelRideAsDriver, declineBooking } from '../../services/bookings';
import { fetchPricingRates } from '../../services/pricingRates';
import type { PricingRates } from '../../utils/pricingEngine';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { BookingStatus } from '../../types/database';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RideContext {
  id: string;
  from_location: string;
  to_location: string;
  departure_datetime: string;
  cost_per_seat: number;
  currency: 'EUR' | 'GBP';
  seats_available: number;
  seats_total: number;
  status: string;
}

interface RequestItem {
  id: string;
  passenger_id: string;
  seats_booked: number;
  status: BookingStatus;
  passenger_name: string;
  passenger_verified: boolean;
}

const DECIDED_STATUS_LABEL: Record<Exclude<BookingStatus, 'pending'>, string> = {
  confirmed: 'Accepted',
  declined:  'Declined',
  cancelled: 'Cancelled',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function BookingRequestsScreen(): React.ReactElement {
  const router = useRouter();
  const { rideId } = useLocalSearchParams<{ rideId: string }>();
  const { user } = useAuth();

  const [ride,       setRide]       = useState<RideContext | null>(null);
  const [requests,   setRequests]   = useState<RequestItem[]>([]);
  const [rates,      setRates]      = useState<PricingRates | null>(null);
  const [isLoading,  setIsLoading]  = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  // Per-row action state — keyed by booking id so one request's spinner/error
  // never leaks onto another row.
  const [actionBusy,  setActionBusy]  = useState<string | null>(null);
  const [actionError,  setActionError] = useState<Record<string, string>>({});
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user || !rideId) { setIsLoading(false); return; }
    setIsLoading(true);
    setError(null);
    try {
      // Scope to the current user's OWN ride — a non-owner lands on a clear
      // "not found" rather than an empty request list for someone else's ride.
      const { data: rideRow, error: rideErr } = await supabase
        .from('rides')
        .select('id, from_location, to_location, departure_datetime, cost_per_seat, currency, seats_available, seats_total, status')
        .eq('id', rideId)
        .eq('driver_id', user.id)
        .maybeSingle();
      if (rideErr) throw rideErr;
      if (!rideRow) { setError('Journey not found.'); return; }
      setRide(rideRow as RideContext);

      const loadedRates = await fetchPricingRates();
      setRates(loadedRates);

      const { data: bookingRows, error: bookingsErr } = await supabase
        .from('bookings')
        .select('id, passenger_id, seats_booked, status, created_at')
        .eq('ride_id', rideId)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: true });
      if (bookingsErr) throw bookingsErr;

      const passengerIds = (bookingRows ?? []).map((b) => b.passenger_id);
      const { data: users, error: usersErr } = passengerIds.length > 0
        ? await supabase.from('users').select('id, full_name').in('id', passengerIds)
        : { data: [], error: null };
      if (usersErr) throw usersErr;

      const { data: verifs, error: verifsErr } = passengerIds.length > 0
        ? await supabase.from('verification').select('user_id, status').in('user_id', passengerIds)
        : { data: [], error: null };
      if (verifsErr) throw verifsErr;

      const nameById = new Map((users ?? []).map((u) => [u.id, u.full_name as string]));
      const verifiedSet = new Set(
        (verifs ?? [])
          .filter((v) => v.status === 'approved')
          .map((v) => v.user_id as string),
      );

      const items: RequestItem[] = (bookingRows ?? []).map((b) => ({
        id:                  b.id,
        passenger_id:        b.passenger_id,
        seats_booked:        b.seats_booked,
        status:              b.status,
        passenger_name:      nameById.get(b.passenger_id) ?? 'Passenger',
        passenger_verified:  verifiedSet.has(b.passenger_id),
      }));
      // Pending requests need action first; decided ones are shown for reference.
      items.sort((a, b) => (a.status === 'pending' ? -1 : 0) - (b.status === 'pending' ? -1 : 0));
      setRequests(items);
    } catch {
      setError('Could not load booking requests. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user, rideId]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const handleAccept = async (bookingId: string) => {
    setActionBusy(bookingId);
    setActionError((prev) => ({ ...prev, [bookingId]: '' }));
    try {
      const res = await acceptBooking(bookingId);
      if (!res.ok) {
        setActionError((prev) => ({ ...prev, [bookingId]: res.error ?? 'Could not accept. Please try again.' }));
        return;
      }
      await fetchData();
    } catch {
      setActionError((prev) => ({ ...prev, [bookingId]: 'Could not accept. Please try again.' }));
    } finally {
      setActionBusy(null);
    }
  };

  const handleDecline = async (bookingId: string) => {
    setActionBusy(bookingId);
    setActionError((prev) => ({ ...prev, [bookingId]: '' }));
    try {
      const res = await declineBooking(bookingId);
      if (!res.ok) {
        setActionError((prev) => ({ ...prev, [bookingId]: res.error ?? 'Could not decline. Please try again.' }));
        return;
      }
      await fetchData();
    } catch {
      setActionError((prev) => ({ ...prev, [bookingId]: 'Could not decline. Please try again.' }));
    } finally {
      setActionBusy(null);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={styles.centerState} testID="booking-requests-loading">
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────

  if (error || !ride || !rates) {
    return (
      <View style={styles.centerState} testID="booking-requests-error">
        <Text style={styles.emptyText}>{error ?? 'Could not load booking requests. Please try again.'}</Text>
        <TouchableOpacity onPress={fetchData} style={styles.retryBtn} accessibilityRole="button">
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const depDate = new Date(ride.departure_datetime).toLocaleDateString(
    'en-IE', { weekday: 'short', day: 'numeric', month: 'short' },
  );
  const depTime = new Date(ride.departure_datetime).toLocaleTimeString(
    'en-IE', { hour: '2-digit', minute: '2-digit' },
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent} testID="booking-requests-screen">
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          testID="back-button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Booking requests</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.rideCard} testID="ride-context">
        <Text style={styles.routeText}>{ride.from_location} → {ride.to_location}</Text>
        <Text style={styles.metaText}>{depDate} · {depTime}</Text>
        <Text style={styles.metaText}>
          {ride.seats_available} of {ride.seats_total} seats free
        </Text>
      </View>

      {cancelMessage && <Text style={styles.cancelMessage} testID="cancel-journey-message">{cancelMessage}</Text>}

      {requests.length === 0 ? (
        <Text style={styles.emptyText} testID="requests-empty">No booking requests yet.</Text>
      ) : (
        requests.map((req) => (
          <RequestCard
            key={req.id}
            request={req}
            driverSeatPrice={ride.cost_per_seat}
            currency={ride.currency}
            rates={rates}
            busy={actionBusy === req.id}
            errorMessage={actionError[req.id]}
            onAccept={() => handleAccept(req.id)}
            onDecline={() => handleDecline(req.id)}
          />
        ))
      )}

      {/* Driver cancels the whole journey: every pending/confirmed booking is
          cancelled and refunded in full (create-refund Edge Function). */}
      {ride.status !== 'cancelled' && (
        <TouchableOpacity
          onPress={() => {
            Alert.alert(
              'Cancel this journey?',
              'All passengers are notified and receive a full refund. This cannot be undone.',
              [
                { text: 'Keep journey', style: 'cancel' },
                {
                  text: 'Cancel journey',
                  style: 'destructive',
                  onPress: () => void (async () => {
                    if (!user) return;
                    setCancelBusy(true);
                    setCancelMessage(null);
                    try {
                      const res = await cancelRideAsDriver(rideId, user.id);
                      setCancelMessage(res.message);
                      if (res.success) await fetchData();
                    } catch {
                      setCancelMessage('Cancellation failed. Please try again.');
                    } finally {
                      setCancelBusy(false);
                    }
                  })(),
                },
              ],
            );
          }}
          disabled={cancelBusy}
          accessibilityRole="button"
          testID="cancel-journey-button"
        >
          <Text style={styles.cancelJourneyText}>
            {cancelBusy ? 'Cancelling…' : 'Cancel this journey'}
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

// ─── RequestCard sub-component ────────────────────────────────────────────────

function RequestCard({
  request, driverSeatPrice, currency, rates, busy, errorMessage, onAccept, onDecline,
}: {
  request: RequestItem;
  driverSeatPrice: number;
  currency: 'EUR' | 'GBP';
  rates: PricingRates;
  busy: boolean;
  errorMessage?: string;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const initials = request.passenger_name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

  return (
    <View style={styles.requestCard} testID={`request-card-${request.id}`}>
      <View style={styles.requestHeader}>
        <Avatar initials={initials} size={40} testID={`request-avatar-${request.id}`} />
        <View style={styles.requestHeaderText}>
          <Text style={styles.passengerName} testID={`request-name-${request.id}`}>{request.passenger_name}</Text>
          <Text style={styles.seatsText}>{request.seats_booked} seat{request.seats_booked !== 1 ? 's' : ''} requested</Text>
        </View>
        {request.passenger_verified && <Badge variant="verified" testID={`request-verified-${request.id}`} />}
      </View>

      <PriceBreakdown
        driverSeatPrice={driverSeatPrice}
        currency={currency}
        rates={rates}
        testID={`request-price-${request.id}`}
      />

      {request.status === 'pending' ? (
        <>
          <View style={styles.actionRow}>
            <Button
              title="Decline"
              variant="secondary"
              onPress={onDecline}
              disabled={busy}
              style={styles.actionButton}
              testID={`decline-button-${request.id}`}
            />
            <Button
              title="Accept"
              onPress={onAccept}
              disabled={busy}
              style={styles.actionButton}
              testID={`accept-button-${request.id}`}
            />
          </View>
          {busy && <ActivityIndicator size="small" color={Colors.primary} testID={`request-busy-${request.id}`} />}
          {!!errorMessage && (
            <Text style={styles.requestError} testID={`request-error-${request.id}`}>{errorMessage}</Text>
          )}
        </>
      ) : (
        <View style={[styles.decidedBadge, request.status === 'declined' && styles.decidedBadgeDeclined]} testID={`request-status-${request.id}`}>
          <Text style={[styles.decidedBadgeText, request.status === 'declined' && styles.decidedBadgeTextDeclined]}>
            {DECIDED_STATUS_LABEL[request.status as Exclude<BookingStatus, 'pending'>]}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingHorizontal: Spacing.screenPadding, paddingTop: Spacing.xxxl + Spacing.xl, paddingBottom: Spacing.xxxxxl, gap: Spacing.md },
  centerState: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', padding: Spacing.screenPadding, gap: Spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerSpacer: { width: 24 },
  screenTitle: { ...Typography.headingLarge, color: Colors.textPrimary, flex: 1, textAlign: 'center' },
  cancelMessage: { ...Typography.bodySmall, color: Colors.textSecondary, textAlign: 'center' },
  cancelJourneyText: { ...Typography.bodyMedium, color: Colors.sos, textAlign: 'center', paddingVertical: Spacing.md },
  emptyText: { ...Typography.bodyMedium, color: Colors.textTertiary, textAlign: 'center' },
  retryBtn: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md },
  retryText: { ...Typography.bodyMedium, color: Colors.primary },
  rideCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.large, borderWidth: 1,
    borderColor: Colors.border, ...Shadows.card, padding: Spacing.cardPadding, gap: Spacing.xs,
  },
  routeText: { ...Typography.headingSmall, color: Colors.textPrimary },
  metaText: { ...Typography.bodySmall, color: Colors.textSecondary },
  requestCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.large, borderWidth: 1,
    borderColor: Colors.border, ...Shadows.card, padding: Spacing.cardPadding, gap: Spacing.sm,
  },
  requestHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  requestHeaderText: { flex: 1, gap: 2 },
  passengerName: { ...Typography.bodyLarge, color: Colors.textPrimary },
  seatsText: { ...Typography.bodySmall, color: Colors.textSecondary },
  actionRow: { flexDirection: 'row', gap: Spacing.sm },
  actionButton: { flex: 1 },
  requestError: { ...Typography.bodySmall, color: Colors.sos },
  decidedBadge: { alignSelf: 'flex-start', backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
  decidedBadgeDeclined: { backgroundColor: Colors.sosLight },
  decidedBadgeText: { ...Typography.label, color: Colors.primary },
  decidedBadgeTextDeclined: { color: Colors.sos },
});
