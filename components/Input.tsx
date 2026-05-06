/**
 * components/Input.tsx
 *
 * Text input field per DESIGN-SPEC.md §6.3.
 * Manages its own focused state and changes the border colour from
 * Colors.border → Colors.primary on focus.
 *
 * Usage:
 *   <Input placeholder="Where to?" value={to} onChangeText={setTo} />
 *   <Input label="Email" error="Required" value={email} onChangeText={setEmail} />
 *
 * For style assertions in tests, pass `containerTestID` to target the
 * bordered wrapper View (the element whose borderColor changes on focus).
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  StyleProp,
  ViewStyle,
  NativeSyntheticEvent,
  TextInputFocusEventData,
} from 'react-native';
import { Colors, FontFamily, Typography, Spacing, BorderRadius } from '../constants/theme';

// ─── Spec-local constants ─────────────────────────────────────────────────────

/** DESIGN-SPEC §6.3 — border width for the input field */
const INPUT_BORDER_WIDTH = 1.5;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InputProps extends TextInputProps {
  /** Optional label rendered above the input. */
  label?: string;
  /** Optional error message rendered below the input in red (Colors.sos). */
  error?: string;
  /** testID for the bordered wrapper View — use this to assert border-colour changes. */
  containerTestID?: string;
  /** Optional override for the outer layout wrapper. */
  wrapperStyle?: StyleProp<ViewStyle>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Input({
  label,
  error,
  containerTestID,
  wrapperStyle,
  style,
  onFocus,
  onBlur,
  ...rest
}: InputProps): React.ReactElement {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  return (
    <View style={wrapperStyle}>
      {label != null ? <Text style={styles.label}>{label}</Text> : null}

      {/* Bordered wrapper — borderColor changes on focus */}
      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputContainerFocused,
        ]}
        testID={containerTestID}
      >
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={Colors.textTertiary}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...rest}
        />
      </View>

      {error != null ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export default Input;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  label: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },

  inputContainer: {
    height: Spacing.inputHeight,            // 52 px
    backgroundColor: Colors.surface,        // #FFFFFF
    borderWidth: INPUT_BORDER_WIDTH,        // 1.5 px
    borderColor: Colors.border,             // rgba(40,30,20,0.10) — unfocused
    borderRadius: BorderRadius.medium,      // 12 px
    paddingHorizontal: Spacing.cardPadding, // 16 px
    justifyContent: 'center',
  },

  inputContainerFocused: {
    borderColor: Colors.primary,            // #1F7A78 — focused
  },

  input: {
    flex: 1,
    fontSize: Typography.bodyLarge.fontSize,  // 16 px
    fontFamily: FontFamily.regular,           // Poppins 400
    color: Colors.textPrimary,
    padding: 0,                               // removes default Android padding
  },

  error: {
    ...Typography.bodySmall,
    color: Colors.sos,
    marginTop: Spacing.xs,
  },
});
