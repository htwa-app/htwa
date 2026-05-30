/**
 * app/vehicle-details.tsx
 *
 * Stage 23 — Vehicle Details screen.
 *
 * Collects and saves vehicle information:
 *   - Make, Model, Year, Colour (text inputs)
 *   - Number of seats (stepper: 2–8)
 *   - A/C toggle
 *   - Dashcam toggle
 *
 * Saved as a JSONB blob to profiles.vehicle_details.
 * Only accessible from Edit Profile.
 *
 * Spec-local constants:
 *   SEATS_MIN (2), SEATS_MAX (8) — minimum viable seats for a shared ride
 *   TOGGLE_TRACK_ON  — active toggle track colour (Colors.primary)
 *   TOGGLE_TRACK_OFF — inactive toggle track colour
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
} from '../constants/theme';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// ─── Spec-local constants ─────────────────────────────────────────────────────

const SEATS_MIN = 2;
const SEATS_MAX = 8;
/** Active track — matches Colors.primary */
const TOGGLE_TRACK_ON  = '#1F7A78';
/** Inactive track — visible on both iOS and Android */
const TOGGLE_TRACK_OFF = 'rgba(40,30,20,0.15)';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VehicleDetails {
  make:    string;
  model:   string;
  year:    string;
  colour:  string;
  seats:   number;
  hasAC:   boolean;
  dashcam: boolean;
}

