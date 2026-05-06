/**
 * components/Avatar.tsx
 *
 * Circular avatar per DESIGN-SPEC.md §6.9.
 * Shows initials (up to 2 characters) or an image when `imageUri` is supplied.
 *
 * Spec-local constants:
 *   INITIALS_FONT_SIZE (14 px) — §6.9 specifies "Poppins 14px 600" which maps
 *     to Typography.buttonSmall (14/600) but is declared explicitly here so the
 *     spec reference is clear.
 *   AVATAR_BORDER_WIDTH (2 px) — §6.9 "Border: 2px solid #FFFFFF"
 *   AVATAR_DEFAULT_SIZE (40 px) — not specified in the spec; a sensible default.
 *
 * Usage:
 *   <Avatar initials="JM" />
 *   <Avatar initials="SR" color="lavender" size={56} />
 *   <Avatar initials="JM" imageUri="https://..." />
 */

import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Colors, FontFamily, Shadows } from '../constants/theme';

// ─── Spec-local constants ─────────────────────────────────────────────────────

/** DESIGN-SPEC §6.9 — initials: Poppins 14px 600 */
const INITIALS_FONT_SIZE = 14;
/** DESIGN-SPEC §6.9 — border: 2px solid #FFFFFF (Colors.surface) */
const AVATAR_BORDER_WIDTH = 2;
/** DESIGN-SPEC §6.9 — no explicit size; 40 px is the default */
const AVATAR_DEFAULT_SIZE = 40;

// ─── Types ────────────────────────────────────────────────────────────────────

export type AvatarColor = 'primary' | 'lavender';

export interface AvatarProps {
  /** 1–2 characters shown when no imageUri is provided. */
  initials: string;
  /** Diameter in pixels. Defaults to 40. */
  size?: number;
  /** Background colour token. Defaults to `primary`. */
  color?: AvatarColor;
  /** When supplied the image is shown instead of initials. */
  imageUri?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Avatar({
  initials,
  size = AVATAR_DEFAULT_SIZE,
  color = 'primary',
  imageUri,
  style,
  testID,
}: AvatarProps): React.ReactElement {
  const bgColor = color === 'primary' ? Colors.primary : Colors.lavender;

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bgColor,
        },
        style,
      ]}
      testID={testID}
    >
      {imageUri != null ? (
        <Image
          source={{ uri: imageUri }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          accessibilityIgnoresInvertColors
          testID={testID != null ? `${testID}-image` : undefined}
        />
      ) : (
        <Text style={styles.initials}>
          {initials.toUpperCase().slice(0, 2)}
        </Text>
      )}
    </View>
  );
}

export default Avatar;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    borderWidth: AVATAR_BORDER_WIDTH,
    borderColor: Colors.surface,           // 2 px white border
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',                    // clips image to circle
    ...Shadows.card,                       // standard card shadow
  },
  initials: {
    color: Colors.surface,                 // white text
    fontSize: INITIALS_FONT_SIZE,          // 14 px
    fontFamily: FontFamily.semiBold,       // Poppins 600
    lineHeight: INITIALS_FONT_SIZE * 1.4,  // 19.6 → comfortable cap-height
  },
});
