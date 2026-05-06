/**
 * components/Text.tsx
 *
 * Drop-in replacement for React Native's Text that wires every typographic
 * variant from DESIGN-SPEC.md §2 to the correct Poppins weight and size.
 *
 * Usage:
 *   <Text variant="headingLarge">Section title</Text>
 *   <Text variant="bodySmall" style={{ color: Colors.primary }} numberOfLines={2}>...</Text>
 *
 * All font values come exclusively from constants/theme.ts — no magic numbers here.
 *
 * Font loading:
 *   Poppins is declared here (self-contained component) via useFonts.
 *   In a running app the fonts are already cached by app/_layout.tsx, so
 *   useFonts returns [true, null] synchronously.  In isolation (e.g. tests)
 *   the component falls back to the system font until fonts are ready.
 */

import React from 'react';
import { Text as RNText, TextProps, TextStyle } from 'react-native';
import { useFonts } from 'expo-font';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { Typography } from '../constants/theme';

// ─── Public types ─────────────────────────────────────────────────────────────

/** Every typographic variant defined in DESIGN-SPEC.md §2. */
export type TextVariant = keyof typeof Typography;

export interface HTWATextProps extends TextProps {
  /**
   * Typographic variant from DESIGN-SPEC.md §2.
   * Defaults to `bodyMedium` when omitted.
   */
  variant?: TextVariant;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Text — HTWA design-system text primitive.
 *
 * Accepts all standard React Native Text props.  The `variant` prop selects
 * a complete typographic style (fontSize, fontFamily, lineHeight) from the
 * theme.  Any `style` prop is merged *after* the variant, so callers can
 * override colour, margin, etc. without losing the font styles.
 */
export function Text({
  variant = 'bodyMedium',
  style,
  children,
  ...rest
}: HTWATextProps): React.ReactElement {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  // Pull the complete style object for this variant from the theme.
  const variantStyle = Typography[variant];

  // While fonts are loading fall back to system font (avoids a blank render).
  // In practice _layout.tsx pre-loads fonts, so this branch is never visible
  // to the user — but it keeps the component safe in isolation.
  const resolvedVariantStyle: TextStyle = fontsLoaded
    ? (variantStyle as TextStyle)
    : ({ ...variantStyle, fontFamily: undefined } as TextStyle);

  return (
    <RNText style={[resolvedVariantStyle, style]} {...rest}>
      {children}
    </RNText>
  );
}

export default Text;
