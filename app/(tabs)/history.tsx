/**
 * app/(tabs)/history.tsx
 *
 * Stage 61 — Journey History screen (tab 2). Per DESIGN-SPEC §9.5.
 * Stats header + filter tabs + trip list with savings vs bus/train.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '../../utils/currency';
import { getSavingVsPublicTransport } from '../../utils/publicTransportFares';
import { calculateCO2Savings } from '../../utils/carbonCalculator';
import { Colors, Typography, Spacing, BorderRadius, Shadows, FontFamily } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

type FilterTab = 'all' | 'rider' | 'driver' | 'cancelled';

interface TripHistoryItem {
  id:            string;
  from_location: string;
  to_location:   string;
  departure_datetime: string;
  cost_per_seat: number;
  currency:      'EUR' | 'GBP';
  status:        string;
  role:          'driver' | 'passenger';
  otherPartyName: string;
  bookingId?:    string;       // passenger items — chat is booking-scoped (Change 3)
  bookingStatus?: string;
  chatStatus?:   string;       // 'open' | 'closed'
}

export default function HistoryScreen(): React.ReactElement {
  const router = useRouter();
  const { user } = useAuth();
  const [trips,     setTrips]     = useState<TripHistoryItem[]>([]);
  const [filter,    setFilter]    = useState<FilterTab>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const fetchTrips = useCallback(async () => {
    if (!user) { setIsLoading(false); return; }
    setIsLoading(true);
    setError(null);
    try {
      const [driverRes, passengerRes] = await Promise.all([
        supabase.from('rides').select('id, from_location, to_location, departure_datetime, cost_per_seat, currency, status').eq('driver_id', user.id).order('departure_datetime', { ascending: false }),
        supabase.from('bookings').select('id, status, chat_status, ride:rides(id, from_location, to_location, departure_datetime, cost_per_seat, currency, status, driver:users!driver_id(full_name))').eq('passenger_id', user.id).order('created_at', { ascending: false }),
      ]);
      if (driverRes.error || passengerRes.error) {
        setError('Could not load your trips. Please try again.');
        return;
      }
      const driverItems: TripHistoryItem[] = (driverRes.data ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string, from_location: r.from_location as string, to_location: r.to_location as string,
        departure_datetime: r.departure_datetime as string, cost_per_seat: r.cost_per_seat as number,
        currency: r.currency as 'EUR' | 'GBP', status: r.status as string, role: 'driver', otherPartyName: 'Passenger',
      }));
      const passengerItems: TripHistoryItem[] = (passengerRes.data ?? []).map((b: Record<string, unknown>) => {
        const ride = b.ride as Record<string, unknown> | null;
        const driver = ride?.driver as Record<string, unknown> | null;
        return {
          id: (ride?.id as string | undefined) ?? (b.id as string),
          from_location: (ride?.from_location as string | undefined) ?? '',
          to_location: (ride?.to_location as string | undefined) ?? '',
          departure_datetime: (ride?.departure_datetime as string | undefined) ?? '',
          cost_per_seat: (ride?.cost_per_seat as number | undefined) ?? 0,
          currency: (ride?.currency as 'EUR' | 'GBP' | undefined) ?? 'EUR',
          status: (ride?.status as string | undefined) ?? b.status as string,
          role: 'passenger', otherPartyName: (driver?.full_name as string | undefined) ?? 'Driver',
          bookingId: b.id as string,
          bookingStatus: b.status as string,
          chatStatus: (b.chat_status as string | undefined) ?? 'open',
        };
      });
      setTrips([...driverItems, ...passengerItems].sort((a, b) => new Date(b.departure_datetime).getTime() - new Date(a.departure_datetime).getTime()));
    } finally { setIsLoading(false); }
  }, [user]);

  useEffect(() => { void fetchTrips(); }, [fetchTrips]);

  const filtered = trips.filter((t) => {
    if (filter === 'all')       return true;
    if (filter === 'rider')     return t.role === 'passenger';
    if (filter === 'driver')    return t.role === 'driver';
    if (filter === 'cancelled') return t.status === 'cancelled';
    return true;
  });

  const completedPassengerTrips = trips.filter((t) => t.role === 'passenger' && t.status === 'completed');
  const totalSaved = completedPassengerTrips.reduce((acc, t) => {
    const saving = getSavingVsPublicTransport(t.from_location, t.to_location, t.cost_per_seat);
    return acc + (saving ?? 0);
  }, 0);

  const currency = trips.find((t) => t.role === 'passenger')?.currency ?? 'EUR';
  // 150km avg trip, 170g CO₂/km per SEAI estimates — one shared seat per trip.
  const co2Saved = Math.round(
    completedPassengerTrips.reduce((acc) => acc + calculateCO2Savings(150, 1).savedKg, 0),
  );

  if (isLoading) return <View style={styles.center} testID="history-loading"><ActivityIndicator size="large" color={Colors.primary} /></View>;
  if (error) return <View style={styles.center} testID="history-error"><Text style={styles.emptyText}>{error}</Text></View>;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent} testID="history-screen">
      {/* Stats header */}
      <View style={styles.statsRow} testID="stats-header">
        <View style={styles.statCard}>
          <Ionicons name="cash-outline" size={20} color={Colors.primary} />
          <Text style={styles.statValue}>{formatCurrency(totalSaved, currency)}</Text>
          <Text style={styles.statLabel}>saved vs bus</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="leaf-outline" size={20} color={Colors.verified} />
          <Text style={styles.statValue}>{co2Saved}kg</Text>
          <Text style={styles.statLabel}>CO₂ saved</Text>
        </View>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow} testID="filter-tabs">
        {(['all', 'rider', 'driver', 'cancelled'] as FilterTab[]).map((tab) => (
          <TouchableOpacity key={tab} style={[styles.filterTab, filter === tab && styles.filterTabActive]} onPress={() => setFilter(tab)} accessibilityRole="button" testID={`filter-${tab}`}>
            <Text style={[styles.filterText, filter === tab && styles.filterTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Trip list */}
      {filtered.length === 0 ? (
        <Text style={styles.emptyText} testID="history-empty">No trips yet</Text>
      ) : (
        filtered.map((trip) => {
          const saving = getSavingVsPublicTransport(trip.from_location, trip.to_location, trip.cost_per_seat);
          const depDate = new Date(trip.departure_datetime).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' });
          return (
            <TouchableOpacity key={`${trip.role}-${trip.id}`} style={styles.tripCard} onPress={() => router.push(`/ride/${trip.id}`)} accessibilityRole="button" testID={`trip-item-${trip.id}`}>
              <View style={styles.tripTop}>
                <Text style={styles.tripRoute} numberOfLines={1}>{trip.from_location} → {trip.to_location}</Text>
                <Text style={styles.tripRole}>{trip.role === 'driver' ? '🚗 Driver' : '🧑‍🤝‍🧑 Rider'}</Text>
              </View>
              <View style={styles.tripMeta}>
                <Text style={styles.tripDate}>{depDate}</Text>
                {saving !== null && trip.status === 'completed' && trip.role === 'passenger' && (
                  <Text style={styles.savings} testID={`savings-${trip.id}`}>
                    Saved {formatCurrency(saving, trip.currency)} vs public transport
                  </Text>
                )}
              </View>
              {/* Chat opens once the driver accepts (booking confirmed); closed chats stay read-only (Change 3). */}
              {trip.role === 'passenger' && trip.bookingId && trip.bookingStatus === 'confirmed' && (
                <TouchableOpacity
                  style={styles.chatLink}
                  onPress={() => router.push(`/chat/${trip.bookingId}`)}
                  accessibilityRole="button"
                  accessibilityLabel={trip.chatStatus === 'closed' ? 'View closed chat' : 'Open chat'}
                  testID={`chat-link-${trip.bookingId}`}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color={Colors.primary} />
                  <Text style={styles.chatLinkText}>
                    {trip.chatStatus === 'closed' ? 'View chat (closed)' : 'Message driver'}
                  </Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingHorizontal: Spacing.screenPadding, paddingTop: Spacing.xxxl + Spacing.xl, paddingBottom: Spacing.xxxxxl, gap: Spacing.md },
  center: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', gap: Spacing.md },
  statCard: { flex: 1, backgroundColor: Colors.primary, borderRadius: BorderRadius.large, padding: Spacing.cardPadding, alignItems: 'center', gap: Spacing.xs },
  statValue: { fontSize: 20, fontFamily: FontFamily.bold, color: Colors.surface },
  statLabel: { ...Typography.bodySmall, color: Colors.surface, opacity: 0.85 },
  filterRow: { flexDirection: 'row', backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.full, padding: 4, gap: 2 },
  filterTab: { flex: 1, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, alignItems: 'center' },
  filterTabActive: { backgroundColor: Colors.primary },
  filterText: { fontSize: 12, fontFamily: FontFamily.medium, color: Colors.primary },
  filterTextActive: { color: Colors.surface },
  emptyText: { ...Typography.bodyMedium, color: Colors.textTertiary, textAlign: 'center', paddingVertical: Spacing.xxxxxl },
  tripCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.large, borderWidth: 1, borderColor: Colors.border, ...Shadows.card, padding: Spacing.cardPadding, gap: Spacing.sm },
  tripTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tripRoute: { ...Typography.headingSmall, color: Colors.textPrimary, flex: 1 },
  tripRole: { ...Typography.bodySmall, color: Colors.textSecondary },
  tripMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  tripDate: { ...Typography.bodySmall, color: Colors.textTertiary },
  savings: { ...Typography.bodySmall, color: Colors.verified },
  chatLink: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.xs },
  chatLinkText: { ...Typography.bodySmall, color: Colors.primary, fontFamily: FontFamily.medium },
});
