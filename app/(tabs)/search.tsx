/**
 * app/(tabs)/search.tsx
 *
 * Search tab stub — placeholder until Stage 33 (Find a ride screen).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography } from '../../constants/theme';

export default function SearchScreen(): React.ReactElement {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Search</Text>
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
