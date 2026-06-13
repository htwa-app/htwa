/**
 * components/PriceBreakdown.tsx
 *
 * Block 4E — passenger-facing price. Shows ONE headline total per seat
 * (passengerSeatPrice) with a tappable "View price details" disclosure that
 * breaks it down into base fare + "Service charge" (10%) + "Booking fee" (flat).
 * The line items visibly sum to the headline.
 *
 * This is passenger-only. The DRIVER never sees the service charge, booking fee,
 * or passenger price — only their own driverSeatPrice.
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { passengerPricing } from '../utils/pricingEngine';
import { formatCurrency } from '../utils/currency';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';

export interface PriceBreakdownProps {
  /** The driver's per-seat cost share (base fare). */
  driverSeatPrice: number;
  currency: 'EUR' | 'GBP';
  testID?: string;
}

export function PriceBreakdown({
  driverSeatPrice,
  currency,
  testID = 'price-breakdown',
}: PriceBreakdownProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const { serviceCharge, bookingFee, passengerSeatPrice } = passengerPricing(driverSeatPrice);

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.headlineRow}>
        <Text style={styles.headlineLabel}>Total per seat</Text>
        <Text style={styles.headlineValue} testID={`${testID}-total`}>
          {formatCurrency(passengerSeatPrice, currency)}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.toggle}
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        testID={`${testID}-toggle`}
      >
        <Text style={styles.toggleText}>{open ? 'Hide price details' : 'View price details'}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.primary} />
      </TouchableOpacity>

      {open && (
        <View style={styles.breakdown} testID={`${testID}-details`}>
          <LineItem label="Base fare" value={formatCurrency(driverSeatPrice, currency)} />
          <LineItem label="Service charge (10%)" value={formatCurrency(serviceCharge, currency)} />
          <LineItem label="Booking fee" value={formatCurrency(bookingFee, currency)} />
          <View style={styles.divider} />
          <LineItem label="Total per seat" value={formatCurrency(passengerSeatPrice, currency)} emphasis />
        </View>
      )}
    </View>
  );
}

interface LineItemProps {
  label: string;
  value: string;
  emphasis?: boolean;
}

function LineItem({ label, value, emphasis }: LineItemProps): React.ReactElement {
  return (
    <View style={styles.lineItem}>
      <Text style={[styles.lineLabel, emphasis && styles.lineEmphasis]}>{label}</Text>
      <Text style={[styles.lineValue, emphasis && styles.lineEmphasis]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.large,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.cardPadding,
    gap: Spacing.sm,
  },
  headlineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headlineLabel: { ...Typography.bodyMedium, color: Colors.textSecondary },
  headlineValue: { ...Typography.headingMedium, color: Colors.textPrimary },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  toggleText: { ...Typography.bodySmall, color: Colors.primary },
  breakdown: { gap: Spacing.xs, marginTop: Spacing.xs },
  lineItem: { flexDirection: 'row', justifyContent: 'space-between' },
  lineLabel: { ...Typography.bodySmall, color: Colors.textSecondary },
  lineValue: { ...Typography.bodySmall, color: Colors.textPrimary },
  lineEmphasis: { ...Typography.bodyMedium, color: Colors.textPrimary },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.xs },
});
