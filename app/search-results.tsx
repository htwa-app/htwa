/**
 * app/search-results.tsx
 *
 * Stage 34 — Search Results screen.
 * Receives query params: from, to, date, seats, womenOnly
 * Fetches matching rides from Supabase and renders ride cards.
 */

import React, { useCallback, useEffect, useState } from 'react';
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
import { Avatar } from '../components/Avatar';
import { Badge } from '../components/Badge';
import { formatCurrency } from '../utils/currency';
import {
  Colors, Typography, Spacing, BorderRadius, Shadows,
} from '../constants/theme';
import { supabase } from '../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RideResult {
  id:                 string;
  from_location:      string;
  to_location:        string;
  departure_datetime: string;
  seats_available:    number;
  cost_per_seat:      number;
  currency:           'EUR' | 'GBP';
  women_only:         boolean;
  driver: {
    full_name:   string;
    is_verified: boolean;
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SearchResultsScreen(): React.ReactElement {
  const router = useRouter();
  const params = useLocalSearchParams<{
    from: string; to: string; date: string;
    flexDays: string; seats: string; womenOnly: string;
  }>();

  const [rides,     setRides]     = useState<RideResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const parsedSeats = parseInt(params.seats ?? '1', 10);
  const minSeats    = Number.isFinite(parsedSeats) && parsedSeats > 0 ? parsedSeats : 1;
  const womenOnly   = params.womenOnly === 'true';
  const parsedFlex  = parseInt(params.flexDays ?? '0', 10);
  const flexDays    = Number.isFinite(parsedFlex) && parsedFlex > 0 ? Math.min(3, parsedFlex) : 0;

  const fetchRides = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('rides')
        .select(`
          id, from_location, to_location, departure_datetime,
          seats_available, cost_per_seat, currency, women_only,
          driver_id,
          driver:users!driver_id ( full_name )
        `)
        .eq('status', 'active')
        .gte('seats_available', minSeats)
        .ilike('from_location', `%${params.from ?? ''}%`)
        .ilike('to_location',   `%${params.to ?? ''}%`)
        .order('departure_datetime', { ascending: true });

      if (womenOnly) {
        query = query.eq('women_only', true);
      }

      if (params.date) {
        // Widen the window by ±flexDays around the chosen date (Block 3).
        const base  = new Date(`${params.date}T00:00:00.000Z`);
        // A malformed date param would make toISOString() throw — skip the date
        // filter (rather than crash) if it doesn't parse.
        if (!Number.isNaN(base.getTime())) {
          const start = new Date(base); start.setUTCDate(start.getUTCDate() - flexDays);
          const end   = new Date(base); end.setUTCDate(end.getUTCDate() + flexDays);
          const startOfWindow = `${start.toISOString().slice(0, 10)}T00:00:00.000Z`;
          const endOfWindow   = `${end.toISOString().slice(0, 10)}T23:59:59.999Z`;
          query = query.gte('departure_datetime', startOfWindow).lte('departure_datetime', endOfWindow);
        }
      }

      const { data, error: dbError } = await query;
      if (dbError) { setError('Could not load journeys. Please try again.'); return; }

      // Collect unique driver IDs for a single batch verification query
      const driverIds = (data ?? [])
        .map((r: Record<string, unknown>) => r.driver_id as string | undefined)
        .filter((id): id is string => Boolean(id));

      const { data: verifs, error: verifsError } = driverIds.length > 0
        ? await supabase
            .from('verification')
            .select('user_id, id_verified, selfie_verified')
            .in('user_id', driverIds)
        : { data: [], error: null };
      if (verifsError) { setError('Could not load journeys. Please try again.'); return; }

      const verifiedSet = new Set(
        (verifs ?? [])
          .filter((v: Record<string, unknown>) => v.id_verified === true && v.selfie_verified === true)
          .map((v: Record<string, unknown>) => v.user_id as string),
      );

      const rideList = (data ?? []).map((ride: Record<string, unknown>) => {
        const driverObj = ride.driver as { full_name?: string } | null;
        return {
          id:                 ride.id as string,
          from_location:      ride.from_location as string,
          to_location:        ride.to_location as string,
          departure_datetime: ride.departure_datetime as string,
          seats_available:    ride.seats_available as number,
          cost_per_seat:      ride.cost_per_seat as number,
          currency:           ride.currency as 'EUR' | 'GBP',
          women_only:         ride.women_only as boolean,
          driver: {
            full_name:   driverObj?.full_name ?? 'Driver',
            is_verified: verifiedSet.has(ride.driver_id as string),
          },
        } satisfies RideResult;
      });
      setRides(rideList);
    } catch {
      setError('Could not load journeys. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [params.from, params.to, params.date, flexDays, minSeats, womenOnly]);

  useEffect(() => { void fetchRides(); }, [fetchRides]);

  // ── Loading ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={styles.centerState} testID="results-loading">
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <View style={styles.centerState} testID="results-error">
        <Text style={styles.emptyText}>{error}</Text>
        <TouchableOpacity onPress={fetchRides} style={styles.retryBtn} accessibilityRole="button">
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      testID="search-results-screen"
    >
      {/* Header */}
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
        <Text style={styles.screenTitle}>
          {params.from} → {params.to}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.resultCount} testID="result-count">
        {rides.length} journey{rides.length !== 1 ? 's' : ''} found
      </Text>

      {/* Empty state */}
      {rides.length === 0 && (
        <View style={styles.emptyState} testID="empty-state">
          <Ionicons name="car-outline" size={48} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>No journeys found</Text>
          <Text style={styles.emptyText}>
            No journeys found for this route on this date. Try different dates or nearby locations.
          </Text>
        </View>
      )}

      {/* Ride cards */}
      {rides.map((ride) => {
        const initials = ride.driver.full_name
          .split(' ').filter(Boolean).slice(0, 2)
          .map((w) => w[0]?.toUpperCase() ?? '').join('');
        const depTime = new Date(ride.departure_datetime).toLocaleTimeString(
          'en-IE', { hour: '2-digit', minute: '2-digit' },
        );
        const depDate = new Date(ride.departure_datetime).toLocaleDateString(
          'en-IE', { weekday: 'short', day: 'numeric', month: 'short' },
        );

        return (
          <TouchableOpacity
            key={ride.id}
            style={styles.rideCard}
            onPress={() => router.push(`/ride/${ride.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`Ride from ${ride.from_location} to ${ride.to_location}`}
            testID={`ride-card-${ride.id}`}
          >
            <View style={styles.cardHeader}>
              <Avatar initials={initials} size={44} color="primary" />
              <View style={styles.driverInfo}>
                <Text style={styles.driverName}>{ride.driver.full_name}</Text>
                <View style={styles.badgeRow}>
                  {ride.driver.is_verified && (
                    <Badge variant="verified" testID={`verified-${ride.id}`} />
                  )}
                  {ride.women_only && (
                    <Badge variant="womenOnly" testID={`women-only-${ride.id}`} />
                  )}
                </View>
              </View>
              <Text style={styles.price} testID={`price-${ride.id}`}>
                {formatCurrency(ride.cost_per_seat, ride.currency)}
              </Text>
            </View>

            <View style={styles.routeSummary}>
              <View style={styles.routeRow}>
                <Ionicons name="location-outline" size={14} color="#34C759" />
                <Text style={styles.routeText} numberOfLines={1}>{ride.from_location}</Text>
              </View>
              <View style={styles.routeRow}>
                <Ionicons name="location-outline" size={14} color={Colors.amber} />
                <Text style={styles.routeText} numberOfLines={1}>{ride.to_location}</Text>
              </View>
            </View>

            <View style={styles.cardMeta}>
              <Text style={styles.metaText}>{depDate} · {depTime}</Text>
              <Text style={styles.metaText}>
                {ride.seats_available} seat{ride.seats_available !== 1 ? 's' : ''} left
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.xxxl + Spacing.xl,
    paddingBottom: Spacing.xxxxxl,
    gap: Spacing.md,
  },
  centerState: {
    flex: 1, backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center',
    padding: Spacing.screenPadding, gap: Spacing.md,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  screenTitle: {
    ...Typography.headingSmall, color: Colors.textPrimary,
    flex: 1, textAlign: 'center',
  },
  resultCount: { ...Typography.bodySmall, color: Colors.textSecondary },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxxxxl, gap: Spacing.md },
  emptyTitle: { ...Typography.headingMedium, color: Colors.textPrimary },
  emptyText: { ...Typography.bodyMedium, color: Colors.textSecondary, textAlign: 'center' },
  retryBtn: {
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.full,
  },
  retryText: { ...Typography.buttonSmall, color: Colors.primary },
  rideCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.large,
    borderWidth: 1, borderColor: Colors.border, ...Shadows.card, padding: Spacing.cardPadding,
    gap: Spacing.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  driverInfo: { flex: 1, gap: Spacing.xs },
  driverName: { ...Typography.headingSmall, color: Colors.textPrimary },
  badgeRow: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
  price: { ...Typography.headingMedium, color: Colors.primary },
  routeSummary: { gap: Spacing.xs },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  routeText: { ...Typography.bodySmall, color: Colors.textSecondary, flex: 1 },
  cardMeta: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingTop: Spacing.xs, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  metaText: { ...Typography.bodySmall, color: Colors.textTertiary },
});
