/**
 * components/Badge.tsx
 *
 * Two badge variants per DESIGN-SPEC.md:
 *   verified  — §6.5  green pill with white tick + "Verified" label
 *   womenOnly — §6.7  lavender pill with "Women only" label
 *
 * Spec-local constants:
 *   VERIFIED_FONT_SIZE (11 px) — §6.5 calls for 11 px, which isn't in the
 *     Typography scale, so it is declared as a named constant here.
 *   WOMEN_ONLY_TEXT_COLOR (#2A1F4A) — §6.7 specifies this deep-purple that
 *     isn't part of the §1 brand palette.
 *
 * Usage:
 *   <Badge variant="verified" />
 *   <Badge variant="womenOnly" style={{ marginLeft: 8 }} />
 */

import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Colors, FontFamily, Typography, BorderRadius, Spacing } from '../constants/theme';

// ─── Spec-local constants ─────────────────────────────────────────────────────

/** DESIGN-SPEC §6.5 — verified label font size (not in Typography scale) */
const VERIFIED_FONT_SIZE = 11;
/** DESIGN-SPEC §6.7 — women-only text colour (not in §1 colour palette) */
const WOMEN_ONLY_TEXT_COLOR = '#2A1F4A';

// ─── Types ────────────────────────────────────────────────────────────────────

export type BadgeVariant = 'verified' | 'womenOnly';

export interface BadgeProps {
  variant: BadgeVariant;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Badge({ variant, style, testID }: BadgeProps): React.ReactElement {
  if (variant === 'verified') {
    return (
      <View style={[styles.verifiedContainer, style]} testID={testID}>
        <Text style={styles.verifiedTick} accessibilityHidden>✓</Text>
        <Text style={styles.verifiedLabel}>Verified</Text>
      </View>
    );
  }

  // variant === 'womenOnly'
  return (
    <View style={[styles.womenOnlyContainer, style]} testID={testID}>
      <Text style={styles.womenOnlyLabel}>Women only</Text>
    </View>
  );
}

export default Badge;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Verified ───────────────────────────────────────────────────────────────
  verifiedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',              // shrink-wrap to content
    backgroundColor: Colors.verified,    // #34C759
    borderRadius: BorderRadius.full,      // pill shape
    paddingVertical: Spacing.xs,          // 4 px
    paddingHorizontal: Spacing.sm,        // 8 px
  },
  verifiedTick: {
    color: Colors.surface,               // white
    fontSize: VERIFIED_FONT_SIZE,        // 11 px
    fontFamily: FontFamily.medium,       // Poppins 500
  },
  verifiedLabel: {
    color: Colors.surface,               // white
    fontSize: VERIFIED_FONT_SIZE,        // 11 px
    fontFamily: FontFamily.medium,       // Poppins 500
    marginLeft: Spacing.xs,              // 4 px gap after tick
  },

  // ── Women-only ─────────────────────────────────────────────────────────────
  womenOnlyContainer: {
    alignSelf: 'flex-start',             // shrink-wrap to content
    backgroundColor: Colors.lavender,   // #C8B8E8
    borderRadius: BorderRadius.full,     // pill shape
    paddingVertical: Spacing.xs,         // 4 px
    paddingHorizontal: Spacing.md,       // 12 px
  },
  womenOnlyLabel: {
    ...Typography.label,                 // 12 px / Poppins 500 / lh 17
    color: WOMEN_ONLY_TEXT_COLOR,        // #2A1F4A
  },
});
