/**
 * hooks/usePushTokenRegistration.ts
 *
 * Registers this device for push notifications and persists the Expo push
 * token on the user's profile, so the send-push Edge Function can reach them
 * for backgrounded/killed-app delivery (see services/notifications.ts).
 * Runs once per signed-in session; a denied permission or simulator (no
 * token available) is a silent no-op, not an error — local notifications
 * (hooks/useRealtimeNotifications) still cover the foregrounded-app case.
 */

import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { registerForPushNotifications, savePushToken } from '../services/notifications';

export function usePushTokenRegistration(): void {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const token = await registerForPushNotifications();
        if (cancelled || !token) return;
        await savePushToken(user.id, token);
      } catch (e) {
        console.error('[PushTokenRegistration] failed:', e instanceof Error ? e.message : e);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);
}
