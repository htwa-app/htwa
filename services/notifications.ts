/**
 * services/notifications.ts
 *
 * Stage 58/59 — Push notification triggers.
 *
 * `buildNotification` is the pure, testable core that maps a trigger + params to
 * a title/body/data payload. The `notify*` helpers build + dispatch a LOCAL
 * notification — this only fires while the app is foregrounded, so it remains
 * the fallback path for that case.
 *
 * For backgrounded/killed-app delivery, `sendPushToUser` calls the `send-push`
 * Edge Function, which relays through Expo's push service to FCM/APNs using
 * the credentials attached via `eas credentials` (see BLOCKERS-FOR-JORDAN.md).
 * `registerForPushNotifications` + `savePushToken` handle getting a token onto
 * the device and persisting it server-side; both are called together from
 * `hooks/usePushTokenRegistration`, mounted once the user is signed in.
 *
 * Native setup (app.json) + a real Expo push token require the device build;
 * `registerForPushNotifications` no-ops gracefully when permission is denied.
 */

import * as Notifications from 'expo-notifications';
import { supabase } from '../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationTrigger =
  | 'booking_request'
  | 'booking_accepted'
  | 'booking_declined'
  | 'trip_starting_soon'
  | 'trip_completed'
  | 'new_review';

export interface NotificationContent {
  title: string;
  body:  string;
  data:  Record<string, unknown>;
}

export interface NotificationParams {
  /** Other party's display name, where relevant. */
  name?:  string;
  /** Route label, e.g. "Galway → Dublin". */
  route?: string;
  /** Star rating (new_review). */
  rating?: number;
  /** IDs to route the tap (bookingId / rideId). */
  bookingId?: string;
  rideId?:    string;
}

// ─── Pure core ──────────────────────────────────────────────────────────────

/**
 * Map a trigger + params to a notification payload. Pure and deterministic.
 */
export function buildNotification(
  trigger: NotificationTrigger,
  params: NotificationParams = {},
): NotificationContent {
  const { name, route, rating, bookingId, rideId } = params;
  const data = { trigger, bookingId, rideId };

  switch (trigger) {
    case 'booking_request':
      return {
        title: 'New ride request',
        body:  `${name ?? 'A passenger'} wants to join${route ? ` your ${route} ride` : ' your ride'}.`,
        data,
      };
    case 'booking_accepted':
      return {
        title: 'Booking confirmed 🎉',
        body:  `${name ?? 'The driver'} accepted your request${route ? ` for ${route}` : ''}.`,
        data,
      };
    case 'booking_declined':
      return {
        title: 'Booking declined',
        body:  `Your request${route ? ` for ${route}` : ''} wasn't accepted this time.`,
        data,
      };
    case 'trip_starting_soon':
      return {
        title: 'Your trip starts soon',
        body:  `${route ?? 'Your journey'} is starting soon. Time to head off!`,
        data,
      };
    case 'trip_completed':
      return {
        title: 'Trip complete',
        body:  `Hope ${route ? `your ${route} trip` : 'your trip'} went well. Leave a quick rating?`,
        data,
      };
    case 'new_review':
      return {
        title: 'You got a new review ⭐',
        body:  rating
          ? `${name ?? 'Someone'} rated you ${rating} star${rating === 1 ? '' : 's'}.`
          : `${name ?? 'Someone'} left you a review.`,
        data,
      };
  }
}

// ─── Registration ─────────────────────────────────────────────────────────────

/**
 * Request notification permission and return the Expo push token, or null when
 * permission is denied / unavailable (e.g. simulator).
 */
export async function registerForPushNotifications(): Promise<string | null> {
  const settings = await Notifications.getPermissionsAsync();
  let granted = settings.granted;
  if (!granted) {
    const request = await Notifications.requestPermissionsAsync();
    granted = request.granted;
  }
  if (!granted) return null;
  try {
    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch {
    return null;
  }
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────

/**
 * Deliver a notification. Currently a local notification; swap for a server
 * push send in Phase 15 without touching callers.
 */
export async function sendNotification(content: NotificationContent): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title: content.title, body: content.body, data: content.data },
    trigger: null, // immediate
  });
}

// ─── Trigger helpers ──────────────────────────────────────────────────────────

export const notifyBookingRequest   = (p: NotificationParams) => sendNotification(buildNotification('booking_request', p));
export const notifyBookingAccepted  = (p: NotificationParams) => sendNotification(buildNotification('booking_accepted', p));
export const notifyBookingDeclined  = (p: NotificationParams) => sendNotification(buildNotification('booking_declined', p));
export const notifyTripStartingSoon = (p: NotificationParams) => sendNotification(buildNotification('trip_starting_soon', p));
export const notifyTripCompleted    = (p: NotificationParams) => sendNotification(buildNotification('trip_completed', p));
export const notifyNewReview        = (p: NotificationParams) => sendNotification(buildNotification('new_review', p));

// ─── Server-side push (backgrounded/killed-app delivery) ──────────────────────

/**
 * Persist the device's Expo push token so the send-push Edge Function can
 * reach this user later. Called after registerForPushNotifications() returns
 * a token; a failure here is logged, not thrown — it degrades to "no push
 * this session," never blocks the screen that triggered registration.
 */
export async function savePushToken(userId: string, token: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ expo_push_token: token })
      .eq('user_id', userId);
    if (error) console.error('[Notifications] savePushToken failed:', error.message);
  } catch (e) {
    console.error('[Notifications] savePushToken threw:', e instanceof Error ? e.message : e);
  }
}

/**
 * Ask the send-push Edge Function to push-notify another user (e.g. the
 * driver on a new booking request, or a passenger on accept/decline). This is
 * always a secondary effect fired after the primary DB write has already
 * committed — per CLAUDE.md §12, a failure here is logged, never surfaced as
 * an overall failure of the action that triggered it.
 */
export async function sendPushToUser(
  targetUserId: string,
  trigger: NotificationTrigger,
  params: NotificationParams = {},
): Promise<void> {
  const { title, body, data } = buildNotification(trigger, params);
  return sendRawPushToUser(targetUserId, title, body, data);
}

/**
 * Same delivery path as sendPushToUser, for callers with content that isn't
 * one of the fixed NotificationTrigger shapes (currently: SOS/off-course
 * safety alerts, whose wording is built in services/tracking.ts to match
 * hooks/useRealtimeNotifications' local-notification copy exactly).
 */
export async function sendRawPushToUser(
  targetUserId: string,
  title: string,
  body: string,
  data: Record<string, unknown> = {},
): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('send-push', {
      body: { userId: targetUserId, title, body, data },
    });
    if (error) console.error('[Notifications] sendRawPushToUser failed:', error.message);
  } catch (e) {
    console.error('[Notifications] sendRawPushToUser threw:', e instanceof Error ? e.message : e);
  }
}
