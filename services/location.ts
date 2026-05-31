/**
 * services/location.ts
 *
 * Stage 47 — Real-time location tracking service.
 * Wraps expo-location and writes position updates to a Supabase Realtime channel.
 */

import * as ExpoLocation from 'expo-location';
import { supabase } from '../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LocationUpdate {
  lat:       number;
  lng:       number;
  accuracy:  number | null;
  timestamp: number;
}

// ─── Module state ─────────────────────────────────────────────────────────────

let _subscription: ExpoLocation.LocationSubscription | null = null;
let _channelName:  string | null = null;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Request location permissions and start tracking.
 * Publishes updates to a Supabase Realtime channel named `trip:{tripId}`.
 */
export async function startTracking(tripId: string): Promise<void> {
  const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Location permission denied. Please enable it in Settings.');
  }

  _channelName = `trip:${tripId}`;

  _subscription = await ExpoLocation.watchPositionAsync(
    {
      accuracy:           ExpoLocation.Accuracy.High,
      timeInterval:       5000,   // every 5 seconds
      distanceInterval:   10,     // or every 10 metres
    },
    (location) => {
      const update: LocationUpdate = {
        lat:       location.coords.latitude,
        lng:       location.coords.longitude,
        accuracy:  location.coords.accuracy,
        timestamp: location.timestamp,
      };
      void supabase.channel(_channelName!).send({
        type:    'broadcast',
        event:   'location',
        payload: update,
      });
    },
  );
}

/**
 * Stop location tracking and unsubscribe from the channel.
 */
export function stopTracking(): void {
  _subscription?.remove();
  _subscription = null;
  if (_channelName) {
    void supabase.removeChannel(supabase.channel(_channelName));
    _channelName = null;
  }
}

/**
 * Get the device's current location once.
 */
export async function getCurrentLocation(): Promise<LocationUpdate> {
  const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Location permission denied.');
  }
  const location = await ExpoLocation.getCurrentPositionAsync({
    accuracy: ExpoLocation.Accuracy.High,
  });
  return {
    lat:       location.coords.latitude,
    lng:       location.coords.longitude,
    accuracy:  location.coords.accuracy,
    timestamp: location.timestamp,
  };
}
