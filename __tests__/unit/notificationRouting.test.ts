/**
 * __tests__/unit/notificationRouting.test.ts
 * Tapped-notification → route mapping (utils/notificationRouting.ts).
 */
import { resolveNotificationRoute } from '../../utils/notificationRouting';

describe('resolveNotificationRoute', () => {
  it('booking_request opens the driver booking-requests screen for that ride', () => {
    expect(resolveNotificationRoute({ trigger: 'booking_request', rideId: 'r1' })).toBe('/booking-requests/r1');
  });

  it.each(['booking_accepted', 'booking_declined', 'trip_starting_soon', 'trip_completed'])(
    '%s opens the ride detail (where a confirmed booking shows Pay)',
    (trigger) => {
      expect(resolveNotificationRoute({ trigger, rideId: 'abc-123' })).toBe('/ride/abc-123');
    },
  );

  it('returns null for triggers with nothing to open (safety_alert, new_review, unknown)', () => {
    expect(resolveNotificationRoute({ trigger: 'safety_alert', rideId: 'r1' })).toBeNull();
    expect(resolveNotificationRoute({ trigger: 'new_review', rideId: 'r1' })).toBeNull();
    expect(resolveNotificationRoute({ trigger: 'nope', rideId: 'r1' })).toBeNull();
  });

  it('returns null without a rideId or with a non-object payload', () => {
    expect(resolveNotificationRoute({ trigger: 'booking_accepted' })).toBeNull();
    expect(resolveNotificationRoute(null)).toBeNull();
    expect(resolveNotificationRoute('x')).toBeNull();
    expect(resolveNotificationRoute(undefined)).toBeNull();
  });

  it('refuses ride ids that could escape the path (payload comes off the network)', () => {
    expect(resolveNotificationRoute({ trigger: 'booking_accepted', rideId: '../settings' })).toBeNull();
    expect(resolveNotificationRoute({ trigger: 'booking_accepted', rideId: 'a/b' })).toBeNull();
    expect(resolveNotificationRoute({ trigger: 'booking_accepted', rideId: 'r1?x=1' })).toBeNull();
    expect(resolveNotificationRoute({ trigger: 'booking_accepted', rideId: 123 })).toBeNull();
  });
});
