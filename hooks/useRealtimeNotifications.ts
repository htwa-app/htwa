/**
 * hooks/useRealtimeNotifications.ts
 *
 * In-app notification triggers (local delivery until APNs/FCM — see
 * BLOCKERS-FOR-JORDAN.md). Mounted once in the tab layout; while signed in it
 * subscribes to Realtime postgres_changes (RLS-scoped, so each user only
 * receives events their policies let them see) and fires local notifications:
 *
 *  - bookings INSERT on one of MY rides            → "New booking request"
 *  - bookings UPDATE to confirmed/declined (mine)  → "Booking accepted/declined"
 *  - trip_alerts INSERT on a journey I'm contact for → safety alert
 *
 * Respects profiles.notification_prefs (booking_updates / safety_alerts).
 */

import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
  notifyBookingAccepted,
  notifyBookingDeclined,
  notifyBookingRequest,
  sendNotification,
} from '../services/notifications';
import type { BookingRow, TripAlertRow } from '../types/database';

export function useRealtimeNotifications(): void {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    let myRideIds = new Set<string>();
    let contactRideIds = new Set<string>();
    let prefs: Record<string, boolean> = {};
    let cancelled = false;

    const prefOn = (key: string) => prefs[key] ?? true;

    // Prime the id sets the subscriptions filter against. Failures here mean
    // missed notifications, not broken screens — log and carry on.
    void (async () => {
      try {
        const [ridesRes, contactsRes, prefsRes] = await Promise.all([
          supabase.from('rides').select('id').eq('driver_id', user.id).in('status', ['active', 'full', 'in_progress']),
          supabase.from('journey_contacts').select('ride_id').eq('contact_user_id', user.id),
          supabase.from('profiles').select('notification_prefs').eq('user_id', user.id).maybeSingle(),
        ]);
        if (cancelled) return;
        if (ridesRes.error) console.error('[Notifications] rides prime failed:', ridesRes.error.message);
        else myRideIds = new Set((ridesRes.data ?? []).map((r) => r.id));
        if (contactsRes.error) console.error('[Notifications] contacts prime failed:', contactsRes.error.message);
        else contactRideIds = new Set((contactsRes.data ?? []).map((c) => c.ride_id));
        if (prefsRes.error) console.error('[Notifications] prefs load failed:', prefsRes.error.message);
        else prefs = (prefsRes.data?.notification_prefs as Record<string, boolean>) ?? {};
      } catch (e) {
        console.error('[Notifications] prime threw:', e instanceof Error ? e.message : e);
      }
    })();

    const channel = supabase
      .channel(`user-notifications:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bookings' },
        (payload) => {
          const booking = payload.new as BookingRow;
          // RLS delivers my own bookings AND bookings on my rides; only the
          // latter warrant a "new request" notification.
          if (!prefOn('booking_updates')) return;
          if (booking.passenger_id === user.id) return;
          if (!myRideIds.has(booking.ride_id)) return;
          void notifyBookingRequest({});
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `passenger_id=eq.${user.id}` },
        (payload) => {
          if (!prefOn('booking_updates')) return;
          const before = payload.old as Partial<BookingRow>;
          const after = payload.new as BookingRow;
          if (before.status === after.status) return;
          if (after.status === 'confirmed') void notifyBookingAccepted({});
          if (after.status === 'declined') void notifyBookingDeclined({});
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'trip_alerts' },
        (payload) => {
          const alert = payload.new as TripAlertRow;
          if (!prefOn('safety_alerts')) return;
          if (alert.raised_by === user.id) return;           // own alert — no self-notify
          if (!contactRideIds.has(alert.ride_id)) return;    // not my watched journey
          void sendNotification({
            title: alert.alert_type === 'sos' ? 'SOS — your traveller needs you' : 'Journey safety alert',
            body:
              alert.alert_type === 'sos'
                ? 'Your nominated traveller triggered SOS. Open htwa to see their live location. If you can\'t reach them, call 112/999.'
                : 'Your nominated traveller\'s journey went off its planned route. Open htwa to check on them.',
            data: { trigger: 'safety_alert', rideId: alert.ride_id },
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [user]);
}
