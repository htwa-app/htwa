/**
 * app/(tabs)/live-trip.tsx
 *
 * Live Trip screen (tab 3) — the safety suite's home.
 *
 * Three modes:
 *  1. Own active journey (driver): start/complete lifecycle, live location
 *     publishing to trip_locations, off-course corridor monitoring, silent SOS,
 *     per-journey nominated contact panel, tokenised tracking link.
 *  2. Own active journey (passenger): journey status, silent SOS, nominated
 *     contact panel, tracking link, "Verify your driver" disclosure panel.
 *  3. Nominated contact (htwa user): "watch live" cards for journeys the user
 *     is the nominated contact of.
 *
 * Map is stubbed until the Google Maps key lands (BLOCKERS-FOR-JORDAN.md):
 * shows live coordinates + last-update age meaningfully instead.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Share,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/Button';
import { NominatedContactCard } from '../../components/NominatedContactCard';
import { DriverVerifyPanel } from '../../components/DriverVerifyPanel';
import { JourneyMap } from '../../components/JourneyMap';
import {
  Colors, Typography, Spacing, BorderRadius, FontFamily,
} from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import {
  classifyFeed,
  getLatestLocation,
  raiseAlert,
  sendSOS,
  startPublishing,
  stopPublishing,
  subscribeToLocations,
} from '../../services/tracking';
import { createCorridorMonitor, type CorridorMonitor } from '../../utils/routeCorridor';
import type { JourneyContactRow, RideStatus, TripLocationRow } from '../../types/database';

// ─── Spec-local constants ─────────────────────────────────────────────────────

const LIVE_BADGE_BG = Colors.primary;
const SHARING_BG    = Colors.lavenderLight;
/** Public tracking page base — the token goes in the fragment (never a query param). */
const TRACKING_BASE = 'https://htwa-app.com/track';
/** How early a driver can start the journey (ms before departure). */
const START_WINDOW_BEFORE_MS = 60 * 60 * 1000;

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActiveTrip {
  id:            string;
  from_location: string;
  to_location:   string;
  from_coords:   { lat: number; lng: number } | null;
  to_coords:     { lat: number; lng: number } | null;
  departure:     string;
  status:        RideStatus;
  role:          'driver' | 'passenger';
  driverName:    string;
}

