/**
 * components/RouteMapPlaceholder.tsx
 *
 * ⚠️ STUB: stands in for the route map until the Google Maps API key is
 * available. Shows the from → to route textually on a muted on-brand surface.
 * Screens (Ride Detail §9.3, Live Trip §9.4) use this so layout/flow are
 * complete now; swap for the real MapView when Maps is wired up.
 */

import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
} from '../constants/theme';

export interface RouteMapPlaceholderProps {
  from: string;
  to: string;
  /** Map area height. Defaults to 180. */
  height?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function RouteMapPlaceholder({
  from,
  to,
  height = 180,
  style,
  testID = 'route-map-placeholder',
}: RouteMapPlaceholderProps): React.ReactElement {
  return (
    <View style={[styles.container, { height }, style]} testID={testID}>
      <Ionicons name="map-outline" size={28} color={Colors.primary} />
      <View style={styles.routeRow}>
        <View style={[styles.dot, styles.dotFrom]} />
        <Text style={styles.location} numberOfLines={1}>{from}</Text>
        <Ionicons
          name="arrow-forward"
          size={16}
          color={Colors.textTertiary}
          style={styles.arrow}
        />
        <View style={[styles.dot, styles.dotTo]} />
        <Text style={styles.location} numberOfLines={1}>{to}</Text>
      </View>
      <Text style={styles.note}>Live map coming soon</Text>
    </View>
  );
}

export default RouteMapPlaceholder;

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.large,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.cardPadding,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotFrom: { backgroundColor: Colors.primary },
  dotTo: { backgroundColor: Colors.amber },
  location: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
    maxWidth: 110,
  },
  arrow: { marginHorizontal: Spacing.xs },
  note: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
});
