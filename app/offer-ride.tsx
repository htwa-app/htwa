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
import { calculateRideCost, isWithinCap } from '../utils/costCalculator';
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
import { useAuth } from '../context/AuthContext';

// ─── Spec-local constants ─────────────────────────────────────────────────────

const SEATS_MIN = 1;
const SEATS_CAP_DEFAULT = 4; // hard cap unless the driver's vehicle is evidenced (Block 3)
const SEATS_CAP_VERIFIED = 7; // raised cap once extra-seat capacity is verified
const DISTANCE_DEBOUNCE_MS = 500; // wait for the driver to stop typing before calling the Routes API
const TOGGLE_TRACK_OFF = 'rgba(40,30,20,0.15)'; // §9 switch inactive track — not in palette

type DistanceState = 'idle' | 'calculating' | 'ok' | 'unavailable';

// ─── Component ────────────────────────────────────────────────────────────────

export default function OfferRideScreen(): React.ReactElement {
  const router = useRouter();
  const { user } = useAuth();

  const [from,          setFrom]          = useState('');
  const [to,            setTo]            = useState('');
  const [distance,      setDistance]      = useState<number | null>(null);
  const [distanceState, setDistanceState] = useState<DistanceState>('idle');
  const [date,          setDate]          = useState('');   // YYYY-MM-DD
  const [time,          setTime]          = useState('');   // HH:MM
  const [seats,         setSeats]         = useState(3);
  const [pricePerSeat,  setPricePerSeat]  = useState('');
  const [womenOnly,     setWomenOnly]     = useState(false);
  const [currency,      setCurrency]      = useState<'EUR' | 'GBP'>('EUR');
  const [homeLocation,  setHomeLocation]  = useState<'ROI' | 'NI'>('ROI');
  const [priceError,    setPriceError]    = useState<string | null>(null);
  // Block 3: posting more than 4 seats requires evidence the vehicle can carry them.
  // TODO: build the evidence-upload flow (vehicle reg / insurance seats) that flips
  // `extraSeatsVerified` to true. Until then the selector is hard-capped at 4.
  const [extraSeatsVerified] = useState(false);
  const seatsMax = extraSeatsVerified ? SEATS_CAP_VERIFIED : SEATS_CAP_DEFAULT;

  // Jurisdiction unit: ROI → km, UK (incl. NI) → miles. (Block 4 will key this off
  // tax residence; for now it derives from the driver's home location.)
  const unit: DistanceUnit = homeLocation === 'ROI' ? 'km' : 'miles';

  // Load driver's home location for rate calculation
  const loadHomeLocation = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('users')
      .select('home_location, currency')
      .eq('id', user.id)
      .single();
    if (data) {
      setHomeLocation(data.home_location as 'ROI' | 'NI');
      setCurrency(data.currency as 'EUR' | 'GBP');
    }
  }, [user]);

  useEffect(() => { void loadHomeLocation(); }, [loadHomeLocation]);

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
      void computeRouteDistance(from, to, unit).then((result) => {
        if (cancelled) return;
        if (result.ok && typeof result.distance === 'number') {
          setDistance(result.distance);
          setDistanceState('ok');
        } else {
          setDistance(null);
          setDistanceState('unavailable');
        }
      });
    }, DISTANCE_DEBOUNCE_MS);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [from, to, unit]);

  // Auto-calculate price when distance or seats change
  useEffect(() => {
    if (distance !== null && distance > 0) {
      const result = calculateRideCost(distance, seats, homeLocation);
      setPricePerSeat(result.perSeatCost.toFixed(2));
      setPriceError(null);
    }
  }, [distance, seats, homeLocation]);

  const incrementSeats = () => setSeats((s) => Math.min(seatsMax, s + 1));
  const decrementSeats = () => setSeats((s) => Math.max(SEATS_MIN, s - 1));

  const handlePriceChange = (text: string) => {
    setPricePerSeat(text);
    const val = parseFloat(text);
    if (!isNaN(val) && distance !== null) {
      if (!isWithinCap(val, seats, distance, homeLocation)) {
        const { totalCost } = calculateRideCost(distance, seats, homeLocation);
        setPriceError(`Max allowed: ${formatCurrency(totalCost / seats, currency)}`);
      } else {
        setPriceError(null);
      }
    }
  };

  const isValid = from.trim().length > 0
    && to.trim().length > 0
    && distance !== null && distance > 0
    && date.length > 0
    && time.length > 0
    && parseFloat(pricePerSeat) > 0
    && !priceError;

  const handleReview = () => {
    const params = new URLSearchParams({
      from,
      to,
      date,
      time,
      seats: String(seats),
      pricePerSeat,
      currency,
      distanceKm: String(distance ?? 0),
      womenOnly: String(womenOnly),
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
        {distanceState === 'unavailable' && (
          <Text style={styles.priceError} testID="distance-unavailable">
            Distance calculation unavailable. Please check the locations and try again later.
          </Text>
        )}
      </View>

      {/* Date + Time */}
      <View style={styles.fieldRow}>
        <View style={styles.fieldHalf}>
          <Text style={styles.sectionLabel}>Date</Text>
          <Input
            placeholder="YYYY-MM-DD"
            value={date}
            onChangeText={setDate}
            keyboardType="numbers-and-punctuation"
            testID="date-input"
          />
        </View>
        <View style={styles.fieldHalf}>
          <Text style={styles.sectionLabel}>Time</Text>
          <Input
            placeholder="HH:MM"
            value={time}
            onChangeText={setTime}
            keyboardType="numbers-and-punctuation"
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

      {/* Price per seat */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Price per seat ({currency})</Text>
        <Input
          placeholder="0.00"
          value={pricePerSeat}
          onChangeText={handlePriceChange}
          keyboardType="decimal-pad"
          testID="price-input"
        />
        {priceError ? (
          <Text style={styles.priceError} testID="price-error">{priceError}</Text>
        ) : (
          <Text style={styles.priceHint}>
            Auto-calculated from civil service rates. You may not charge more than the journey cost.
          </Text>
        )}
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
  priceHint: { ...Typography.bodySmall, color: Colors.textSecondary, marginTop: Spacing.xs },
  priceError: { ...Typography.bodySmall, color: Colors.sos, marginTop: Spacing.xs },
  ctaButton: { marginTop: Spacing.sm },
});
