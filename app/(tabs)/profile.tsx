/**
 * app/(tabs)/profile.tsx
 *
 * Profile tab stub — placeholder until Stage 21 (Profile screen).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography } from '../../constants/theme';

export default function ProfileScreen(): React.ReactElement {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Profile</Text>
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
