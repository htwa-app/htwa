/**
 * hooks/useNotificationNavigation.ts
 *
 * Opens the right screen when the user TAPS a notification — local (foreground
 * fallback) or a real push. Before this existed a tap on "Booking confirmed"
 * just opened the app on whatever screen it was last on, so the passenger had
 * no obvious path to the Pay button (ride detail → Pay is the only way into
 * /payment). Mounted once in the tabs layout, i.e. only for a signed-in user.
 *
 * Handles both a tap while the app is running (listener) and the tap that
 * launched the app from killed (getLastNotificationResponse), clearing the
 * stored response so it isn't replayed on the next mount.
 */

import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { resolveNotificationRoute } from '../utils/notificationRouting';

export function useNotificationNavigation(): void {
  const router = useRouter();

  useEffect(() => {
    const open = (response: Notifications.NotificationResponse | null): void => {
      try {
        const route = resolveNotificationRoute(response?.notification.request.content.data);
        if (route) router.push(route as never);
      } catch (e) {
        // A bad payload must never crash the app on a tap.
        console.error('[NotificationNav] could not open notification:', e instanceof Error ? e.message : e);
      }
    };

    // Cold start: the tap that launched the app.
    try {
      const initial = Notifications.getLastNotificationResponse();
      if (initial) {
        open(initial);
        Notifications.clearLastNotificationResponse();
      }
    } catch (e) {
      console.error('[NotificationNav] initial response lookup failed:', e instanceof Error ? e.message : e);
    }

    const sub = Notifications.addNotificationResponseReceivedListener((response) => open(response));
    return () => sub.remove();
  }, [router]);
}
