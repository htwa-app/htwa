/**
 * app/offer-ride.tsx
 *
 * Stage 31 — Offer a Journey screen.
 *
 * Driver fills in:
 *   - Route (from/to) using RouteInput
 *   - Date + time using DateTimePicker
 *   - Seats available (stepper)
 *   - Price per seat (auto-calculated, editable within cap)
 *   - Women-only toggle
 *
 * Distance is auto-calculated from the route via the Google Routes API
 * (Block 2). The driver NEVER types or edits the distance. If the Maps key
 * is missing/placeholder/invalid, a "distance calculation unavailable" state
 * is shown rather than crashing.
 *
 * Vehicle details auto-populated from profile.
 * Routes to /offer-ride-confirm on "Review offer".
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { RouteInput } from '../components/RouteInput';
import { DateTimeField } from '../components/DateTimeField';
import { calculateJourneyPricing, type Jurisdiction, type EngineCcBand, type PricingRates } from '../utils/pricingEngine';
import { fetchPricingRates } from '../services/pricingRates';
import { cumulativeForTaxYear, type MileageIncrement } from '../utils/mileageTracking';
import { computeRouteDistance, type DistanceUnit } from '../services/routes';
import { formatCurrency } from '../utils/currency';
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  FontFamily,
} from '../constants/theme';
import { supabase } from '../lib/supabase';
import { getDriverVerification } from '../services/driverVerification';
import type { DriverVerificationStatus } from '../types/database';
import { useAuth } from '../context/AuthContext';

// ─── Spec-local constants ─────────────────────────────────────────────────────

const SEATS_MIN = 1;
const SEATS_CAP_DEFAULT = 4; // hard cap unless the driver's vehicle is evidenced (Block 3)
const SEATS_CAP_VERIFIED = 7; // raised cap once extra-seat capacity is verified
const DISTANCE_DEBOUNCE_MS = 500; // wait for the driver to stop typing before calling the Routes API
const MILES_TO_KM = 1.60934; // convert a UK miles distance to km for storage in distance_km
const TOGGLE_TRACK_OFF = 'rgba(40,30,20,0.15)'; // §9 switch inactive track — not in palette

type DistanceState = 'idle' | 'calculating' | 'ok' | 'unavailable' | 'no_key';

// ─── Component ────────────────────────────────────────────────────────────────

export default function OfferRideScreen(): React.ReactElement {
  const router = useRouter();
  const { user } = useAuth();

  const [from,          setFrom]          = useState('');
  const [to,            setTo]            = useState('');
  const [distance,      setDistance]      = useState<number | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null); // Change 2 — overlap window
  const [distanceState, setDistanceState] = useState<DistanceState>('idle');
  const [date,          setDate]          = useState('');   // YYYY-MM-DD
  const [time,          setTime]          = useState('');   // HH:MM
  const [seats,         setSeats]         = useState(3);
  // driverSeatPrice is COMPUTED by the pricing engine and FIXED — the driver can
  // never type or edit it (Block 4). They only ever see their own cost-share.
  const [driverSeatPrice, setDriverSeatPrice] = useState<number | null>(null);
  const [womenOnly,     setWomenOnly]     = useState(false);
  const [luggageNote,   setLuggageNote]   = useState(''); // Block 8 — optional
  // Block 3: posting more than 4 seats requires evidence the vehicle can carry them.
  // TODO: build the evidence-upload flow (vehicle reg / insurance seats) that flips
  // `extraSeatsVerified` to true. Until then the selector is hard-capped at 4.
  const [extraSeatsVerified] = useState(false);
  const seatsMax = extraSeatsVerified ? SEATS_CAP_VERIFIED : SEATS_CAP_DEFAULT;

  // Block 4 — driver pricing profile (tax residence drives everything).
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [jurisdiction,  setJurisdiction]  = useState<Jurisdiction | null>(null);
  const [engineCc,      setEngineCc]      = useState<EngineCcBand | null>(null);
  const [cumulative,    setCumulative]    = useState(0);
  // A query error here must NEVER be treated as "cumulative mileage = 0" — an
  // understated cumulative could apply a more favourable (wrong) tax band.
  // Distinct from "hasProfile is false" (which means genuinely not set up yet).
  const [profileLoadError, setProfileLoadError] = useState(false);
  // Driver verification gate (round-2 fix #2): null = no submission yet.
  const [verificationStatus, setVerificationStatus] = useState<DriverVerificationStatus | null>(null);
  const [verificationLoadError, setVerificationLoadError] = useState(false);

  // Rates come from the DB (sole source of truth). null until loaded; ratesError
  // when the fetch fails — pricing then FAILS LOUD, never from a hardcoded rate.
  const [pricingRates,  setPricingRates]  = useState<PricingRates | null>(null);
  const [ratesError,    setRatesError]    = useState(false);

  const currency: 'EUR' | 'GBP' = jurisdiction === 'UK' ? 'GBP' : 'EUR';
  // ROI → km, UK → miles.
  const unit: DistanceUnit = jurisdiction === 'UK' ? 'miles' : 'km';

  // Load the driver's pricing profile + their cumulative annual distance.
  const loadDriverProfile = useCallback(async () => {
    if (!user) return;
    try {
      // Verification gate first — a failed check BLOCKS with retry, it never
      // silently passes (and never tells an approved driver to redo setup).
      const dv = await getDriverVerification(user.id);
      if (!dv.ok) { setVerificationLoadError(true); setProfileLoadError(true); return; }
      setVerificationLoadError(false);
      setVerificationStatus(dv.verification?.status ?? null);

      const { data: profile, error: profileErr } = await supabase
        .from('driver_pricing_profiles')
        .select('tax_residence, engine_cc')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileErr) { setProfileLoadError(true); return; }

      if (profile) {
        const jur = profile.tax_residence as Jurisdiction;
        setJurisdiction(jur);
        setEngineCc(profile.engine_cc as EngineCcBand);

        const { data: increments, error: incrementsErr } = await supabase
          .from('driver_mileage_increments')
          .select('amount, created_at, source')
          .eq('driver_id', user.id);

        // A failed query here must NEVER silently compute as "0 miles so
        // far" — that could apply a more favourable (wrong) tax band.
        if (incrementsErr) { setProfileLoadError(true); return; }

        const mapped: MileageIncrement[] = (increments ?? []).map((i) => ({
          amount: Number(i.amount),
          at: i.created_at as string,
          source: i.source as MileageIncrement['source'],
        }));
        setCumulative(cumulativeForTaxYear(mapped, jur));
      }
    } finally {
      // Always lift the gate, even on a thrown query, so the screen never hangs
      // in the loading state (the setup banner shows when no profile loaded).
      setProfileLoaded(true);
    }
  }, [user]);

  useEffect(() => { void loadDriverProfile(); }, [loadDriverProfile]);

  // Load DB rates once. A failure is a HARD failure — surface it, never fall back.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetchPricingRates();
        if (!cancelled) { setPricingRates(r); setRatesError(false); }
      } catch {
        if (!cancelled) { setPricingRates(null); setRatesError(true); }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const hasProfile = jurisdiction !== null && engineCc !== null;

  // Auto-calculate the route distance whenever from/to (or the unit) change.
  // Debounced so we don't hit the Routes API on every keystroke. The driver
  // never edits this value — it comes solely from the API.
  useEffect(() => {
    if (!from.trim() || !to.trim()) {
      setDistance(null);
      setDistanceState('idle');
      return;
    }
    let cancelled = false;
    setDistanceState('calculating');
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const result = await computeRouteDistance(from, to, unit);
          if (cancelled) return;
          if (result.ok && typeof result.distance === 'number') {
            setDistance(result.distance);
            setDurationSeconds(result.durationSeconds ?? null);
            setDistanceState('ok');
          } else {
            setDistance(null);
            setDurationSeconds(null);
            // 'no_key' is the platform's missing Maps key — never the user's
            // locations; the two states get honest, distinct copy below.
            setDistanceState(result.reason === 'no_key' ? 'no_key' : 'unavailable');
          }
        } catch {
          if (cancelled) return;
          setDistance(null);
          setDurationSeconds(null);
          setDistanceState('unavailable');
        }
      })();
    }, DISTANCE_DEBOUNCE_MS);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [from, to, unit]);

  // Compute the FIXED driver seat price via the pricing engine whenever the
  // distance, seats or driver profile change. The driver never edits this.
  useEffect(() => {
    if (distance !== null && distance > 0 && hasProfile && jurisdiction && pricingRates) {
      const result = calculateJourneyPricing(pricingRates, {
        jurisdiction,
        engineCc: engineCc ?? undefined,
        cumulativeBefore: cumulative,
        distance,
        tolls: 0, // tolls wiring deferred — see PROGRESS Block 4
        seatsOffered: seats,
      });
      setDriverSeatPrice(result.driverSeatPrice);
    } else {
      setDriverSeatPrice(null);
    }
  }, [distance, seats, hasProfile, jurisdiction, engineCc, cumulative, pricingRates]);

  const incrementSeats = () => setSeats((s) => Math.min(seatsMax, s + 1));
  const decrementSeats = () => setSeats((s) => Math.max(SEATS_MIN, s - 1));

  const isValid = from.trim().length > 0
    && to.trim().length > 0
    && distance !== null && distance > 0
    && date.length > 0
    && time.length > 0
    && hasProfile
    && !profileLoadError
    && verificationStatus === 'approved'
    && driverSeatPrice !== null && driverSeatPrice > 0;

  const handleReview = () => {
    // distance is in the driver's display unit (km for ROI, miles for UK). The
    // confirm screen persists it to distance_km, so convert miles→km here so a
    // UK journey isn't stored with its mileage value mislabelled as kilometres.
    const distanceKm = distance == null
      ? 0
      : unit === 'miles'
        ? distance * MILES_TO_KM
        : distance;
    const params = new URLSearchParams({
      from,
      to,
      date,
      time,
      seats: String(seats),
      pricePerSeat: String(driverSeatPrice ?? 0),
      currency,
      distanceKm: String(distanceKm),
      womenOnly: String(womenOnly),
      luggageNote: luggageNote.trim(),
      durationSeconds: durationSeconds != null ? String(durationSeconds) : '',
    });
    router.push(`/offer-ride-confirm?${params.toString()}`);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      testID="offer-ride-screen"
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
        <Text style={styles.screenTitle}>Offer a journey</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* A load failure is NOT the same as "not set up yet" — don't send an
          already-onboarded driver back through onboarding for a query error. */}
      {profileLoaded && profileLoadError && (
        <View style={styles.setupBanner} testID="profile-load-error">
          <Ionicons name="alert-circle-outline" size={20} color={Colors.sos} />
          <Text style={styles.setupBannerText}>
            Could not load your driver pricing details. Please try again.
          </Text>
        </View>
      )}

      {/* Driver verification gate — no posting until approved (DB-enforced too). */}
      {profileLoaded && !verificationLoadError && verificationStatus !== 'approved' && (
        <TouchableOpacity
          style={styles.setupBanner}
          onPress={() => router.push('/driver-verification')}
          accessibilityRole="button"
          testID="driver-verification-banner"
        >
          <Ionicons
            name={verificationStatus === 'pending' ? 'time-outline' : 'shield-outline'}
            size={20}
            color={Colors.primary}
          />
          <Text style={styles.setupBannerText}>
            {verificationStatus === 'pending'
              ? 'Your driver verification is under review — you can post journeys once approved.'
              : verificationStatus === 'rejected'
                ? 'Your driver verification wasn\'t approved. Tap to fix and resubmit.'
                : 'Verify as a driver (licence, selfie, car photo + details) to post journeys.'}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
        </TouchableOpacity>
      )}

      {/* Driver setup gate — pricing needs the driver's tax residence + engine cc. */}
      {profileLoaded && !hasProfile && !profileLoadError && (
        <TouchableOpacity
          style={styles.setupBanner}
          onPress={() => router.push('/driver-onboarding')}
          accessibilityRole="button"
          testID="complete-setup-banner"
        >
          <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
          <Text style={styles.setupBannerText}>
            Complete your driver setup to price and post journeys.
          </Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
        </TouchableOpacity>
      )}

      {/* Route */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Route</Text>
        <RouteInput
          from={from}
          to={to}
          onFromChange={setFrom}
          onToChange={setTo}
          testID="route-input"
        />
      </View>

      {/* Distance — auto-calculated from the route. The driver never edits this. */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Distance</Text>
        {distanceState === 'idle' && (
          <Text style={styles.priceHint} testID="distance-idle">
            Enter a start and destination to calculate the journey distance.
          </Text>
        )}
        {distanceState === 'calculating' && (
          <Text style={styles.priceHint} testID="distance-calculating">
            Calculating route distance…
          </Text>
        )}
        {distanceState === 'ok' && distance !== null && (
          <>
            <Text style={styles.distanceValue} testID="distance-value">
              {distance} {unit}
            </Text>
            <Text style={styles.priceHint}>
              Calculated from the route and used to set the fair price.
            </Text>
          </>
        )}
        {distanceState === 'no_key' && (
          <Text style={styles.priceError} testID="distance-no-key">
            Distance calculation isn't available yet — journeys can't be priced
            until it is. This is on our side, not yours.
          </Text>
        )}
        {distanceState === 'unavailable' && (
          <Text style={styles.priceError} testID="distance-unavailable">
            Couldn't calculate the distance. Check your connection and the
            locations, then try again.
          </Text>
        )}
      </View>

      {/* Date + Time — native calendar/clock pickers (value contracts unchanged) */}
      <View style={styles.fieldRow}>
        <View style={styles.fieldHalf}>
          <Text style={styles.sectionLabel}>Date</Text>
          <DateTimeField
            mode="date"
            value={date}
            onChange={setDate}
            placeholder="Pick a date"
            minimumDate={new Date()}
            testID="date-input"
          />
        </View>
        <View style={styles.fieldHalf}>
          <Text style={styles.sectionLabel}>Time</Text>
          <DateTimeField
            mode="time"
            value={time}
            onChange={setTime}
            placeholder="Pick a time"
            testID="time-input"
          />
        </View>
      </View>

      {/* Seats stepper */}
      <View style={styles.rowCard}>
        <View style={styles.rowCardContent}>
          <Ionicons name="people-outline" size={20} color={Colors.primary} />
          <Text style={styles.rowCardLabel}>Seats available</Text>
        </View>
        <View style={styles.stepper}>
          <TouchableOpacity
            style={[styles.stepperBtn, seats <= SEATS_MIN && styles.stepperBtnDisabled]}
            onPress={decrementSeats}
            disabled={seats <= SEATS_MIN}
            accessibilityRole="button"
            accessibilityLabel="Decrease seats"
            testID="seats-decrement"
          >
            <Ionicons name="remove" size={18} color={seats <= SEATS_MIN ? Colors.textTertiary : Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.stepperValue} testID="seats-value">{seats}</Text>
          <TouchableOpacity
            style={[styles.stepperBtn, seats >= seatsMax && styles.stepperBtnDisabled]}
            onPress={incrementSeats}
            disabled={seats >= seatsMax}
            accessibilityRole="button"
            accessibilityLabel="Increase seats"
            testID="seats-increment"
          >
            <Ionicons name="add" size={18} color={seats >= seatsMax ? Colors.textTertiary : Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
      {!extraSeatsVerified && seats >= SEATS_CAP_DEFAULT && (
        <Text style={styles.priceHint} testID="seats-cap-note">
          Offering more than {SEATS_CAP_DEFAULT} seats requires vehicle verification (coming soon).
        </Text>
      )}

      {/* Your cost-share per seat — COMPUTED and fixed. The driver cannot edit it. */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Your cost-share per seat ({currency})</Text>
        {ratesError ? (
          <Text style={styles.priceError} testID="rates-unavailable">
            Pricing unavailable, please try again. We couldn’t load the current mileage rates,
            so we can’t price this journey right now.
          </Text>
        ) : driverSeatPrice !== null ? (
          <>
            <Text style={styles.distanceValue} testID="driver-seat-price">
              {formatCurrency(driverSeatPrice, currency)}
            </Text>
            <Text style={styles.priceHint}>
              Set automatically from the official mileage rate for your jurisdiction and split
              across you and your passengers. You can never charge more than your share.
            </Text>
          </>
        ) : (
          <Text style={styles.priceHint} testID="price-pending">
            Your fair cost-share appears once the distance is calculated.
          </Text>
        )}
      </View>

      {/* Luggage / bags note (Block 8 — optional, no extra charge) */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Luggage / bags (optional)</Text>
        <Input
          placeholder="e.g. room for one small case per person"
          value={luggageNote}
          onChangeText={setLuggageNote}
          multiline
          numberOfLines={2}
          testID="luggage-input"
        />
        <Text style={styles.priceHint}>
          Sort the details with passengers in the in-app chat after booking.
        </Text>
      </View>

      {/* Women-only toggle */}
      <View style={styles.rowCard}>
        <View style={styles.rowCardContent}>
          <Ionicons name="person-outline" size={20} color={Colors.lavender} />
          <View>
            <Text style={styles.rowCardLabel}>Women-only journey</Text>
            <Text style={styles.rowCardSub}>Only female passengers can request to join</Text>
          </View>
        </View>
        <Switch
          value={womenOnly}
          onValueChange={setWomenOnly}
          trackColor={{ false: TOGGLE_TRACK_OFF, true: Colors.primary }}
          thumbColor={Platform.OS === 'android' ? Colors.surface : undefined}
          testID="women-only-toggle"
          accessibilityRole="switch"
          accessibilityLabel="Women-only journey"
          accessibilityState={{ checked: womenOnly }}
        />
      </View>

      <Button
        title="Review offer"
        onPress={handleReview}
        disabled={!isValid}
        style={styles.ctaButton}
        testID="review-button"
      />
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.xxxl + Spacing.xl,
    paddingBottom: Spacing.xxxxxl,
    gap: Spacing.lg,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  screenTitle: { ...Typography.headingLarge, color: Colors.textPrimary, flex: 1, textAlign: 'center' },
  headerSpacer: { width: 24 },
  section: {},
  sectionLabel: { ...Typography.headingSmall, color: Colors.textPrimary, marginBottom: Spacing.sm },
  fieldRow: { flexDirection: 'row', gap: Spacing.md },
  fieldHalf: { flex: 1 },
  rowCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.large,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.cardPadding,
    paddingVertical: Spacing.lg,
  },
  rowCardContent: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  rowCardLabel: { ...Typography.bodyMedium, color: Colors.textPrimary },
  rowCardSub: { ...Typography.bodySmall, color: Colors.textSecondary },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  stepperBtn: {
    width: 32, height: 32, borderRadius: BorderRadius.medium,
    backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  stepperBtnDisabled: { backgroundColor: Colors.border },
  stepperValue: { ...Typography.headingMedium, color: Colors.textPrimary, minWidth: 24, textAlign: 'center' },
  distanceValue: { ...Typography.headingMedium, color: Colors.textPrimary },
  setupBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.large,
    padding: Spacing.cardPadding,
  },
  setupBannerText: { ...Typography.bodyMedium, color: Colors.primary, flex: 1 },
  priceHint: { ...Typography.bodySmall, color: Colors.textSecondary, marginTop: Spacing.xs },
  priceError: { ...Typography.bodySmall, color: Colors.sos, marginTop: Spacing.xs },
  ctaButton: { marginTop: Spacing.sm },
});
