/**
 * __tests__/unit/useNotificationNavigation.test.tsx
 * Tapping a notification opens the right screen (cold start + while running).
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

import { useNotificationNavigation } from '../../hooks/useNotificationNavigation';

function Host(): React.ReactElement | null {
  useNotificationNavigation();
  return null;
}

const response = (data: unknown) =>
  ({ notification: { request: { content: { data } } } }) as unknown as Notifications.NotificationResponse;

beforeEach(() => {
  jest.clearAllMocks();
  (Notifications.getLastNotificationResponse as jest.Mock).mockReturnValue(null);
  (Notifications.addNotificationResponseReceivedListener as jest.Mock).mockReturnValue({ remove: jest.fn() });
});

describe('useNotificationNavigation', () => {
  it('opens the ride detail for a cold-start tap on "booking accepted" and clears it', () => {
    (Notifications.getLastNotificationResponse as jest.Mock).mockReturnValue(
      response({ trigger: 'booking_accepted', bookingId: 'b1', rideId: 'r1' }),
    );
    render(<Host />);
    expect(mockPush).toHaveBeenCalledWith('/ride/r1');
    expect(Notifications.clearLastNotificationResponse).toHaveBeenCalled();
  });

  it('does nothing on mount when the app was not launched from a notification', () => {
    render(<Host />);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('routes a tap received while the app is running', () => {
    render(<Host />);
    const listener = (Notifications.addNotificationResponseReceivedListener as jest.Mock).mock.calls[0][0];
    listener(response({ trigger: 'booking_request', rideId: 'r9' }));
    expect(mockPush).toHaveBeenCalledWith('/booking-requests/r9');
  });

  it('ignores a tap whose payload has no usable route', () => {
    render(<Host />);
    const listener = (Notifications.addNotificationResponseReceivedListener as jest.Mock).mock.calls[0][0];
    listener(response({ trigger: 'safety_alert', rideId: 'r1' }));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('a malformed response never throws', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    render(<Host />);
    const listener = (Notifications.addNotificationResponseReceivedListener as jest.Mock).mock.calls[0][0];
    expect(() => listener({} as Notifications.NotificationResponse)).not.toThrow();
    expect(mockPush).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('removes its listener on unmount', () => {
    const remove = jest.fn();
    (Notifications.addNotificationResponseReceivedListener as jest.Mock).mockReturnValue({ remove });
    const { unmount } = render(<Host />);
    unmount();
    expect(remove).toHaveBeenCalled();
  });
});