interface WatchedJourney {
  token:      string;
  rideId:     string;
  traveller:  string;
  from:       string;
  to:         string;
  status:     string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LiveTripScreen(): React.ReactElement {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTrip, setActiveTrip] = useState<ActiveTrip | null>(null);
  const [watched, setWatched] = useState<WatchedJourney[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [contact, setContact] = useState<JourneyContactRow | null>(null);
  const [lastLocation, setLastLocation] = useState<TripLocationRow | null>(null);
  const [sosState, setSosState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const [lifecycleBusy, setLifecycleBusy] = useState(false);
  const [lifecycleError, setLifecycleError] = useState<string | null>(null);
  const corridorRef = useRef<CorridorMonitor | null>(null);

  const fetchState = useCallback(async () => {
    if (!user) { setIsLoading(false); return; }
    setIsLoading(true);
    setLoadError(false);
    try {
      // Own journey as driver — soonest active/full/in-progress ride.
      const { data: driverRides, error: driverErr } = await supabase
        .from('rides')
        .select('id, from_location, to_location, from_coords, to_coords, departure_datetime, status')
        .eq('driver_id', user.id)
        .in('status', ['active', 'full', 'in_progress'])
        .order('departure_datetime', { ascending: true })
        .limit(1);
      if (driverErr) throw driverErr;
      const driverRide = driverRides?.[0] ?? null;

      if (driverRide) {
        setActiveTrip({
          id:            driverRide.id,
          from_location: driverRide.from_location,
          to_location:   driverRide.to_location,
          from_coords:   driverRide.from_coords,
          to_coords:     driverRide.to_coords,
          departure:     driverRide.departure_datetime,
          status:        driverRide.status,
          role:          'driver',
          driverName:    'You (driver)',
        });
      } else {
        // Own journey as passenger — confirmed booking on a live ride.
        const { data: bookings, error: bookingErr } = await supabase
          .from('bookings')
          .select('id, ride_id')
          .eq('passenger_id', user.id)
          .eq('status', 'confirmed');
        if (bookingErr) throw bookingErr;

        let passengerTrip: ActiveTrip | null = null;
        if (bookings && bookings.length > 0) {
          const { data: rides, error: ridesErr } = await supabase
            .from('rides')
            .select('id, from_location, to_location, from_coords, to_coords, departure_datetime, status, driver_id')
            .in('id', bookings.map((b) => b.ride_id))
            .in('status', ['active', 'full', 'in_progress'])
            .order('departure_datetime', { ascending: true })
            .limit(1);
          if (ridesErr) throw ridesErr;
          const ride = rides?.[0] ?? null;
          if (ride) {
            let driverName = 'Driver';
            const { data: driver, error: driverNameErr } = await supabase
              .from('users').select('full_name').eq('id', ride.driver_id).maybeSingle();
            if (driverNameErr) throw driverNameErr;
            driverName = driver?.full_name ?? 'Driver';
            passengerTrip = {
              id:            ride.id,
              from_location: ride.from_location,
              to_location:   ride.to_location,
              from_coords:   ride.from_coords,
              to_coords:     ride.to_coords,
              departure:     ride.departure_datetime,
              status:        ride.status,
              role:          'passenger',
              driverName,
            };
          }
        }
        setActiveTrip(passengerTrip);
      }

      // Journeys the user is the nominated contact of (in-app live view).
      const { data: contactRows, error: contactErr } = await supabase
        .from('journey_contacts')
        .select('tracking_token, ride_id, user_id, token_expires_at')
        .eq('contact_user_id', user.id);
      if (contactErr) throw contactErr;

      const validRows = (contactRows ?? []).filter(
        (c) => !c.token_expires_at || new Date(c.token_expires_at).getTime() > Date.now(),
      );
      if (validRows.length > 0) {
        const [{ data: rides, error: ridesErr }, { data: travellers, error: travErr }] = await Promise.all([
          supabase.from('rides')
            .select('id, from_location, to_location, status')
            .in('id', validRows.map((c) => c.ride_id))
            .in('status', ['active', 'full', 'in_progress']),
          supabase.from('users')
            .select('id, full_name')
            .in('id', validRows.map((c) => c.user_id)),
        ]);
        if (ridesErr) throw ridesErr;
        if (travErr) throw travErr;
        const nameById = new Map((travellers ?? []).map((t) => [t.id, t.full_name]));
        setWatched(
          validRows.flatMap((c) => {
            const ride = (rides ?? []).find((r) => r.id === c.ride_id);
            if (!ride) return [];
            return [{
              token:     c.tracking_token,
              rideId:    c.ride_id,
              traveller: nameById.get(c.user_id) ?? 'A traveller',
              from:      ride.from_location,
              to:        ride.to_location,
              status:    ride.status,
            }];
          }),
        );
      } else {
        setWatched([]);
      }
    } catch (e) {
      console.error('[LiveTrip] load failed:', e instanceof Error ? e.message : e);
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { void fetchState(); }, [fetchState]);

  // ── Location publishing + off-course monitoring (driver, in-progress) ─────
  useEffect(() => {
    if (!activeTrip || !user) return;
    if (activeTrip.role !== 'driver' || activeTrip.status !== 'in_progress') return;

    const route = [activeTrip.from_coords, activeTrip.to_coords]
      .filter((c): c is { lat: number; lng: number } => !!c);
    corridorRef.current = route.length >= 2 ? createCorridorMonitor(route) : null;

    let cancelled = false;
    startPublishing(activeTrip.id, (point) => {
      if (cancelled) return;
      const monitor = corridorRef.current;
      if (monitor && monitor.addSample(point)) {
        // Sustained deviation — flag the trip and alert the nominated contact.
        void raiseAlert({
          rideId: activeTrip.id,
          raisedBy: user.id,
          alertType: 'off_course',
          location: point,
          detail: `Sustained deviation ~${monitor.lastDistanceKm()?.toFixed(1)}km from planned route`,
        });
      }
    }).catch((e) => {
      console.error('[LiveTrip] startPublishing failed:', e instanceof Error ? e.message : e);
    });

    return () => { cancelled = true; stopPublishing(); };
  }, [activeTrip, user]);

  // ── Live feed for the passenger view ──────────────────────────────────────
  useEffect(() => {
    if (!activeTrip || activeTrip.role !== 'passenger' || activeTrip.status !== 'in_progress') return;
    let mounted = true;
    void getLatestLocation(activeTrip.id).then((res) => {
      if (mounted && res.ok) setLastLocation(res.snapshot.last);
    });
    const unsubscribe = subscribeToLocations(activeTrip.id, (row) => {
      if (mounted) setLastLocation(row);
    });
    return () => { mounted = false; unsubscribe(); };
  }, [activeTrip]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const updateRideStatus = async (to: RideStatus) => {
    if (!activeTrip) return;
    setLifecycleBusy(true);
    setLifecycleError(null);
    try {
      const { data, error } = await supabase
        .from('rides')
        .update({ status: to })
        .eq('id', activeTrip.id)
        .in('status', to === 'in_progress' ? ['active', 'full'] : ['in_progress'])
        .select('id');
      if (error) throw error;
      if (!data || data.length === 0) {
        setLifecycleError('The journey state changed — pull to refresh and try again.');
        return;
      }
      if (to === 'completed') stopPublishing();
      await fetchState();
    } catch (e) {
      console.error('[LiveTrip] status update failed:', e instanceof Error ? e.message : e);
      setLifecycleError(to === 'in_progress'
        ? 'Could not start the journey. Please try again.'
        : 'Could not complete the journey. Please try again.');
    } finally {
      setLifecycleBusy(false);
    }
  };

  const handleSOS = async () => {
    if (!activeTrip || !user || sosState === 'sending') return;
    setSosState('sending');
    try {
      const res = await sendSOS(activeTrip.id, user.id);
      setSosState(res.ok ? 'sent' : 'failed');
    } catch {
      setSosState('failed');
    }
  };

  const handleShareLink = async () => {
    if (!contact) return;
    try {
      await Share.share({
        message: `Follow my htwa journey live: ${TRACKING_BASE}#${contact.tracking_token}`,
      });
    } catch (e) {
      console.error('[LiveTrip] share failed:', e instanceof Error ? e.message : e);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={[styles.screen, styles.center]} testID="live-trip-screen">
        <Text style={styles.idleSubtitle}>Loading…</Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={[styles.screen, styles.center]} testID="live-trip-screen">
        <Text style={styles.idleTitle}>Couldn't load your journeys</Text>
        <TouchableOpacity onPress={fetchState} accessibilityRole="button" testID="live-trip-retry">
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!activeTrip && watched.length === 0) {
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

  const isInProgress = activeTrip?.status === 'in_progress';
  const canStart = activeTrip?.role === 'driver'
    && (activeTrip.status === 'active' || activeTrip.status === 'full')
    && new Date(activeTrip.departure).getTime() - Date.now() <= START_WINDOW_BEFORE_MS;
  const feed = classifyFeed(lastLocation);

  return (
    <View style={styles.screen} testID="live-trip-screen">
      {/* Map — real map when the Maps key exists, meaningful stub until then */}
      <View style={styles.mapPlaceholder} testID="map-placeholder">
        <JourneyMap
          from={activeTrip?.from_coords ?? null}
          to={activeTrip?.to_coords ?? null}
          current={feed.last ? { lat: feed.last.lat, lng: feed.last.lng } : null}
          stubText={
            isInProgress && activeTrip?.role === 'passenger' && feed.state === 'live' && feed.last
              ? `Live: ${feed.last.lat.toFixed(4)}, ${feed.last.lng.toFixed(4)}`
              : 'Live map'
          }
          testID="journey-map"
        />
        {isInProgress && activeTrip?.role === 'passenger' && feed.state !== 'live' && (
          <Text style={styles.signalLostText} testID="signal-lost">
            Signal lost{feed.last ? ` — last seen ${new Date(feed.last.recorded_at).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })} at ${feed.last.lat.toFixed(4)}, ${feed.last.lng.toFixed(4)}` : ''}
          </Text>
        )}
        {isInProgress && activeTrip?.role === 'passenger' && feed.state === 'live' && feed.last && (
          <Text style={styles.mapPlaceholderText} testID="live-coords">
            Live: {feed.last.lat.toFixed(4)}, {feed.last.lng.toFixed(4)}
          </Text>
        )}
        {isInProgress && (
          <View style={styles.liveBadge} testID="live-badge">
            <View style={styles.liveDot} />
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.bottomSheet}
        contentContainerStyle={styles.bottomSheetContent}
        testID="trip-bottom-sheet"
      >
        {/* Watching cards (nominated-contact mode) */}
        {watched.map((w) => (
          <TouchableOpacity
            key={w.token}
            style={styles.watchCard}
            onPress={() => router.push({ pathname: '/track/[token]', params: { token: w.token } })}
            accessibilityRole="button"
            testID={`watch-card-${w.rideId}`}
          >
            <Ionicons name="eye-outline" size={20} color={Colors.primary} />
            <View style={styles.flex}>
              <Text style={styles.watchTitle}>{w.traveller}'s journey</Text>
              <Text style={styles.watchSubtitle}>{w.from} → {w.to} · {w.status === 'in_progress' ? 'On the road' : 'Not started yet'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
          </TouchableOpacity>
        ))}

        {activeTrip && (
          <>
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

            {/* Verify your driver (passenger only, booked) */}
            {activeTrip.role === 'passenger' && (
              <DriverVerifyPanel rideId={activeTrip.id} testID="driver-verify-panel" />
            )}

            {/* Journey lifecycle (driver) */}
            {activeTrip.role === 'driver' && !isInProgress && (
              <Button
                title={canStart ? 'Start journey' : `Starts ${new Date(activeTrip.departure).toLocaleString('en-IE', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}`}
                onPress={() => void updateRideStatus('in_progress')}
                disabled={!canStart || lifecycleBusy}
                testID="start-journey-button"
              />
            )}
            {activeTrip.role === 'driver' && isInProgress && (
              <Button
                title="Complete journey"
                variant="secondary"
                onPress={() => void updateRideStatus('completed')}
                disabled={lifecycleBusy}
                testID="complete-journey-button"
              />
            )}
            {lifecycleError && <Text style={styles.errorText} testID="lifecycle-error">{lifecycleError}</Text>}

            {/* Nominated contact (per-journey) */}
            {user && (
              <NominatedContactCard
                rideId={activeTrip.id}
                userId={user.id}
                editable={!isInProgress}
                onContact={setContact}
                testID="nominated-contact-card"
              />
            )}

            {/* Sharing panel */}
            <View style={styles.sharingPanel} testID="sharing-panel">
              <Text style={styles.sharingTitle}>
                {isInProgress ? 'Sharing my journey live 🔒' : 'Journey sharing'}
              </Text>
              <Text style={styles.sharingSubtitle}>
                {contact
                  ? `${contact.contact_name} ${isInProgress ? 'is receiving' : 'will receive'} live updates for this journey.`
                  : 'Add a nominated contact above to enable live journey sharing.'}
              </Text>
              {contact && (
                <TouchableOpacity
                  style={styles.trackingLinkRow}
                  onPress={handleShareLink}
                  accessibilityRole="button"
                  accessibilityLabel="Share tracking link"
                  testID="tracking-link"
                >
                  <Ionicons name="share-outline" size={16} color={Colors.primary} />
                  <Text style={styles.trackingUrl} numberOfLines={1}>Share the live tracking link</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* SOS — silent: no journey-visible side effects, subtle confirmation only */}
            {isInProgress && (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.sosButton, sosState !== 'idle' && styles.sosButtonPressed]}
                  onPress={handleSOS}
                  accessibilityRole="button"
                  accessibilityLabel="Silent SOS"
                  testID="sos-button"
                >
                  <Text style={styles.sosText}>
                    {sosState === 'sending' ? '…'
                      : sosState === 'sent' ? 'Contact alerted'
                      : sosState === 'failed' ? 'Retry SOS'
                      : 'Silent SOS'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.checkInNote}>
              Your contact will be notified when your journey completes.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  center: { alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  flex: { flex: 1 },

  idleContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.screenPadding, gap: Spacing.md,
  },
  idleTitle: { ...Typography.headingLarge, color: Colors.textPrimary, textAlign: 'center' },
  idleSubtitle: { ...Typography.bodyMedium, color: Colors.textSecondary, textAlign: 'center' },
  retryText: { ...Typography.bodyMedium, color: Colors.primary },

  mapPlaceholder: {
    flex: 1, backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  mapPlaceholderText: { ...Typography.bodySmall, color: Colors.textTertiary, marginTop: Spacing.sm },
  signalLostText: {
    ...Typography.bodySmall, color: Colors.sos, marginTop: Spacing.sm,
    textAlign: 'center', paddingHorizontal: Spacing.xl,
  },

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
    maxHeight: 460,
  },
  bottomSheetContent: { padding: Spacing.xxl, gap: Spacing.md },

  watchCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.large,
    padding: Spacing.cardPadding,
  },
  watchTitle: { ...Typography.headingSmall, color: Colors.textPrimary },
  watchSubtitle: { ...Typography.bodySmall, color: Colors.textSecondary },

  routeCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
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

  actionRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center', justifyContent: 'center' },
  sosButton: {
    backgroundColor: Colors.sos, borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  sosButtonPressed: { opacity: 0.7 },
  sosText: { fontSize: 13, fontFamily: FontFamily.semiBold, color: Colors.surface },

  errorText: { ...Typography.bodySmall, color: Colors.sos },
  checkInNote: { ...Typography.bodySmall, color: Colors.textTertiary, textAlign: 'center' },
});
