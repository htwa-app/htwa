/**
 * __tests__/unit/notifications.test.ts
 * Stage 58/59 — unit tests for services/notifications.ts
 */
import * as Notifications from 'expo-notifications';
import {
  buildNotification,
  registerForPushNotifications,
  sendNotification,
  notifyBookingRequest,
  notifyNewReview,
  type NotificationTrigger,
} from '../../services/notifications';

beforeEach(() => jest.clearAllMocks());

describe('buildNotification', () => {
  const triggers: NotificationTrigger[] = [
    'booking_request', 'booking_accepted', 'booking_declined',
    'trip_starting_soon', 'trip_completed', 'new_review',
  ];

  it('returns a non-empty title and body for every trigger', () => {
    for (const t of triggers) {
      const n = buildNotification(t, { name: 'Aoife', route: 'Galway → Dublin', rating: 5 });
      expect(n.title.length).toBeGreaterThan(0);
      expect(n.body.length).toBeGreaterThan(0);
      expect(n.data.trigger).toBe(t);
    }
  });

  it('includes the passenger name in a booking request', () => {
    const n = buildNotification('booking_request', { name: 'Sean', route: 'Cork → Limerick' });
    expect(n.body).toContain('Sean');
    expect(n.body).toContain('Cork → Limerick');
  });

  it('pluralises stars correctly in a new review', () => {
    expect(buildNotification('new_review', { rating: 1 }).body).toContain('1 star');
    expect(buildNotification('new_review', { rating: 4 }).body).toContain('4 stars');
  });

  it('carries routing ids through data', () => {
    const n = buildNotification('booking_accepted', { bookingId: 'b1', rideId: 'r1' });
    expect(n.data).toMatchObject({ bookingId: 'b1', rideId: 'r1' });
  });
});

describe('registerForPushNotifications', () => {
  it('returns the Expo push token when permission is granted', async () => {
    const token = await registerForPushNotifications();
    expect(token).toBe('ExponentPushToken[xxx]');
  });

  it('requests permission when not already granted, then returns the token', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ granted: false });
    const token = await registerForPushNotifications();
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
    expect(token).toBe('ExponentPushToken[xxx]');
  });

  it('returns null when permission is denied', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ granted: false });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({ granted: false });
    const token = await registerForPushNotifications();
    expect(token).toBeNull();
  });
});

describe('dispatch', () => {
  it('schedules a notification when sending', async () => {
    await sendNotification({ title: 'Hi', body: 'There', data: {} });
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
  });

  it('notifyBookingRequest dispatches the built content', async () => {
    await notifyBookingRequest({ name: 'Aoife', route: 'Galway → Dublin' });
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    const arg = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
    expect(arg.content.title).toBe('New ride request');
  });

  it('notifyNewReview dispatches', async () => {
    await notifyNewReview({ name: 'Sean', rating: 5 });
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
  });
});
