/**
 * components/DateTimeField.tsx
 *
 * Native calendar / clock picker field (@react-native-community/datetimepicker)
 * that keeps the app's existing STRING value contracts so downstream logic
 * (overlap checks, pricing, search filters) is untouched:
 *   - mode "date" → value "YYYY-MM-DD"
 *   - mode "time" → value "HH:MM" (24h)
 *
 * Renders as a tappable field; the native picker opens on press (Android shows
 * its own dialog; iOS renders an inline spinner below the field while open).
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
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

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    // Android fires 'dismissed' on cancel; the dialog closes itself either way.
    if (Platform.OS === 'android') setOpen(false);
    if (event.type === 'dismissed' || !selected) return;
    onChange(toValue(mode, selected));
  };

  return (
    <View>
      <TouchableOpacity
        style={styles.field}
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityLabel={value ? `${placeholder}: ${displayLabel(mode, value)}` : placeholder}
        testID={testID ?? `${mode}-field`}
      >
        <Ionicons
          name={mode === 'date' ? 'calendar-outline' : 'time-outline'}
          size={18}
          color={Colors.textSecondary}
        />
        <Text
          style={[styles.fieldText, !value && styles.placeholderText]}
          testID={`${testID ?? `${mode}-field`}-value`}
        >
          {value ? displayLabel(mode, value) : placeholder}
        </Text>
      </TouchableOpacity>

      {open && (
        <DateTimePicker
          value={toDate(mode, value)}
          mode={mode}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={mode === 'date' ? minimumDate : undefined}
          onChange={handleChange}
          testID={`${testID ?? `${mode}-field`}-picker`}
        />
      )}
      {open && Platform.OS === 'ios' && (
        <TouchableOpacity
          style={styles.doneBtn}
          onPress={() => setOpen(false)}
          accessibilityRole="button"
          testID={`${testID ?? `${mode}-field`}-done`}
        >
          <Text style={styles.doneText}>Done</Text>
        </TouchableOpacity>
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
  doneBtn: { alignSelf: 'flex-end', paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md },
  doneText: { ...Typography.bodyMedium, color: Colors.primary },
});
