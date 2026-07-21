/**
 * components/WaiverAcceptance.tsx
 *
 * Journey Verification & Safety Responsibility Acknowledgment (2A-d).
 * Renders the full waiver text (verbatim from legal/) with a checkbox; the
 * parent flow cannot proceed until `accepted` is true. The parent records the
 * acceptance row via services/waivers.recordWaiverAcceptance at commit time.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';
import {
  DRIVER_WAIVER_CHECKBOX,
  DRIVER_WAIVER_SECTIONS,
  PASSENGER_WAIVER_CHECKBOX,
  PASSENGER_WAIVER_SECTIONS,
  PASSENGER_WAIVER_TITLE,
} from '../constants/legalWaiver';
import type { WaiverRole } from '../types/database';

interface Props {
  role: WaiverRole;
  accepted: boolean;
  onChange: (accepted: boolean) => void;
  testID?: string;
}

export function WaiverAcceptance({ role, accepted, onChange, testID }: Props): React.ReactElement {
  const sections = role === 'passenger' ? PASSENGER_WAIVER_SECTIONS : DRIVER_WAIVER_SECTIONS;
  const checkboxLabel = role === 'passenger' ? PASSENGER_WAIVER_CHECKBOX : DRIVER_WAIVER_CHECKBOX;

  return (
    <View style={styles.card} testID={testID ?? 'waiver-acceptance'}>
      <Text style={styles.title}>{PASSENGER_WAIVER_TITLE}</Text>
      <Text style={styles.intro}>
        {role === 'passenger'
          ? 'Before you confirm this booking, you must read and accept the following:'
          : 'Before you post this journey, you must confirm:'}
      </Text>
      {sections.map((s) => (
        <View key={s.heading} style={styles.section}>
          <Text style={styles.heading}>{s.heading}</Text>
          <Text style={styles.body}>{s.body}</Text>
        </View>
      ))}
      <TouchableOpacity
        style={styles.checkboxRow}
        onPress={() => onChange(!accepted)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: accepted }}
        accessibilityLabel={checkboxLabel}
        testID="waiver-checkbox"
      >
        <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
          {accepted && <Ionicons name="checkmark" size={14} color={Colors.surface} />}
        </View>
        <Text style={styles.checkboxLabel}>{checkboxLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.large,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.cardPadding, gap: Spacing.md,
  },
  title: { ...Typography.headingSmall, color: Colors.textPrimary },
  intro: { ...Typography.bodySmall, color: Colors.textSecondary },
  section: { gap: Spacing.xs },
  heading: { ...Typography.bodyMedium, color: Colors.textPrimary },
  body: { ...Typography.bodySmall, color: Colors.textSecondary },
  checkboxRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  checkbox: {
    width: 22, height: 22, borderRadius: BorderRadius.small,
    borderWidth: 2, borderColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  checkboxChecked: { backgroundColor: Colors.primary },
  checkboxLabel: { ...Typography.bodySmall, color: Colors.textPrimary, flex: 1 },
});
