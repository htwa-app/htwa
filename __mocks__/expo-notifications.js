/**
 * __mocks__/expo-notifications.js
 *
 * Manual Jest mock for expo-notifications (auto-applied for the node module).
 * Tests override the jest.fn return values to simulate permission states.
 */
module.exports = {
  getPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: 'ExponentPushToken[xxx]' })),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('notification-id')),
  setNotificationHandler: jest.fn(),
};
