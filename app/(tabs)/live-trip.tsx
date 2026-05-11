/**
 * app/(tabs)/live-trip.tsx
 *
 * Live Trip tab stub — placeholder until Stage 48 (Live Trip screen).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography } from '../../constants/theme';

export default function LiveTripScreen(): React.ReactElement {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>You don&apos;t have an active journey right now</Text>
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
    ...Typography.bodyLarge,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
