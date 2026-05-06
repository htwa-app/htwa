/**
 * components/Button.tsx
 *
 * Primary and secondary button per DESIGN-SPEC.md §6.1 and §6.2.
 * All values from constants/theme.ts; the one exception is the disabled
 * background colour (#C8C8C8) which appears only in §6.1 and is not part
 * of the §1 palette, so it is declared as a named local constant below.
 *
 * Usage:
 *   <Button title="Search rides" onPress={handleSearch} />
 *   <Button title="Cancel" variant="secondary" onPress={handleCancel} />
 *   <Button title="Unavailable" disabled />
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';

// ─── Spec-local constants ─────────────────────────────────────────────────────
// These values appear in DESIGN-SPEC.md §6.1 / §6.2 but not in the §1 palette.

/** DESIGN-SPEC §6.1 — disabled state background (not a brand colour) */
const DISABLED_BACKGROUND = '#C8C8C8';
/** DESIGN-SPEC §6.1 — horizontal padding on buttons */
const BUTTON_PADDING_HORIZONTAL = Spacing.xxl; // 24 px
/** DESIGN-SPEC §6.2 — secondary button border width */
const SECONDARY_BORDER_WIDTH = 1.5;

// ─── Types ────────────────────────────────────────────────────────────────────

export type ButtonVariant = 'primary' | 'secondary';

export interface ButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  /** Visual variant. Defaults to `primary`. */
  variant?: ButtonVariant;
  /** Button label text. */
  title: string;
  /** When true applies the disabled visual state and suppresses onPress. */
  disabled?: boolean;
  /** Override the outer TouchableOpacity style. */
  style?: StyleProp<ViewStyle>;
  /** Override the label Text style. */
  textStyle?: StyleProp<TextStyle>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Button({
  variant = 'primary',
  title,
  disabled = false,
  onPress,
  style,
  textStyle,
  ...rest
}: ButtonProps): React.ReactElement {
  return (
    <TouchableOpacity
      style={[
        styles.base,
        variant === 'primary' ? styles.primary : styles.secondary,
        disabled && styles.disabled,
        style,
      ]}
      onPress={disabled ? undefined : onPress}
      activeOpacity={disabled ? 1 : 0.85}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      {...rest}
    >
      <Text
        style={[
          styles.label,
          variant === 'primary' ? styles.labelPrimary : styles.labelSecondary,
          disabled && styles.labelDisabled,
          textStyle,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

export default Button;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Container ──────────────────────────────────────────────────────────────
  base: {
    height: Spacing.buttonHeight,          // 52 px
    borderRadius: BorderRadius.full,       // 999 px — full pill
    paddingHorizontal: BUTTON_PADDING_HORIZONTAL,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: Colors.primary,
  },
  secondary: {
    backgroundColor: Colors.primaryLight,
    borderWidth: SECONDARY_BORDER_WIDTH,
    borderColor: Colors.primary,
  },
  disabled: {
    backgroundColor: DISABLED_BACKGROUND,
    borderWidth: 0, // removes secondary border when disabled
  },

  // ── Label ──────────────────────────────────────────────────────────────────
  label: {
    ...Typography.button,
  },
  labelPrimary: {
    color: Colors.surface,
  },
  labelSecondary: {
    color: Colors.primary,
  },
  labelDisabled: {
    color: Colors.surface,
  },
});
