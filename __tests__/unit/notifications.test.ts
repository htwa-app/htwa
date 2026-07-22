/**
 * __tests__/unit/notifications.test.ts
 * Stage 58/59 — unit tests for services/notifications.ts
 */
import * as Notifications from 'expo-notifications';

const mockUpdateEq = jest.fn();
const mockUpdate = jest.fn();
const mockInvoke = jest.fn();
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: () => ({
      update: (arg: unknown) => { mockUpdate(arg); return { eq: (...a: unknown[]) => mockUpdateEq(...a) }; },
    }),
    functions: { invoke: (...a: unknown[]) => mockInvoke(...a) },
  },
}));

import {
  buildNotification,
  registerForPushNotifications,
  sendNotification,
  notifyBookingRequest,
  notifyNewReview,
  savePushToken,
  sendPushToUser,
  sendRawPushToUser,
  type NotificationTrigger,
} from '../../services/notifications';

beforeEach(() => {
  jest.clearAllMocks();
  mockUpdateEq.mockResolvedValue({ error: null });
  mockInvoke.mockResolvedValue({ data: { ok: true }, error: null });
});

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

describe('savePushToken', () => {
  it('writes the token to the profiles row', async () => {
    await savePushToken('u1', 'ExponentPushToken[xxx]');
    expect(mockUpdate).toHaveBeenCalledWith({ expo_push_token: 'ExponentPushToken[xxx]' });
    expect(mockUpdateEq).toHaveBeenCalledWith('user_id', 'u1');
  });

  it('logs, does not throw, on a query error', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockUpdateEq.mockResolvedValue({ error: { message: 'db down' } });
    await expect(savePushToken('u1', 'tok')).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('savePushToken'), 'db down');
    errorSpy.mockRestore();
  });

  it('logs, does not throw, when the write itself rejects', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockUpdateEq.mockRejectedValue(new Error('network error'));
    await expect(savePushToken('u1', 'tok')).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe('sendPushToUser', () => {
  it('invokes send-push with the built notification content', async () => {
    await sendPushToUser('u2', 'booking_accepted', { name: 'Aoife', rideId: 'r1' });
    expect(mockInvoke).toHaveBeenCalledWith('send-push', {
      body: {
        userId: 'u2',
        title: 'Booking confirmed 🎉',
        body: "Aoife accepted your request.",
        data: { trigger: 'booking_accepted', bookingId: undefined, rideId: 'r1' },
      },
    });
  });

  it('logs, does not throw, when the Edge Function errors', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockInvoke.mockResolvedValue({ data: null, error: { message: 'unauthorized' } });
    await expect(sendPushToUser('u2', 'booking_declined')).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('sendRawPushToUser'), 'unauthorized');
    errorSpy.mockRestore();
  });

  it('logs, does not throw, when the invoke call rejects', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockInvoke.mockRejectedValue(new Error('network down'));
    await expect(sendPushToUser('u2', 'booking_request')).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe('sendRawPushToUser', () => {
  it('invokes send-push with the given title/body/data', async () => {
    await sendRawPushToUser('contact-uid', 'SOS — your traveller needs you', 'Body text', { trigger: 'safety_alert', rideId: 'r1' });
    expect(mockInvoke).toHaveBeenCalledWith('send-push', {
      body: { userId: 'contact-uid', title: 'SOS — your traveller needs you', body: 'Body text', data: { trigger: 'safety_alert', rideId: 'r1' } },
    });
  });

  it('defaults data to {} when omitted', async () => {
    await sendRawPushToUser('contact-uid', 'Title', 'Body');
    expect(mockInvoke).toHaveBeenCalledWith('send-push', {
      body: { userId: 'contact-uid', title: 'Title', body: 'Body', data: {} },
    });
  });
});
