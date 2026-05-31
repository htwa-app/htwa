/**
 * app/offer-ride.tsx
 *
 * Stage 31 — Offer a Ride screen.
 *
 * Driver fills in:
 *   - Route (from/to) using RouteInput
 *   - Date + time using DateTimePicker
 *   - Seats available (stepper: 1–7)
 *   - Price per seat (auto-calculated, editable within cap)
 *   - Women-only toggle
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
const SEATS_MAX = 7;
const TOGGLE_TRACK_OFF = 'rgba(40,30,20,0.15)'; // §9 switch inactive track — not in palette

// ─── Component ────────────────────────────────────────────────────────────────

export default function OfferRideScreen(): React.ReactElement {
  const router = useRouter();
  const { user } = useAuth();

  const [from,         setFrom]         = useState('');
  const [to,           setTo]           = useState('');
  const [distanceKm,   setDistanceKm]   = useState<number | null>(null);
  const [date,         setDate]         = useState('');   // YYYY-MM-DD
  const [time,         setTime]         = useState('');   // HH:MM
  const [seats,        setSeats]        = useState(3);
  const [pricePerSeat, setPricePerSeat] = useState('');
  const [womenOnly,    setWomenOnly]    = useState(false);
  const [currency,     setCurrency]     = useState<'EUR' | 'GBP'>('EUR');
  const [homeLocation, setHomeLocation] = useState<'ROI' | 'NI'>('ROI');
  const [priceError,   setPriceError]   = useState<string | null>(null);

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

  // Auto-calculate price when distance or seats change
  useEffect(() => {
    if (distanceKm !== null && distanceKm > 0) {
      const result = calculateRideCost(distanceKm, seats, homeLocation);
      setPricePerSeat(result.perSeatCost.toFixed(2));
      setPriceError(null);
    }
  }, [distanceKm, seats, homeLocation]);

  const handleDistanceChange = (text: string) => {
    const n = parseFloat(text);
    setDistanceKm(Number.isNaN(n) ? null : n);
  };

  const incrementSeats = () => setSeats((s) => Math.min(SEATS_MAX, s + 1));
  const decrementSeats = () => setSeats((s) => Math.max(SEATS_MIN, s - 1));

  const handlePriceChange = (text: string) => {
    setPricePerSeat(text);
    const val = parseFloat(text);
    if (!isNaN(val) && distanceKm !== null) {
      if (!isWithinCap(val, seats, distanceKm, homeLocation)) {
        const { totalCost } = calculateRideCost(distanceKm, seats, homeLocation);
        setPriceError(`Max allowed: ${formatCurrency(totalCost / seats, currency)}`);
      } else {
        setPriceError(null);
      }
    }
  };

  const isValid = from.trim().length > 0
    && to.trim().length > 0
    && distanceKm !== null && distanceKm > 0
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
      distanceKm: String(distanceKm ?? 0),
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
        <Text style={styles.screenTitle}>Offer a ride</Text>
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

      {/* Distance — manual entry until the Maps Routes API auto-fills it (stub) */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Distance (km)</Text>
        <Input
          placeholder="e.g. 210"
          value={distanceKm !== null ? String(distanceKm) : ''}
          onChangeText={handleDistanceChange}
          keyboardType="decimal-pad"
          testID="distance-input"
        />
        <Text style={styles.priceHint}>
          Used to calculate the fair price. Auto-filled from the route once maps are enabled.
        </Text>
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
            testID="seats-decrement"
          >
            <Ionicons name="remove" size={18} color={seats <= SEATS_MIN ? Colors.textTertiary : Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.stepperValue} testID="seats-value">{seats}</Text>
          <TouchableOpacity
            style={[styles.stepperBtn, seats >= SEATS_MAX && styles.stepperBtnDisabled]}
            onPress={incrementSeats}
            disabled={seats >= SEATS_MAX}
            accessibilityRole="button"
            testID="seats-increment"
          >
            <Ionicons name="add" size={18} color={seats >= SEATS_MAX ? Colors.textTertiary : Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

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
            <Text style={styles.rowCardLabel}>Women-only ride</Text>
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
          accessibilityLabel="Women-only ride"
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
  priceHint: { ...Typography.bodySmall, color: Colors.textSecondary, marginTop: Spacing.xs },
  priceError: { ...Typography.bodySmall, color: Colors.sos, marginTop: Spacing.xs },
  ctaButton: { marginTop: Spacing.sm },
});
