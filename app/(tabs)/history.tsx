/**
 * app/(tabs)/history.tsx
 *
 * History tab stub — placeholder until Stage 61 (Journey History screen).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography } from '../../constants/theme';

export default function HistoryScreen(): React.ReactElement {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Your trip history will appear here</Text>
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
