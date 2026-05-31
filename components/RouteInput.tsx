/**
 * components/RouteInput.tsx
 *
 * From → To route input per DESIGN-SPEC §9.2 — a white card with a teal "from"
 * dot, an amber "to" dot, and a swap button.
 *
 * ⚠️ STUB (Stage 27 partial): plain text inputs for now. Google Places
 * autocomplete is DEFERRED until the Google Maps API key is available — at
 * which point the two TextInputs become autocomplete fields and `*_coords` get
 * populated. The public props are designed so that upgrade needs no caller
 * changes.
 *
 * Spec-local constants mirror app/home.tsx's inline route input for visual
 * consistency (this component will eventually replace that inline markup).
 */

import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  FontFamily,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
} from '../constants/theme';

// ─── Spec-local constants (match app/home.tsx §9.2) ───────────────────────────
const ROUTE_DOT_SIZE = 10;

export interface RouteInputProps {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  fromPlaceholder?: string;
  toPlaceholder?: string;
  testID?: string;
}

export function RouteInput({
  from,
  to,
  onFromChange,
  onToChange,
  fromPlaceholder = 'From',
  toPlaceholder = 'To',
  testID = 'route-input',
}: RouteInputProps): React.ReactElement {
  const handleSwap = () => {
    // Swap the two values; parent owns state.
    onFromChange(to);
    onToChange(from);
  };

  return (
    <View style={styles.card} testID={testID}>
      <View style={styles.fields}>
        <View style={styles.row}>
          <View style={[styles.dot, styles.dotFrom]} />
          <TextInput
            style={styles.input}
            value={from}
            onChangeText={onFromChange}
            placeholder={fromPlaceholder}
            placeholderTextColor={Colors.textTertiary}
            accessibilityLabel="Journey start location"
            testID={`${testID}-from`}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <View style={[styles.dot, styles.dotTo]} />
          <TextInput
            style={styles.input}
            value={to}
            onChangeText={onToChange}
            placeholder={toPlaceholder}
            placeholderTextColor={Colors.textTertiary}
            accessibilityLabel="Journey destination"
            testID={`${testID}-to`}
          />
        </View>
      </View>

      <TouchableOpacity
        style={styles.swapButton}
        onPress={handleSwap}
        accessibilityRole="button"
        accessibilityLabel="Swap start and destination"
        testID={`${testID}-swap`}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="swap-vertical" size={20} color={Colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

export default RouteInput;

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.large,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
    paddingHorizontal: Spacing.cardPadding,
    paddingVertical: Spacing.sm,
  },
  fields: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: Spacing.inputHeight - Spacing.sm,
  },
  dot: {
    width: ROUTE_DOT_SIZE,
    height: ROUTE_DOT_SIZE,
    borderRadius: ROUTE_DOT_SIZE / 2,
    marginRight: Spacing.md,
  },
  dotFrom: { backgroundColor: Colors.primary }, // teal — origin
  dotTo: { backgroundColor: Colors.amber },     // orange — destination
  input: {
    flex: 1,
    fontSize: Typography.bodyLarge.fontSize,
    fontFamily: FontFamily.regular,
    color: Colors.textPrimary,
    padding: 0,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: ROUTE_DOT_SIZE + Spacing.md,
  },
  swapButton: {
    marginLeft: Spacing.sm,
    padding: Spacing.xs,
  },
});
