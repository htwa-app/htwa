/**
 * components/JourneyMap.tsx
 *
 * Journey map behind the Google Maps key check. react-native-maps is
 * installed, but without EXPO_PUBLIC_GOOGLE_MAPS_KEY (see
 * BLOCKERS-FOR-JORDAN.md) the map renders as the existing placeholder stub —
 * callers pass the same props either way and light up automatically when the
 * key lands.
 *
 * react-native-maps is require()d lazily so Jest and key-less environments
 * never load the native module.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '../constants/theme';
import { usableMapsKey } from '../services/routes';

export interface JourneyMapProps {
  from?: { lat: number; lng: number } | null;
  to?: { lat: number; lng: number } | null;
  /** Live position marker (e.g. the driver's latest published point). */
  current?: { lat: number; lng: number } | null;
  /** Text shown on the stub under the icon (e.g. live coordinates). */
  stubText?: string;
  style?: object;
  testID?: string;
}

export function mapsAvailable(): boolean {
  // Shares services/routes.ts's placeholder-aware key check — a raw
  // truthiness/nullish check would treat a SET-but-placeholder key as
  // available and try to render the native map with a key that won't work.
  return usableMapsKey() !== null;
}

export function JourneyMap({ from, to, current, stubText, style, testID }: JourneyMapProps): React.ReactElement {
  if (!mapsAvailable()) {
    return (
      <View style={[styles.stub, style]} testID={testID ?? 'journey-map-stub'}>
        <Ionicons name="map-outline" size={48} color={Colors.textTertiary} />
        <Text style={styles.stubText}>{stubText ?? 'Live map'}</Text>
      </View>
    );
  }

  // Key present: render the real map. Lazy-required so the native module is
  // only touched when it can actually be used.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Maps = require('react-native-maps');
  const MapView = Maps.default;
  const { Marker, Polyline } = Maps;

  const points = [from, to].filter((p): p is { lat: number; lng: number } => !!p);
  const centre = current ?? points[0] ?? { lat: 53.35, lng: -7.7 };
  const latitudes = [...points, ...(current ? [current] : [])].map((p) => p.lat);
  const longitudes = [...points, ...(current ? [current] : [])].map((p) => p.lng);
  const latDelta = latitudes.length > 1 ? Math.max(0.05, (Math.max(...latitudes) - Math.min(...latitudes)) * 1.6) : 0.5;
  const lngDelta = longitudes.length > 1 ? Math.max(0.05, (Math.max(...longitudes) - Math.min(...longitudes)) * 1.6) : 0.5;

  return (
    <MapView
      style={[styles.map, style]}
      testID={testID ?? 'journey-map'}
      initialRegion={{
        latitude: centre.lat,
        longitude: centre.lng,
        latitudeDelta: latDelta,
        longitudeDelta: lngDelta,
      }}
    >
      {from && <Marker coordinate={{ latitude: from.lat, longitude: from.lng }} title="Start" pinColor={Colors.primary} />}
      {to && <Marker coordinate={{ latitude: to.lat, longitude: to.lng }} title="Destination" pinColor={Colors.amber} />}
      {current && <Marker coordinate={{ latitude: current.lat, longitude: current.lng }} title="Current position" />}
      {points.length === 2 && (
        <Polyline
          coordinates={points.map((p) => ({ latitude: p.lat, longitude: p.lng }))}
          strokeColor={Colors.primary}
          strokeWidth={3}
        />
      )}
    </MapView>
  );
}

const styles = StyleSheet.create({
  stub: {
    flex: 1, backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  stubText: { ...Typography.bodySmall, color: Colors.textTertiary, marginTop: Spacing.sm, textAlign: 'center', paddingHorizontal: Spacing.xl },
  map: { flex: 1 },
});
