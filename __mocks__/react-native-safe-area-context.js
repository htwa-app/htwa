/**
 * __mocks__/react-native-safe-area-context.js
 *
 * Manual mock for react-native-safe-area-context. Node-module mocks placed
 * directly in <rootDir>/__mocks__ are applied automatically by Jest — no
 * jest.mock() call needed in individual test files.
 *
 * SafeAreaProvider renders children directly (no real native measurement in
 * Jest); useSafeAreaInsets returns all-zero insets, matching this package's
 * own official jest mock defaults.
 */
module.exports = {
  SafeAreaProvider: ({ children }) => children,
  useSafeAreaInsets: jest.fn(() => ({ top: 0, right: 0, bottom: 0, left: 0 })),
  useSafeAreaFrame: jest.fn(() => ({ x: 0, y: 0, width: 320, height: 640 })),
};
