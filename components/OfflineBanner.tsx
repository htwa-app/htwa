/**
 * components/OfflineBanner.tsx
 *
 * Global connectivity banner. Mounted ONCE in the root layout so every screen
 * gets offline awareness without per-screen wiring. Uses
 * @react-native-community/netinfo; renders nothing while online.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '../constants/theme';

export function OfflineBanner(): React.ReactElement | null {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      // isInternetReachable can be null while probing — only trust a hard false.
      setIsOffline(state.isConnected === false || state.isInternetReachable === false);
    });
    return unsubscribe;
  }, []);

  if (!isOffline) return null;

  return (
    <View
      style={styles.banner}
      testID="offline-banner"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Ionicons name="cloud-offline-outline" size={16} color={Colors.surface} />
      <Text style={styles.text}>You're offline — some things won't update until you're back.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.textPrimary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  text: { ...Typography.bodySmall, color: Colors.surface, flexShrink: 1 },
});
