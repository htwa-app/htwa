/**
 * __mocks__/expo-location.js
 *
 * Manual mock for expo-location.
 * Used by Jest when expo-location is not yet installed (pre Phase 8).
 * Tests that use this module supply their own jest.mock() overrides on top.
 */
module.exports = {
  Accuracy: { High: 6, Balanced: 3, Low: 1, Lowest: 0, BestForNavigation: 5 },
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestBackgroundPermissionsAsync:  jest.fn().mockResolvedValue({ status: 'granted' }),
  watchPositionAsync:  jest.fn().mockResolvedValue({ remove: jest.fn() }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: { latitude: 53.3498, longitude: -6.2603, accuracy: 5 },
    timestamp: 1000,
  }),
};
