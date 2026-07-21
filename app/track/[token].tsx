/**
 * app/track/[token].tsx
 *
 * Nominated-contact live tracking view, reached two ways:
 *  - In-app: an htwa-user contact taps a "watch journey" card on the Live Trip
 *    tab (token passed as the route param).
 *  - Deep link: htwa://track/<token> from the shared web link.
 *
 * Data comes from the get_tracking_snapshot RPC — the tracking token is the
 * credential, so this screen works even for a signed-out user (the RPC is
 * anon-executable and validates token + expiry itself). The same RPC powers
 * the static web page (web/track.html) for contacts without the app.
 *
 * States: live, signal-lost ("last seen [time] at [location]"), not started,
 * completed, expired token, invalid token — plus SOS/off-course alert banners.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { JourneyMap } from '../../components/JourneyMap';
import { Colors, Typography, Spacing, BorderRadius, FontFamily } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { SIGNAL_LOST_AFTER_MS } from '../../services/tracking';

const POLL_INTERVAL_MS = 15_000;

interface Snapshot {
  ok: boolean;
  reason?: 'invalid_token' | 'expired';
  trip?: {
    status: string;
    from_location: string;
    to_location: string;
    from_coords: { lat: number; lng: number } | null;
    to_coords: { lat: number; lng: number } | null;
    departure_datetime: string;
    estimated_duration_seconds: number | null;
  };
  traveller_name?: string;
  driver_name?: string;
  contact_name?: string;
  last_location?: { lat: number; lng: number; recorded_at: string } | null;
  alerts?: Array<{ alert_type: string; detail: string | null; created_at: string }>;
}

export default function TrackingScreen(): React.ReactElement {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [fetchError, setFetchError] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const { data, error } = await supabase.rpc('get_tracking_snapshot', { p_token: token });
      if (error) throw error;
      const snap = data as unknown as Snapshot;
      setSnapshot(snap);
      setFetchError(false);
      // Nothing more can change once the journey is over or the token is
      // rejected — keep polling forever would just waste battery/network on
      // a mobile safety screen.
      const terminal = !snap.ok || snap.trip?.status === 'completed' || snap.trip?.status === 'cancelled';
      if (terminal && timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    } catch (e) {
      console.error('[Track] snapshot failed:', e instanceof Error ? e.message : e);
      setFetchError(true);
    }
  }, [token]);

  useEffect(() => {
    void load();
    timerRef.current = setInterval(() => { void load(); }, POLL_INTERVAL_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [load]);

  const renderBody = () => {
    if (fetchError && !snapshot) {
      return (
        <View style={styles.center}>
          <Text style={styles.title}>Couldn't load the journey</Text>
          <TouchableOpacity onPress={load} accessibilityRole="button" testID="track-retry">
            <Text style={styles.link}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (!snapshot) {
      return <View style={styles.center}><Text style={styles.subtle}>Loading journey…</Text></View>;
    }
    if (!snapshot.ok) {
      return (
        <View style={styles.center} testID="track-invalid">
          <Ionicons name="link-outline" size={48} color={Colors.textTertiary} />
          <Text style={styles.title}>
            {snapshot.reason === 'expired' ? 'This tracking link has expired' : 'Invalid tracking link'}
          </Text>
          <Text style={styles.subtle}>
            {snapshot.reason === 'expired'
              ? 'Tracking links stop working shortly after a journey ends.'
              : 'Check the link you were sent, or ask your traveller to share it again.'}
          </Text>
        </View>
      );
    }

    const trip = snapshot.trip!;
    const last = snapshot.last_location ?? null;
    const lastAgeMs = last ? Date.now() - new Date(last.recorded_at).getTime() : null;
    const inProgress = trip.status === 'in_progress';
    const signalLost = inProgress && (!last || (lastAgeMs !== null && lastAgeMs > SIGNAL_LOST_AFTER_MS));
    const activeAlerts = (snapshot.alerts ?? []).filter((a) => a.alert_type !== 'signal_lost');

    // Progress estimate from straight-line geometry (map arrives with the Maps key).
    let progressPct: number | null = null;
    if (last && trip.from_coords && trip.to_coords) {
      const dist = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
        const toRad = (d: number) => (d * Math.PI) / 180;
        const dLat = toRad(b.lat - a.lat); const dLng = toRad(b.lng - a.lng);
        const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
        return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
      };
      const total = dist(trip.from_coords, trip.to_coords);
      if (total > 0.1) {
        progressPct = Math.max(0, Math.min(100, (1 - dist(last, trip.to_coords) / total) * 100));
      }
    }

    const statusLabel =
      trip.status === 'completed' ? 'Journey completed'
      : trip.status === 'cancelled' ? 'Journey cancelled'
      : inProgress ? (signalLost ? 'Signal lost' : 'On the road')
      : `Departs ${new Date(trip.departure_datetime).toLocaleString('en-IE', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}`;

    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.watchingLabel} testID="track-traveller">
          Following {snapshot.traveller_name ?? 'a traveller'}'s journey
        </Text>

        {/* Alerts */}
        {activeAlerts.length > 0 && (
          <View style={styles.alertBanner} testID="track-alerts">
            <Ionicons name="warning" size={18} color={Colors.surface} />
            <Text style={styles.alertText}>
              {activeAlerts[0].alert_type === 'sos'
                ? `SOS raised at ${new Date(activeAlerts[0].created_at).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })} — if you can't reach them, call 112/999.`
                : `This journey has gone off its planned route (${new Date(activeAlerts[0].created_at).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })}).`}
            </Text>
          </View>
        )}

        {/* Status */}
        <View style={[styles.statusCard, signalLost && styles.statusCardLost]} testID="track-status">
          <View style={styles.statusRow}>
            {inProgress && !signalLost && <View style={styles.liveDot} />}
            <Text style={[styles.statusText, signalLost && styles.statusTextLost]}>{statusLabel}</Text>
          </View>
          {signalLost && last && (
            <Text style={styles.subtle} testID="track-last-seen">
              Last seen {new Date(last.recorded_at).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })} at {last.lat.toFixed(4)}, {last.lng.toFixed(4)}
            </Text>
          )}
          {signalLost && !last && (
            <Text style={styles.subtle} testID="track-no-signal">No location received yet for this journey.</Text>
          )}
        </View>

        {/* Route + progress */}
        <View style={styles.routeCard}>
          <Text style={styles.routeText}>{trip.from_location} → {trip.to_location}</Text>
          {(trip.from_coords || trip.to_coords || last) && (
            <JourneyMap
              from={trip.from_coords}
              to={trip.to_coords}
              current={inProgress ? last : null}
              stubText={inProgress && last ? 'Live position' : 'Route preview'}
              style={styles.trackMap}
              testID="track-map"
            />
          )}
          {progressPct !== null && inProgress && !signalLost && (
            <>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
              </View>
              <Text style={styles.subtle} testID="track-progress">
                About {Math.round(progressPct)}% of the way there
              </Text>
            </>
          )}
          {last && inProgress && !signalLost && (
            <Text style={styles.subtle} testID="track-coords">
              Current position: {last.lat.toFixed(4)}, {last.lng.toFixed(4)} · updated {new Date(last.recorded_at).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
        </View>

        {/* People */}
        <View style={styles.peopleCard}>
          <View style={styles.personRow}>
            <Ionicons name="car-outline" size={18} color={Colors.primary} />
            <Text style={styles.personText}>Driver: {snapshot.driver_name ?? 'Unknown'}</Text>
          </View>
          <View style={styles.personRow}>
            <Ionicons name="person-outline" size={18} color={Colors.primary} />
            <Text style={styles.personText}>Traveller: {snapshot.traveller_name ?? 'Unknown'}</Text>
          </View>
        </View>

        <Text style={styles.footerNote}>
          You're seeing this because {snapshot.traveller_name ?? 'a traveller'} nominated you as their
          safety contact on htwa. This page updates automatically.
        </Text>
      </ScrollView>
    );
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + Spacing.lg }]} testID="tracking-screen">
      <View style={styles.headerRow}>
        {router.canGoBack() && (
          <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" testID="back-button" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        )}
        <Text style={styles.screenTitle}>Live journey</Text>
        <View style={styles.headerSpacer} />
      </View>
      {renderBody()}
    </View>
  );
}

