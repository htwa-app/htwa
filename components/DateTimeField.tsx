/**
 * components/DateTimeField.tsx
 *
 * Native calendar / clock picker field (@react-native-community/datetimepicker)
 * that keeps the app's existing STRING value contracts so downstream logic
 * (overlap checks, pricing, search filters) is untouched:
 *   - mode "date" → value "YYYY-MM-DD"
 *   - mode "time" → value "HH:MM" (24h)
 *
 * Renders as a tappable field. Android shows its native dialog. iOS renders
 * the spinner inside a CENTRED bottom-sheet modal — the spinner has a fixed
 * intrinsic width (~320pt), so rendering it inline inside a half-width form
 * column pushed it off the right edge of the screen (hands-on round 2, fix #4).
 * The modal is immune to the field's container width.
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Platform, StyleSheet } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';

interface Props {
  mode: 'date' | 'time';
  /** "YYYY-MM-DD" (date) or "HH:MM" (time); '' when unset. */
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** Earliest selectable date (mode "date" only). */
  minimumDate?: Date;
  testID?: string;
}

function toDate(mode: 'date' | 'time', value: string): Date {
  if (mode === 'date') {
    const parsed = new Date(`${value}T12:00:00`);
    if (value && !Number.isNaN(parsed.getTime())) return parsed;
    return new Date();
  }
  const [h, m] = value.split(':').map((n) => parseInt(n, 10));
  const d = new Date();
  if (Number.isFinite(h) && Number.isFinite(m)) d.setHours(h, m, 0, 0);
  return d;
}

function toValue(mode: 'date' | 'time', d: Date): string {
  if (mode === 'date') {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function displayLabel(mode: 'date' | 'time', value: string): string {
  if (!value) return '';
  if (mode === 'time') return value;
  const d = new Date(`${value}T12:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-IE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export function DateTimeField({ mode, value, onChange, placeholder, minimumDate, testID }: Props): React.ReactElement {
  const [open, setOpen] = useState(false);
  const baseTestID = testID ?? `${mode}-field`;

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    // Android's dialog closes itself and fires 'dismissed' on cancel.
    if (Platform.OS === 'android') setOpen(false);
    if (event.type === 'dismissed' || !selected) return;
    onChange(toValue(mode, selected));
  };

  // iOS "Done": the spinner opens already showing today's date / the current
  // time (toDate's fallback for an empty value), but never fires onChange
  // until the user actually scrolls a wheel. Tapping Done immediately closed
  // the sheet with nothing committed — silently rejecting "post/search for
  // right now" even though that's exactly what was on screen. Re-deriving
  // from `value` via toDate/toValue is a no-op if the user did scroll
  // (round-trips the already-committed value) and commits the visible
  // default when they didn't.
  const handleDone = () => {
    onChange(toValue(mode, toDate(mode, value)));
    setOpen(false);
  };

  return (
    <View>
      <TouchableOpacity
        style={styles.field}
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityLabel={value ? `${placeholder}: ${displayLabel(mode, value)}` : placeholder}
        testID={baseTestID}
      >
        <Ionicons
          name={mode === 'date' ? 'calendar-outline' : 'time-outline'}
          size={18}
          color={Colors.textSecondary}
        />
        <Text
          style={[styles.fieldText, !value && styles.placeholderText]}
          testID={`${baseTestID}-value`}
        >
          {value ? displayLabel(mode, value) : placeholder}
        </Text>
      </TouchableOpacity>

      {/* Android: the native dialog presents itself when the picker renders. */}
      {open && Platform.OS !== 'ios' && (
        <DateTimePicker
          value={toDate(mode, value)}
          mode={mode}
          display="default"
          minimumDate={mode === 'date' ? minimumDate : undefined}
          onChange={handleChange}
          testID={`${baseTestID}-picker`}
        />
      )}

      {/* iOS: centred bottom sheet — the spinner's fixed intrinsic width made
          inline rendering overflow narrow containers (round-2 fix #4). */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={open}
          transparent
          animationType="slide"
          onRequestClose={() => setOpen(false)}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setOpen(false)}
            accessibilityLabel="Close picker"
            testID={`${baseTestID}-backdrop`}
          />
          <View style={styles.modalSheet} testID={`${baseTestID}-sheet`}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{placeholder}</Text>
              <TouchableOpacity
                onPress={handleDone}
                accessibilityRole="button"
                testID={`${baseTestID}-done`}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.doneText}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.pickerWrap}>
              <DateTimePicker
                value={toDate(mode, value)}
                mode={mode}
                display="spinner"
                minimumDate={mode === 'date' ? minimumDate : undefined}
                onChange={handleChange}
                testID={`${baseTestID}-picker`}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.medium,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
  },
  fieldText: { ...Typography.bodyMedium, color: Colors.textPrimary, flex: 1 },
  placeholderText: { color: Colors.textTertiary },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingBottom: Spacing.xxxl,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenPadding, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modalTitle: { ...Typography.headingSmall, color: Colors.textPrimary },
  doneText: { ...Typography.bodyMedium, color: Colors.primary },
  // Centres the fixed-width spinner regardless of screen size.
  pickerWrap: { alignItems: 'center', justifyContent: 'center' },
});
