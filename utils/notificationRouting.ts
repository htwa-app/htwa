/**
 * utils/notificationRouting.ts
 *
 * Maps a tapped notification's `data` payload (built by
 * services/notifications.ts → buildNotification, and carried unchanged through
 * the send-push Edge Function) to an in-app route. Pure so it's trivially
 * testable. Returns null when there's nothing sensible to open.
 *
 *  - booking_request                         → driver reviews it  (/booking-requests/[rideId])
 *  - booking_accepted / booking_declined     → passenger's ride   (/ride/[id]) — a confirmed
 *    booking shows the Pay button there, which is the only way into /payment
 *  - trip_starting_soon / trip_completed     → the ride           (/ride/[id])
 *
 * IDs are validated before being spliced into a path: the payload comes off the
 * network, so a malformed/malicious value must never become an arbitrary route.
 */

const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;

export function resolveNotificationRoute(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const { trigger, rideId } = data as { trigger?: unknown; rideId?: unknown };
  if (typeof trigger !== 'string' || typeof rideId !== 'string' || !SAFE_ID.test(rideId)) return null;

  switch (trigger) {
    case 'booking_request':
      return `/booking-requests/${rideId}`;
    case 'booking_accepted':
    case 'booking_declined':
    case 'trip_starting_soon':
    case 'trip_completed':
      return `/ride/${rideId}`;
    default:
      return null;
  }
}