const styles = StyleSheet.create({
  // paddingTop is set inline (insets.top + Spacing.lg) so the header clears
  // the status bar/Dynamic Island on every device instead of a fixed value.
  screen: { flex: 1, backgroundColor: Colors.background },
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding, paddingBottom: Spacing.md,
  },
  screenTitle: { ...Typography.headingLarge, color: Colors.textPrimary, flex: 1, textAlign: 'center' },
  headerSpacer: { width: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
  content: { padding: Spacing.screenPadding, gap: Spacing.md },

  title: { ...Typography.headingMedium, color: Colors.textPrimary, textAlign: 'center' },
  subtle: { ...Typography.bodySmall, color: Colors.textSecondary },
  link: { ...Typography.bodyMedium, color: Colors.primary },

  watchingLabel: { ...Typography.bodyMedium, color: Colors.textSecondary },

  alertBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.sos, borderRadius: BorderRadius.large,
    padding: Spacing.cardPadding,
  },
  alertText: { ...Typography.bodySmall, color: Colors.surface, flex: 1 },

  statusCard: {
    backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.large,
    padding: Spacing.cardPadding, gap: Spacing.xs,
  },
  statusCardLost: { backgroundColor: Colors.amberLight },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  statusText: { ...Typography.headingSmall, color: Colors.textPrimary },
  statusTextLost: { color: Colors.textPrimary },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },

  routeCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.large,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.cardPadding, gap: Spacing.sm,
  },
  routeText: { ...Typography.headingSmall, color: Colors.textPrimary },
  trackMap: { height: 180, borderRadius: BorderRadius.large, overflow: 'hidden' },
  progressTrack: {
    height: 6, borderRadius: 3, backgroundColor: Colors.primaryLight, overflow: 'hidden',
  },
  progressFill: { height: 6, backgroundColor: Colors.primary },

  peopleCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.large,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.cardPadding, gap: Spacing.sm,
  },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  personText: { ...Typography.bodyMedium, color: Colors.textPrimary },

  footerNote: { ...Typography.bodySmall, color: Colors.textTertiary, textAlign: 'center', fontFamily: FontFamily.regular },
});
