/**
 * app/(tabs)/trips.tsx
 *
 * Trips tab stub — placeholder until Stage 38 (My Rides screen).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography } from '../../constants/theme';

export default function TripsScreen(): React.ReactElement {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Trips</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
  },
});
