/**
 * components/Chip.tsx
 *
 * Chip / tag per DESIGN-SPEC.md §6.6.
 * Renders as a pressable TouchableOpacity when `onPress` is supplied, or a
 * plain View otherwise.  All style values come from constants/theme.ts.
 *
 * The 28 px fixed height is component-specific (not in Spacing) so it is
 * declared as a named local constant.
 *
 * Usage:
 *   <Chip label="Today" />
 *   <Chip label="Any time" onPress={() => setFilter('time')} />
 */

import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Colors, Typography, BorderRadius, Spacing } from '../constants/theme';

// ─── Spec-local constants ─────────────────────────────────────────────────────

/** DESIGN-SPEC §6.6 — chip fixed height (not in Spacing scale) */
const CHIP_HEIGHT = 28;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChipProps {
  label: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Chip({ label, onPress, style, testID }: ChipProps): React.ReactElement {
  const content = <Text style={styles.label}>{label}</Text>;

  if (onPress != null) {
    return (
      <TouchableOpacity
        style={[styles.chip, style]}
        onPress={onPress}
        activeOpacity={0.75}
        accessibilityRole="button"
        testID={testID}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.chip, style]} testID={testID}>
      {content}
    </View>
  );
}

export default Chip;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  chip: {
    height: CHIP_HEIGHT,                 // 28 px
    backgroundColor: Colors.primaryLight, // #E8F4F4
    borderRadius: BorderRadius.full,      // 999 px — full pill
    paddingHorizontal: Spacing.md,        // 12 px horizontal padding
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...Typography.label,                  // 12 px / Poppins 500 / lh 17
    color: Colors.primary,                // #1F7A78
  },
});
