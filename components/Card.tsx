/**
 * components/Card.tsx
 *
 * Surface container per DESIGN-SPEC.md §6.4.
 * Accepts any children; all visual tokens from constants/theme.ts.
 *
 * Note: The spec gives the card border colour as rgba(40,30,20,0.08), which
 * is intentionally lighter than Colors.border (rgba(40,30,20,0.10)).  Because
 * this value does not appear in the §1 palette it is declared as a named local
 * constant rather than being added to Colors.
 *
 * Usage:
 *   <Card>
 *     <Text variant="headingMedium">Dublin → Galway</Text>
 *   </Card>
 *
 *   <Card style={{ marginTop: 16 }} testID="route-card">...</Card>
 */

import React from 'react';
import { View, StyleSheet, ViewProps, StyleProp, ViewStyle } from 'react-native';
import { Colors, Spacing, BorderRadius, Shadows } from '../constants/theme';

// ─── Spec-local constants ─────────────────────────────────────────────────────

/** DESIGN-SPEC §6.4 — card border colour (0.08 opacity, lighter than Colors.border) */
const CARD_BORDER_COLOR = 'rgba(40,30,20,0.08)';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CardProps extends ViewProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Card({ children, style, ...rest }: CardProps): React.ReactElement {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

export default Card;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,          // #FFFFFF
    borderRadius: BorderRadius.large,         // 16 px
    borderWidth: 1,
    borderColor: CARD_BORDER_COLOR,           // rgba(40,30,20,0.08)
    padding: Spacing.cardPadding,             // 16 px
    ...Shadows.card,                          // shadowColor/Offset/Opacity/Radius + elevation
  },
});
