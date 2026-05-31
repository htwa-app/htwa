/**
 * utils/connectivity.ts
 *
 * Stage 69 — Network connectivity helper.
 * Thin wrapper over @react-native-community/netinfo so screens can guard network
 * actions and show offline states without each importing NetInfo directly.
 */

import NetInfo from '@react-native-community/netinfo';

/**
 * Resolve whether the device currently has a usable network connection.
 * Treats an unknown/undefined state as offline (conservative).
 */
export async function isConnected(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected === true;
  } catch {
    return false;
  }
}

/**
 * Subscribe to connectivity changes. Returns an unsubscribe function.
 */
export function onConnectivityChange(
  listener: (connected: boolean) => void,
): () => void {
  return NetInfo.addEventListener((state) => listener(state.isConnected === true));
}
