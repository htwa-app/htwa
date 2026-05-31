/**
 * __mocks__/@react-native-community/netinfo.js
 * Manual Jest mock (auto-applied for the node module).
 */
module.exports = {
  __esModule: true,
  default: {
    fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
    addEventListener: jest.fn(() => jest.fn()),
  },
};