const DEFAULT_VEHICLE: VehicleDetails = {
  make:    '',
  model:   '',
  year:    '',
  colour:  '',
  seats:   4,
  hasAC:   false,
  dashcam: false,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function VehicleDetailsScreen(): React.ReactElement {
  const router = useRouter();
  const { user } = useAuth();

  const [vehicle,   setVehicle]   = useState<VehicleDetails>(DEFAULT_VEHICLE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving,  setIsSaving]  = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ─── Load existing vehicle details ────────────────────────────────────────

  const loadVehicle = useCallback(async () => {
    if (!user) { setIsLoading(false); return; }
    try {
      const { data } = await supabase
        .from('profiles')
        .select('vehicle_details')
        .eq('user_id', user.id)
        .single();

      if (data?.vehicle_details) {
        setVehicle({ ...DEFAULT_VEHICLE, ...(data.vehicle_details as Partial<VehicleDetails>) });
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { void loadVehicle(); }, [loadVehicle]);

  // ─── Field helpers ────────────────────────────────────────────────────────

  const setField = <K extends keyof VehicleDetails>(key: K, value: VehicleDetails[K]) => {
    setVehicle((prev) => ({ ...prev, [key]: value }));
  };

  const incrementSeats = () => setVehicle((prev) => ({
    ...prev, seats: Math.min(SEATS_MAX, prev.seats + 1),
  }));
  const decrementSeats = () => setVehicle((prev) => ({
    ...prev, seats: Math.max(SEATS_MIN, prev.seats - 1),
  }));

  // ─── Save ─────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!user) return;
    setSaveError(null);
    setIsSaving(true);
    try {
      const { error } = await supabase.from('profiles').upsert(
        { user_id: user.id, vehicle_details: vehicle },
        { onConflict: 'user_id' },
      );
      if (error) { setSaveError(error.message); return; }
      router.back();
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Unable to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={styles.centerState} testID="vehicle-loading">
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      testID="vehicle-details-screen"
    >
      {/* ── Back + title ────────────────────────────────────────────────────── */}
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
        <Text style={styles.screenTitle}>Vehicle details</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* ── Car icon ────────────────────────────────────────────────────────── */}
      <View style={styles.iconSection}>
        <View style={styles.carIconCircle}>
          <Ionicons name="car-sport-outline" size={36} color={Colors.primary} />
        </View>
      </View>

      {/* ── Text fields ─────────────────────────────────────────────────────── */}
      <View style={styles.fieldCard}>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Make</Text>
          <Input
            placeholder="e.g. Toyota"
            value={vehicle.make}
            onChangeText={(v) => setField('make', v)}
            autoCapitalize="words"
            testID="make-input"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Model</Text>
          <Input
            placeholder="e.g. Corolla"
            value={vehicle.model}
            onChangeText={(v) => setField('model', v)}
            autoCapitalize="words"
            testID="model-input"
          />
        </View>
        <View style={styles.fieldRow}>
          <View style={styles.fieldHalf}>
            <Text style={styles.fieldLabel}>Year</Text>
            <Input
              placeholder="2022"
              value={vehicle.year}
              onChangeText={(v) => setField('year', v)}
              keyboardType="number-pad"
              maxLength={4}
              testID="year-input"
            />
          </View>
          <View style={styles.fieldHalf}>
            <Text style={styles.fieldLabel}>Colour</Text>
            <Input
              placeholder="e.g. Silver"
              value={vehicle.colour}
              onChangeText={(v) => setField('colour', v)}
              autoCapitalize="words"
              testID="colour-input"
            />
          </View>
        </View>
      </View>

      {/* ── Seats stepper ───────────────────────────────────────────────────── */}
      <View style={styles.rowCard}>
        <View style={styles.rowCardContent}>
          <Ionicons name="people-outline" size={20} color={Colors.primary} />
          <Text style={styles.rowCardLabel}>Available seats</Text>
        </View>
        <View style={styles.stepper}>
          <TouchableOpacity
            style={[styles.stepperButton, vehicle.seats <= SEATS_MIN && styles.stepperButtonDisabled]}
            onPress={decrementSeats}
            disabled={vehicle.seats <= SEATS_MIN}
            accessibilityRole="button"
            accessibilityLabel="Decrease seats"
            testID="seats-decrement"
          >
            <Ionicons
              name="remove"
              size={18}
              color={vehicle.seats <= SEATS_MIN ? Colors.textTertiary : Colors.primary}
            />
          </TouchableOpacity>
          <Text style={styles.stepperValue} testID="seats-value">{vehicle.seats}</Text>
          <TouchableOpacity
            style={[styles.stepperButton, vehicle.seats >= SEATS_MAX && styles.stepperButtonDisabled]}
            onPress={incrementSeats}
            disabled={vehicle.seats >= SEATS_MAX}
            accessibilityRole="button"
            accessibilityLabel="Increase seats"
            testID="seats-increment"
          >
            <Ionicons
              name="add"
              size={18}
              color={vehicle.seats >= SEATS_MAX ? Colors.textTertiary : Colors.primary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── A/C toggle ──────────────────────────────────────────────────────── */}
      <View style={styles.rowCard}>
        <View style={styles.rowCardContent}>
          <Ionicons name="snow-outline" size={20} color={Colors.primary} />
          <Text style={styles.rowCardLabel}>Air conditioning</Text>
        </View>
        <Switch
          value={vehicle.hasAC}
          onValueChange={(v) => setField('hasAC', v)}
          trackColor={{ false: TOGGLE_TRACK_OFF, true: TOGGLE_TRACK_ON }}
          thumbColor={Platform.OS === 'android' ? Colors.surface : undefined}
          testID="ac-toggle"
          accessibilityRole="switch"
          accessibilityLabel="Air conditioning"
          accessibilityState={{ checked: vehicle.hasAC }}
        />
      </View>

      {/* ── Dashcam toggle ──────────────────────────────────────────────────── */}
      <View style={styles.rowCard}>
        <View style={styles.rowCardContent}>
          <Ionicons name="videocam-outline" size={20} color={Colors.primary} />
          <Text style={styles.rowCardLabel}>Dashcam fitted</Text>
        </View>
        <Switch
          value={vehicle.dashcam}
          onValueChange={(v) => setField('dashcam', v)}
          trackColor={{ false: TOGGLE_TRACK_OFF, true: TOGGLE_TRACK_ON }}
          thumbColor={Platform.OS === 'android' ? Colors.surface : undefined}
          testID="dashcam-toggle"
          accessibilityRole="switch"
          accessibilityLabel="Dashcam fitted"
          accessibilityState={{ checked: vehicle.dashcam }}
        />
      </View>

      {/* ── Error ───────────────────────────────────────────────────────────── */}
      {saveError ? (
        <Text style={styles.errorText} testID="save-error">{saveError}</Text>
      ) : null}

      {/* ── Save ────────────────────────────────────────────────────────────── */}
      <Button
        title={isSaving ? 'Saving…' : 'Save vehicle'}
        onPress={handleSave}
        disabled={isSaving}
        style={styles.saveButton}
        testID="save-button"
      />
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.xxxl + Spacing.xl,
    paddingBottom: Spacing.xxxxxl,
    gap: Spacing.md,
  },
  centerState: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  screenTitle: {
    ...Typography.headingLarge,
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: { width: 24 },

  iconSection: {
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  carIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  fieldCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.large,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
    padding: Spacing.cardPadding,
    gap: Spacing.md,
  },
  field: {},
  fieldRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  fieldHalf: { flex: 1 },
  fieldLabel: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },

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
  rowCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  rowCardLabel: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
  },

  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.medium,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonDisabled: {
    backgroundColor: Colors.border,
  },
  stepperValue: {
    ...Typography.headingMedium,
    color: Colors.textPrimary,
    minWidth: 24,
    textAlign: 'center',
  },

  errorText: {
    ...Typography.bodySmall,
    color: Colors.sos,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  saveButton: {
    marginTop: Spacing.sm,
  },
});
