/**
 * services/notifications.ts
 *
 * Stage 58/59 — Push notification triggers.
 *
 * `buildNotification` is the pure, testable core that maps a trigger + params to
 * a title/body/data payload. The `notify*` helpers build + dispatch. Actual
 * delivery uses expo-notifications locally; server-driven push (Expo push
 * service / APNs / FCM) is wired in Phase 15 once a backend sender exists — the
 * `sendNotification` indirection keeps that swap a one-line change.
 *
 * Native setup (app.json) + a real Expo push token require the device build;
 * `registerForPushNotifications` no-ops gracefully when permission is denied.
 */

import * as Notifications from 'expo-notifications';

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
